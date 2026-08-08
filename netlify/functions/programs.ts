import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { programs } from './db/schema/index.js';
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
  getDatabaseActorId,
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['status', 'title', 'slug'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title'];

const programSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
});

const programUpdateSchema = programSchema.partial();

const programsHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  // Parsing path ID dari URL jika ada (e.g. /api/programs/123 atau /api/programs/slug-program)
  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    const isGuestUser = isGuest(session);

    if (resourceId) {
      // Single Item Fetch
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      const condition = isUuid ? eq(programs.id, resourceId) : eq(programs.slug, resourceId);

      const items = await db.select().from(programs).where(condition).limit(1);
      const item = items[0];

      if (!item) {
        throw new Error('Program tidak ditemukan');
      }

      if (isGuestUser && item.status !== 'published') {
        throw new ForbiddenError('Tamu hanya diizinkan melihat program yang sudah dipublikasikan');
      }

      return item;
    }

    // List Fetch dengan Allowlist & Pagination
    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];
    if (isGuestUser) {
      conditions.push(eq(programs.status, 'published'));
    } else if (query.filters.status) {
      conditions.push(eq(programs.status, query.filters.status));
    }

    if (query.filters.slug) {
      conditions.push(eq(programs.slug, query.filters.slug));
    }
    if (query.filters.title) {
      conditions.push(sql`${programs.title} ILIKE ${'%' + query.filters.title + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    let orderByClause = desc(programs.createdAt);
    if (query.sortField === 'title') {
      orderByClause = query.sortOrder === 'asc' ? asc(programs.title) : desc(programs.title);
    } else if (query.sortField === 'updatedAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(programs.updatedAt) : desc(programs.updatedAt);
    } else if (query.sortField === 'createdAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(programs.createdAt) : desc(programs.createdAt);
    }

    const [data, totalCount] = await Promise.all([
      db
        .select()
        .from(programs)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(query.limit)
        .offset(query.offset),
      db
        .select({ count: count() })
        .from(programs)
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
    const body = await validateBody(request, programSchema);
    const authSession = requireContentCreateAccess(session, body.status);
    const databaseActorId = getDatabaseActorId(authSession);
    const duplicate = await db.select({ id: programs.id }).from(programs).where(eq(programs.slug, body.slug)).limit(1);
    if (duplicate[0]) throw new Error('PROGRAM_SLUG_EXISTS');

    const [newProgram] = await db
      .insert(programs)
      .values({
        slug: body.slug,
        title: body.title,
        description: body.description,
        status: body.status,
        createdBy: databaseActorId,
        updatedBy: databaseActorId,
      })
      .returning();

    logMutationAudit('CREATE', 'programs', newProgram.id, authSession.userId, {
      title: newProgram.title,
      status: newProgram.status,
    });

    return newProgram;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) {
      throw new Error('ID program diperlukan untuk memperbarui');
    }

    const body = await validateBody(request, programUpdateSchema);
    const existing = await db.select().from(programs).where(eq(programs.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Program tidak ditemukan');
    }

    const authSession = requireContentUpdateAccess(session, existing[0].status, body.status);
    const databaseActorId = getDatabaseActorId(authSession);
    if (body.slug && body.slug !== existing[0].slug) {
      const duplicate = await db.select({ id: programs.id }).from(programs).where(eq(programs.slug, body.slug)).limit(1);
      if (duplicate[0]) throw new Error('PROGRAM_SLUG_EXISTS');
    }

    const [updatedProgram] = await db
      .update(programs)
      .set({
        ...(body.slug && { slug: body.slug }),
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
        updatedBy: databaseActorId,
        updatedAt: new Date(),
      })
      .where(eq(programs.id, resourceId))
      .returning();

    logMutationAudit('UPDATE', 'programs', resourceId, authSession.userId, {
      previousStatus: existing[0].status,
      newStatus: updatedProgram.status,
      changes: body,
    });

    return updatedProgram;
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new Error('ID program diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    const existing = await db.select().from(programs).where(eq(programs.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Program tidak ditemukan');
    }

    await db.delete(programs).where(eq(programs.id, resourceId));

    logMutationAudit('DELETE', 'programs', resourceId, authSession.userId, {
      deletedTitle: existing[0].title,
    });

    return { message: 'Program berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(programsHandler);

export const config: Config = {
  path: ['/api/programs', '/api/programs/*'],
};
