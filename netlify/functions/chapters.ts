import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { chapters, books } from './db/schema/index.js';
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

const ALLOWED_FILTERS = ['bookId', 'title', 'sequence'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title', 'sequence'];

const chapterSchema = z.object({
  bookId: z.string().uuid(),
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
    const isGuestUser = isGuest(session);

    if (resourceId) {
      const items = await db.select().from(chapters).where(eq(chapters.id, resourceId)).limit(1);
      const item = items[0];

      if (!item) {
        throw new Error('Bab tidak ditemukan');
      }

      if (isGuestUser) {
        // Cek apakah buku terkait berstatus published
        const parentBook = await db.select().from(books).where(eq(books.id, item.bookId)).limit(1);
        if (!parentBook[0] || parentBook[0].status !== 'published') {
          throw new ForbiddenError('Tamu hanya diizinkan melihat bab dari kitab yang sudah dipublikasikan');
        }
      }

      return item;
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];

    if (query.filters.bookId) {
      conditions.push(eq(chapters.bookId, query.filters.bookId));
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

    // Jika tamu, hanya sertakan bab dari buku yang sudah published
    if (isGuestUser) {
      const publishedBooks = await db
        .select({ id: books.id })
        .from(books)
        .where(eq(books.status, 'published'));
      
      const publishedBookIds = publishedBooks.map((b) => b.id);
      if (publishedBookIds.length === 0) {
        return { items: [], total: 0, page: query.page, limit: query.limit };
      }

      conditions.push(sql`${chapters.bookId} IN ${publishedBookIds}`);
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
    const authSession = requireContentCreateAccess(session);

    const [newChapter] = await db
      .insert(chapters)
      .values({
        bookId: body.bookId,
        title: body.title,
        sequence: body.sequence,
        createdBy: authSession.userId,
        updatedBy: authSession.userId,
      })
      .returning();

    logMutationAudit('CREATE', 'chapters', newChapter.id, authSession.userId, {
      title: newChapter.title,
      bookId: newChapter.bookId,
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
      throw new Error('Bab tidak ditemukan');
    }

    const authSession = requireContentUpdateAccess(session);

    const [updatedChapter] = await db
      .update(chapters)
      .set({
        ...(body.bookId && { bookId: body.bookId }),
        ...(body.title && { title: body.title }),
        ...(body.sequence !== undefined && { sequence: body.sequence }),
        updatedBy: authSession.userId,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, resourceId))
      .returning();

    logMutationAudit('UPDATE', 'chapters', resourceId, authSession.userId, {
      changes: body,
    });

    return updatedChapter;
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new Error('ID bab diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    const existing = await db.select().from(chapters).where(eq(chapters.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Bab tidak ditemukan');
    }

    await db.delete(chapters).where(eq(chapters.id, resourceId));

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
