import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { series } from './db/schema/index.js';
import { eq, and, asc, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import { ForbiddenError } from './middleware/auth.js';
import {
  getOptionalAuth,
  parseQueryParams,
  requireContentCreateAccess,
  requireContentUpdateAccess,
  requireContentDeleteAccess,
  logMutationAudit,
  isGuest,
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['status', 'programId', 'title', 'slug'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title', 'sequence'];

const seriesSchema = z.object({
  programId: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  sequence: z.number().int().min(1).default(1),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
});

const seriesUpdateSchema = seriesSchema.partial();

const seriesHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    const isGuestUser = isGuest(session);

    if (resourceId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      const condition = isUuid ? eq(series.id, resourceId) : eq(series.slug, resourceId);

      const items = await db.select().from(series).where(condition).limit(1);
      const item = items[0];

      if (!item) {
        throw new Error('Seri tidak ditemukan');
      }

      if (isGuestUser && item.status !== 'published') {
        throw new ForbiddenError('Tamu hanya diizinkan melihat seri yang sudah dipublikasikan');
      }

      return item;
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];
    if (isGuestUser) {
      conditions.push(eq(series.status, 'published'));
    } else if (query.filters.status) {
      conditions.push(eq(series.status, query.filters.status));
    }

    if (query.filters.programId) {
      conditions.push(eq(series.programId, query.filters.programId));
    }
    if (query.filters.slug) {
      conditions.push(eq(series.slug, query.filters.slug));
    }
    if (query.filters.title) {
      conditions.push(sql`${series.title} ILIKE ${'%' + query.filters.title + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause = asc(series.sequence);
    if (query.sortField === 'title') {
      orderByClause = query.sortOrder === 'asc' ? asc(series.title) : desc(series.title);
    } else if (query.sortField === 'sequence') {
      orderByClause = query.sortOrder === 'asc' ? asc(series.sequence) : desc(series.sequence);
    } else if (query.sortField === 'updatedAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(series.updatedAt) : desc(series.updatedAt);
    } else if (query.sortField === 'createdAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(series.createdAt) : desc(series.createdAt);
    }

    const [data, totalCount] = await Promise.all([
      db
        .select()
        .from(series)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(query.limit)
        .offset(query.offset),
      db
        .select({ count: count() })
        .from(series)
        .where(whereClause),
    ]);

    const total = totalCount[0]?.count || 0;

    return {
      items: data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  if (method === 'POST') {
    const body = await validateBody(request, seriesSchema);
    const authSession = requireContentCreateAccess(session, body.status);

    const [newSeries] = await db
      .insert(series)
      .values({
        programId: body.programId,
        slug: body.slug,
        title: body.title,
        description: body.description,
        sequence: body.sequence,
        status: body.status,
        createdBy: authSession.userId,
        updatedBy: authSession.userId,
      })
      .returning();

    logMutationAudit('CREATE', 'series', newSeries.id, authSession.userId, {
      title: newSeries.title,
      programId: newSeries.programId,
      status: newSeries.status,
    });

    return newSeries;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) {
      throw new Error('ID seri diperlukan untuk memperbarui');
    }

    const body = await validateBody(request, seriesUpdateSchema);
    const existing = await db.select().from(series).where(eq(series.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Seri tidak ditemukan');
    }

    const authSession = requireContentUpdateAccess(session, existing[0].status, body.status);

    const [updatedSeries] = await db
      .update(series)
      .set({
        ...(body.programId && { programId: body.programId }),
        ...(body.slug && { slug: body.slug }),
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.sequence !== undefined && { sequence: body.sequence }),
        ...(body.status && { status: body.status }),
        updatedBy: authSession.userId,
        updatedAt: new Date(),
      })
      .where(eq(series.id, resourceId))
      .returning();

    logMutationAudit('UPDATE', 'series', resourceId, authSession.userId, {
      previousStatus: existing[0].status,
      newStatus: updatedSeries.status,
      changes: body,
    });

    return updatedSeries;
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new Error('ID seri diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    const existing = await db.select().from(series).where(eq(series.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Seri tidak ditemukan');
    }

    await db.delete(series).where(eq(series.id, resourceId));

    logMutationAudit('DELETE', 'series', resourceId, authSession.userId, {
      deletedTitle: existing[0].title,
    });

    return { message: 'Seri berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(seriesHandler);

export const config: Config = {
  path: ['/api/series', '/api/series/*'],
};
