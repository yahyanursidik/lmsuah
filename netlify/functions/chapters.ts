import type { Config } from '@netlify/functions';
import { programReadColumns } from "./utils/program-columns.js";
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { chapters, books, programs } from './db/schema/index.js';
import { eq, and, asc, desc, count, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody, ValidationError } from './utils/validation.js';
import { ForbiddenError } from './middleware/auth.js';
import { canReadDrafts } from './utils/content-policy.js';
import { featureRequested } from './utils/advanced-features.js';
import { assertLegacyWorkspaceWritable, legacyWorkspaceGuardWrites } from './utils/program-snapshots.js';
import { readPublishedCollection } from './utils/publication-readers.js';
import { HttpError } from './utils/http-error.js';
import { assertDeletionAllowed, validateDeletionId } from './utils/deletion-policy.js';
import {
  getOptionalAuth,
  parseQueryParams,
  requireContentCreateAccess,
  requireContentUpdateAccess,
  requireContentDeleteAccess,
  logMutationAudit,
  getDatabaseActorId,
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['bookId', 'programId', 'title', 'sequence'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title', 'sequence'];

const chapterSchema = z.object({
  bookId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  title: z.string().min(1),
  sequence: z.number().int().min(1).default(1),
});

const chapterUpdateSchema = chapterSchema.partial();

const chaptersHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    const isGuestUser = !canReadDrafts(session);
    if (isGuestUser && featureRequested('programRevisions')) {
      const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);
      const result = await readPublishedCollection('chapters', query, resourceId || undefined);
      if (resourceId && !result.items[0]) throw new HttpError(404, 'Modul tidak ditemukan pada versi publik.');
      return resourceId ? result.items[0] : result;
    }

    if (resourceId) {
      const items = await db.select().from(chapters).where(eq(chapters.id, resourceId)).limit(1);
      const item = items[0];

      if (!item) {
        throw new Error('Bab tidak ditemukan');
      }

      if (isGuestUser) {
        if (item.bookId) {
          // Cek apakah buku terkait berstatus published
          const parentBook = await db.select().from(books).where(eq(books.id, item.bookId)).limit(1);
          if (!parentBook[0] || parentBook[0].status !== 'published') {
            throw new ForbiddenError('Tamu hanya diizinkan melihat bab dari kitab yang sudah dipublikasikan');
          }
        }
        if (item.programId) {
          const parentProgram = await db.select(programReadColumns()).from(programs).where(eq(programs.id, item.programId)).limit(1);
          if (!parentProgram[0] || parentProgram[0].status !== 'published') {
            throw new ForbiddenError('Tamu hanya diizinkan melihat bab dari kajian yang sudah dipublikasikan');
          }
        }
      }

      return item;
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];

    if (query.filters.bookId) {
      conditions.push(eq(chapters.bookId, query.filters.bookId));
    }
    if (query.filters.programId) {
      conditions.push(eq(chapters.programId, query.filters.programId));
    }
    if (query.filters.sequence) {
      const seqVal = parseInt(query.filters.sequence, 10);
      if (!isNaN(seqVal)) {
        conditions.push(eq(chapters.sequence, seqVal));
      }
    }
    if (query.filters.title) {
      conditions.push(sql`${chapters.title} ILIKE ${'%' + query.filters.title + '%'}`);
    }

    // Tamu hanya boleh membaca modul dari induk yang sudah dipublikasikan.
    if (isGuestUser) {
      conditions.push(sql`(${chapters.programId} is null or exists(select 1 from ${programs} where ${programs.id} = ${chapters.programId} and ${programs.status} = 'published'))`);
      if (query.filters.programId) {
        const parentProgram = await db
          .select({ status: programs.status })
          .from(programs)
          .where(eq(programs.id, query.filters.programId))
          .limit(1);
        if (parentProgram[0]?.status !== 'published') {
          return { items: [], total: 0, page: query.page, limit: query.limit };
        }
      } else {
        const publishedBooks = await db
          .select({ id: books.id })
          .from(books)
          .where(eq(books.status, 'published'));
        const publishedBookIds = publishedBooks.map((book) => book.id);
        if (publishedBookIds.length === 0) {
          return { items: [], total: 0, page: query.page, limit: query.limit };
        }
        conditions.push(inArray(chapters.bookId, publishedBookIds));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause = asc(chapters.sequence);
    if (query.sortField === 'title') {
      orderByClause = query.sortOrder === 'asc' ? asc(chapters.title) : desc(chapters.title);
    } else if (query.sortField === 'sequence') {
      orderByClause = query.sortOrder === 'asc' ? asc(chapters.sequence) : desc(chapters.sequence);
    } else if (query.sortField === 'updatedAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(chapters.updatedAt) : desc(chapters.updatedAt);
    } else if (query.sortField === 'createdAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(chapters.createdAt) : desc(chapters.createdAt);
    }

    const [data, totalCount] = await Promise.all([
      db
        .select()
        .from(chapters)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(query.limit)
        .offset(query.offset),
      db
        .select({ count: count() })
        .from(chapters)
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
    const body = await validateBody(request, chapterSchema);
    if (!body.programId && !body.bookId) throw new ValidationError('Pilih program atau kitab untuk modul.');
    const parent = body.programId ? (await db.select(programReadColumns()).from(programs).where(eq(programs.id, body.programId)).limit(1))[0] : body.bookId ? (await db.select().from(books).where(eq(books.id, body.bookId)).limit(1))[0] : undefined;
    if (!parent) throw new ValidationError('Induk modul tidak ditemukan.');
    await assertLegacyWorkspaceWritable(body.programId);
    const authSession = requireContentCreateAccess(session, parent?.status);
    const databaseActorId = getDatabaseActorId(authSession);

    const insertQuery = db
      .insert(chapters)
      .values({
        bookId: body.bookId,
        programId: body.programId,
        title: body.title,
        sequence: body.sequence,
        createdBy: databaseActorId,
        updatedBy: databaseActorId,
      })
      .returning();
    const inserted = featureRequested('programRevisions') && body.programId
      ? (await db.batch([db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${body.programId}`}, 0))`), ...legacyWorkspaceGuardWrites([body.programId]), insertQuery])).at(-1) as Array<typeof chapters.$inferSelect>
      : await insertQuery;
    const newChapter = inserted[0];

    logMutationAudit('CREATE', 'chapters', newChapter.id, authSession.userId, {
      title: newChapter.title,
      bookId: newChapter.bookId,
      programId: newChapter.programId,
      sequence: newChapter.sequence,
    });

    return newChapter;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) {
      throw new Error('ID bab diperlukan untuk memperbarui');
    }

    const body = await validateBody(request, chapterUpdateSchema);
    const existing = await db.select().from(chapters).where(eq(chapters.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new HttpError(404, 'Bab tidak ditemukan');
    }
    if (featureRequested('programRevisions') && !existing[0].programId) throw new HttpError(409, 'Bab bersama hanya dibaca pada alur revisi terpisah. Gunakan modul milik program agar program lain tidak berubah.');
    if (body.programId && body.programId !== existing[0].programId) throw new ValidationError('Modul tidak dapat dipindahkan antarprogram. Pindahkan pertemuannya, bukan identitas modul.');

    const parent = existing[0].programId ? (await db.select(programReadColumns()).from(programs).where(eq(programs.id, existing[0].programId)).limit(1))[0] : existing[0].bookId ? (await db.select().from(books).where(eq(books.id, existing[0].bookId)).limit(1))[0] : undefined;
    const authSession = requireContentUpdateAccess(session, parent?.status);
    await assertLegacyWorkspaceWritable(existing[0].programId);
    const databaseActorId = getDatabaseActorId(authSession);

    const updateQuery = db
      .update(chapters)
      .set({
        ...(body.bookId && { bookId: body.bookId }),
        ...(body.programId && { programId: body.programId }),
        ...(body.title && { title: body.title }),
        ...(body.sequence !== undefined && { sequence: body.sequence }),
        updatedBy: databaseActorId,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, resourceId))
      .returning();
    const updated = featureRequested('programRevisions') && existing[0].programId
      ? (await db.batch([db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${existing[0].programId}`}, 0))`), ...legacyWorkspaceGuardWrites([existing[0].programId]), updateQuery])).at(-1) as Array<typeof chapters.$inferSelect>
      : await updateQuery;
    const updatedChapter = updated[0];

    logMutationAudit('UPDATE', 'chapters', resourceId, authSession.userId, {
      changes: body,
    });

    return updatedChapter;
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new HttpError(400, 'ID bab diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    validateDeletionId(resourceId);
    const existing = await db.select().from(chapters).where(eq(chapters.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new HttpError(404, 'Bab tidak ditemukan');
    }

    await assertLegacyWorkspaceWritable(existing[0].programId);
    if (featureRequested('programRevisions') && !existing[0].programId) throw new HttpError(409, 'Bab bersama tidak dihapus melalui alur revisi program.');
    await assertDeletionAllowed('chapters', resourceId);
    const deleteQuery = db.delete(chapters).where(eq(chapters.id, resourceId));
    if (featureRequested('programRevisions') && existing[0].programId) await db.batch([db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${existing[0].programId}`}, 0))`), ...legacyWorkspaceGuardWrites([existing[0].programId]), deleteQuery]);
    else await deleteQuery;

    logMutationAudit('DELETE', 'chapters', resourceId, authSession.userId, {
      deletedTitle: existing[0].title,
    });

    return { message: 'Bab berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(chaptersHandler);

export const config: Config = {
  path: ['/api/chapters', '/api/chapters/*'],
};
