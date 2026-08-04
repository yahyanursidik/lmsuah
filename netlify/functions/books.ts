import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { books } from './db/schema/index.js';
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

const ALLOWED_FILTERS = ['status', 'title', 'slug', 'author'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title'];

const bookSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  author: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
});

const bookUpdateSchema = bookSchema.partial();

const booksHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    const isGuestUser = isGuest(session);

    if (resourceId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      const condition = isUuid ? eq(books.id, resourceId) : eq(books.slug, resourceId);

      const items = await db.select().from(books).where(condition).limit(1);
      const item = items[0];

      if (!item) {
        throw new Error('Buku/Kitab tidak ditemukan');
      }

      if (isGuestUser && item.status !== 'published') {
        throw new ForbiddenError('Tamu hanya diizinkan melihat kitab yang sudah dipublikasikan');
      }

      return item;
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];
    if (isGuestUser) {
      conditions.push(eq(books.status, 'published'));
    } else if (query.filters.status) {
      conditions.push(eq(books.status, query.filters.status));
    }

    if (query.filters.slug) {
      conditions.push(eq(books.slug, query.filters.slug));
    }
    if (query.filters.author) {
      conditions.push(sql`${books.author} ILIKE ${'%' + query.filters.author + '%'}`);
    }
    if (query.filters.title) {
      conditions.push(sql`${books.title} ILIKE ${'%' + query.filters.title + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause = desc(books.createdAt);
    if (query.sortField === 'title') {
      orderByClause = query.sortOrder === 'asc' ? asc(books.title) : desc(books.title);
    } else if (query.sortField === 'updatedAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(books.updatedAt) : desc(books.updatedAt);
    } else if (query.sortField === 'createdAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(books.createdAt) : desc(books.createdAt);
    }

    const [data, totalCount] = await Promise.all([
      db
        .select()
        .from(books)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(query.limit)
        .offset(query.offset),
      db
        .select({ count: count() })
        .from(books)
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
    const body = await validateBody(request, bookSchema);
    const authSession = requireContentCreateAccess(session, body.status);

    const [newBook] = await db
      .insert(books)
      .values({
        slug: body.slug,
        title: body.title,
        author: body.author,
        description: body.description,
        status: body.status,
        createdBy: authSession.userId,
        updatedBy: authSession.userId,
      })
      .returning();

    logMutationAudit('CREATE', 'books', newBook.id, authSession.userId, {
      title: newBook.title,
      author: newBook.author,
      status: newBook.status,
    });

    return newBook;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) {
      throw new Error('ID buku diperlukan untuk memperbarui');
    }

    const body = await validateBody(request, bookUpdateSchema);
    const existing = await db.select().from(books).where(eq(books.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Buku tidak ditemukan');
    }

    const authSession = requireContentUpdateAccess(session, existing[0].status, body.status);

    const [updatedBook] = await db
      .update(books)
      .set({
        ...(body.slug && { slug: body.slug }),
        ...(body.title && { title: body.title }),
        ...(body.author !== undefined && { author: body.author }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
        updatedBy: authSession.userId,
        updatedAt: new Date(),
      })
      .where(eq(books.id, resourceId))
      .returning();

    logMutationAudit('UPDATE', 'books', resourceId, authSession.userId, {
      previousStatus: existing[0].status,
      newStatus: updatedBook.status,
      changes: body,
    });

    return updatedBook;
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new Error('ID buku diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    const existing = await db.select().from(books).where(eq(books.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Buku tidak ditemukan');
    }

    await db.delete(books).where(eq(books.id, resourceId));

    logMutationAudit('DELETE', 'books', resourceId, authSession.userId, {
      deletedTitle: existing[0].title,
    });

    return { message: 'Buku berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(booksHandler);

export const config: Config = {
  path: ['/api/books', '/api/books/*'],
};
