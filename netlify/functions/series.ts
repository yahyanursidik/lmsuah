import type { Config } from '@netlify/functions';
import { programReadColumns } from "./utils/program-columns.js";
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { series, seriesBooks, books, programs } from './db/schema/index.js';
import { eq, and, asc, desc, count, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody, ValidationError } from './utils/validation.js';
import { ForbiddenError } from './middleware/auth.js';
import { canReadDrafts } from './utils/content-policy.js';
import { HttpError } from './utils/http-error.js';
import { validateDeletionId } from './utils/deletion-policy.js';
import { featureRequested } from './utils/advanced-features.js';
import { assertLegacyWorkspaceWritable, legacyWorkspaceGuardWrites } from './utils/program-snapshots.js';
import { readPublishedCollection } from './utils/publication-readers.js';
import {
  getOptionalAuth,
  parseQueryParams,
  requireContentCreateAccess,
  requireContentUpdateAccess,
  requireContentDeleteAccess,
  logMutationAudit,
  getDatabaseActorId,
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['status', 'programId', 'title', 'slug'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title', 'sequence'];

const seriesSchema = z.object({
  programId: z.string().uuid(),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug seri tidak valid'),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional(),
  sequence: z.number().int().min(1).default(1),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  bookIds: z.array(z.string().uuid()).max(100).refine(ids => new Set(ids).size === ids.length, 'Kitab tidak boleh dipilih dua kali').optional(),
});

const seriesUpdateSchema = seriesSchema.partial().extend({ expectedUpdatedAt: z.string().datetime().optional() });

async function withBooks(items: Array<typeof series.$inferSelect>, editor: boolean) {
  if (!items.length) return [];
  const references = await db.select({ seriesId: seriesBooks.seriesId, id: books.id, title: books.title, slug: books.slug, author: books.author, description: books.description, updatedAt: books.updatedAt, status: books.status, sequence: seriesBooks.sequence })
    .from(seriesBooks).innerJoin(books, eq(books.id, seriesBooks.bookId))
    .where(and(inArray(seriesBooks.seriesId, items.map(item => item.id)), editor ? undefined : eq(books.status, 'published')))
    .orderBy(asc(seriesBooks.sequence), asc(books.id));
  return items.map(item => ({ ...item, books: references.filter(reference => reference.seriesId === item.id) }));
}

async function validateBooks(ids?: string[]) {
  if (!ids?.length) return;
  const found = await db.select({ id: books.id }).from(books).where(inArray(books.id, ids));
  if (found.length !== ids.length) throw new ValidationError('Satu atau beberapa kitab tidak ditemukan. Muat ulang pilihan kitab.');
}

const seriesHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    const isGuestUser = !canReadDrafts(session);
    if (isGuestUser && featureRequested('programRevisions')) {
      const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);
      const result = await readPublishedCollection('series', query, resourceId || undefined);
      if (resourceId && !result.items[0]) throw new HttpError(404, 'Seri tidak ditemukan pada versi publik.');
      return resourceId ? result.items[0] : result;
    }

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
      if (isGuestUser) {
        const [parent] = await db.select(programReadColumns()).from(programs).where(eq(programs.id, item.programId)).limit(1);
        if (parent?.status !== 'published') throw new ForbiddenError('Program seri belum diterbitkan.');
      }
      return (await withBooks([item], !isGuestUser))[0];
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];
    if (isGuestUser) {
      conditions.push(eq(series.status, 'published'));
      conditions.push(sql`exists (select 1 from ${programs} where ${programs.id} = ${series.programId} and ${programs.status} = 'published')`);
    } else if (query.filters.status) {
      conditions.push(eq(series.status, query.filters.status));
    }

    if (query.filters.programId) {
      if (!z.string().uuid().safeParse(query.filters.programId).success) throw new ValidationError('programId harus berupa UUID');
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
        .orderBy(orderByClause, asc(series.id))
        .limit(query.limit)
        .offset(query.offset),
      db
        .select({ count: count() })
        .from(series)
        .where(whereClause),
    ]);

    const total = totalCount[0]?.count || 0;

    return {
      items: await withBooks(data, !isGuestUser),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  if (method === 'POST') {
    const body = await validateBody(request, seriesSchema);
    const authSession = requireContentCreateAccess(session, body.status);
    const [parent] = await db.select(programReadColumns()).from(programs).where(eq(programs.id, body.programId)).limit(1);
    if (!parent) throw new ValidationError('Program seri tidak ditemukan.');
    requireContentUpdateAccess(session, parent.status);
    await assertLegacyWorkspaceWritable(body.programId);
    await validateBooks(body.bookIds);
    const [duplicate] = await db.select({ id: series.id }).from(series).where(eq(series.slug, body.slug)).limit(1);
    if (duplicate) throw new HttpError(409, 'Slug seri sudah digunakan.');
    const id = crypto.randomUUID();
    const values = {
        id,
        programId: body.programId,
        slug: body.slug,
        title: body.title,
        description: body.description,
        sequence: body.sequence,
        status: body.status,
        createdBy: getDatabaseActorId(authSession),
        updatedBy: getDatabaseActorId(authSession),
    };
    await db.batch([
      db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${body.programId}`}, 0))`),
      ...legacyWorkspaceGuardWrites([body.programId]),
      db.insert(series).values(values),
      ...(body.bookIds?.length ? [db.insert(seriesBooks).values(body.bookIds.map((bookId, index) => ({ seriesId: id, bookId, sequence: index + 1 })))] : []),
    ]);

    logMutationAudit('CREATE', 'series', id, authSession.userId, {
      title: body.title,
      programId: body.programId,
      status: body.status,
    });

    return values;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) {
      throw new Error('ID seri diperlukan untuk memperbarui');
    }

    const body = await validateBody(request, seriesUpdateSchema);
    const existing = await db.select().from(series).where(eq(series.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new HttpError(404, 'Seri tidak ditemukan');
    }

    const authSession = requireContentUpdateAccess(session, existing[0].status, body.status);
    await assertLegacyWorkspaceWritable(existing[0].programId);
    if (body.programId && body.programId !== existing[0].programId) throw new ValidationError('Seri tidak dapat dipindahkan antarprogram melalui editor ini.');
    const [parent] = await db.select(programReadColumns()).from(programs).where(eq(programs.id, existing[0].programId)).limit(1);
    requireContentUpdateAccess(session, parent?.status);
    await validateBooks(body.bookIds);
    if (body.slug && body.slug !== existing[0].slug) {
      const [duplicate] = await db.select({ id: series.id }).from(series).where(eq(series.slug, body.slug)).limit(1);
      if (duplicate) throw new HttpError(409, 'Slug seri sudah digunakan.');
    }
    const values = {
        ...(body.programId && { programId: body.programId }),
        ...(body.slug && { slug: body.slug }),
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.sequence !== undefined && { sequence: body.sequence }),
        ...(body.status && { status: body.status }),
        updatedBy: getDatabaseActorId(authSession),
        updatedAt: new Date(),
    };
    await db.batch([
      db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${existing[0].programId}`}, 0))`),
      ...legacyWorkspaceGuardWrites([existing[0].programId]),
      ...(body.expectedUpdatedAt ? [db.execute(sql`select 1 / case when exists (select 1 from ${series} where ${series.id} = ${resourceId}::uuid and floor(extract(epoch from ${series.updatedAt}) * 1000) = ${Date.parse(body.expectedUpdatedAt)}) then 1 else 0 end as revision_guard`)] : []),
      db.update(series).set(values).where(eq(series.id, resourceId)),
      ...(body.bookIds !== undefined ? [db.delete(seriesBooks).where(eq(seriesBooks.seriesId, resourceId))] : []),
      ...(body.bookIds?.length ? [db.insert(seriesBooks).values(body.bookIds.map((bookId, index) => ({ seriesId: resourceId, bookId, sequence: index + 1 })))] : []),
    ]);

    logMutationAudit('UPDATE', 'series', resourceId, authSession.userId, {
      previousStatus: existing[0].status,
      newStatus: body.status ?? existing[0].status,
      changes: body,
    });

    return { ...existing[0], ...values };
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new HttpError(400, 'ID seri diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    validateDeletionId(resourceId);
    const existing = await db.select().from(series).where(eq(series.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new HttpError(404, 'Seri tidak ditemukan');
    }

    await assertLegacyWorkspaceWritable(existing[0].programId);
    const deleteQuery = db.delete(series).where(eq(series.id, resourceId));
    await db.batch([db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${existing[0].programId}`}, 0))`), ...legacyWorkspaceGuardWrites([existing[0].programId]), db.delete(seriesBooks).where(eq(seriesBooks.seriesId, resourceId)), deleteQuery]);

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
