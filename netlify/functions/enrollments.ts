import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { enrollments, user } from './db/schema/index.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { getOptionalAuth, isGuest, parseQueryParams } from './utils/contentHelper.js';
import { ForbiddenError } from './middleware/auth.js';

const ALLOWED_FILTERS = ['programId', 'userId', 'status'];
const ALLOWED_SORTS = ['enrolledAt'];

const enrollmentsHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  if (method === 'GET') {
    if (isGuest(session)) {
      throw new ForbiddenError('Tamu tidak diizinkan mengakses data pendaftaran');
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);
    const conditions = [];

    if (query.filters.programId) {
      conditions.push(eq(enrollments.programId, query.filters.programId));
    }
    
    // If user is participant, they can only see their own enrollments
    if (!session?.roles?.includes('administrator') && !session?.roles?.includes('super_administrator')) {
      conditions.push(eq(enrollments.userId, session!.userId));
    } else if (query.filters.userId) {
      conditions.push(eq(enrollments.userId, query.filters.userId));
    }

    if (query.filters.status) {
      conditions.push(eq(enrollments.status, query.filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Join with user to get name and email
    const data = await db
      .select({
        id: enrollments.id,
        userId: enrollments.userId,
        programId: enrollments.programId,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(enrollments)
      .innerJoin(user, eq(enrollments.userId, user.id))
      .where(whereClause)
      .orderBy(desc(enrollments.enrolledAt))
      .limit(query.limit)
      .offset(query.offset);

    const totalCount = await db
      .select({ count: count() })
      .from(enrollments)
      .where(whereClause);

    return {
      items: data,
      total: totalCount[0]?.count || 0,
      page: query.page,
      limit: query.limit,
    };
  }

  return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), { status: 405 });
};

export const handler = createHandler(enrollmentsHandler);

export const config: Config = {
  path: ['/api/enrollments', '/api/enrollments/*'],
};
