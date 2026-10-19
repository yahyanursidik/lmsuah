import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { enrollments, programs, user } from './db/schema/index.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody, ValidationError } from './utils/validation.js';
import { HttpError } from './utils/http-error.js';
import { getOptionalAuth, isGuest, parseQueryParams } from './utils/contentHelper.js';
import { ForbiddenError } from './middleware/auth.js';

const ALLOWED_FILTERS = ['programId', 'userId', 'status'];
const ALLOWED_SORTS = ['enrolledAt'];

const enrollmentsHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (!['GET', 'POST'].includes(method)) throw new HttpError(405, 'Method not allowed');
  const session = await getOptionalAuth(request);
  if (!session || isGuest(session)) throw new ForbiddenError('Masuk untuk mengelola pendaftaran.');

  if (method === 'POST') {
    const body = await validateBody(request, z.object({ programId: z.string().uuid(), status: z.enum(['active', 'dropped']) }));
    if (session.isDevelopmentDemo) throw new HttpError(409, 'Gunakan akun peserta nyata untuk menyimpan pendaftaran ke server.');
    const [program] = await db.select().from(programs).where(eq(programs.id, body.programId)).limit(1);
    if (!program || body.status === 'active' && program.status !== 'published') throw new HttpError(404, 'Program tidak tersedia untuk pendaftaran.');
    const [, result] = await db.batch([
      db.execute(sql`with parent_lock as materialized (select pg_advisory_xact_lock(hashtextextended(${`program:${body.programId}`}, 0)))
        select pg_advisory_xact_lock(hashtextextended(${`enrollment:${session.userId}:${body.programId}`}, 0)) from parent_lock`),
      db.execute(sql`with changed as (
        update enrollments set status = ${body.status} where user_id = ${session.userId} and program_id = ${body.programId}::uuid
        and (${body.status} = 'dropped' or exists(select 1 from programs where id=${body.programId}::uuid and status='published')) returning *
      ), added as (
        insert into enrollments (user_id, program_id, status)
        select ${session.userId}, ${body.programId}::uuid, ${body.status}
        where not exists (select 1 from changed) and (${body.status} = 'dropped' or exists(select 1 from programs where id=${body.programId}::uuid and status='published')) returning *
      ) select id, user_id as "userId", program_id as "programId", status, enrolled_at as "enrolledAt" from changed
      union all select id, user_id, program_id, status, enrolled_at from added`),
    ]);
    if (!result.rows[0]) throw new HttpError(409, 'Program tidak lagi tersedia untuk pendaftaran. Muat ulang daftar program.');
    return result.rows[0];
  }

  if (method === 'GET') {
    if (isGuest(session)) {
      throw new ForbiddenError('Tamu tidak diizinkan mengakses data pendaftaran');
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);
    if (query.filters.programId && !z.string().uuid().safeParse(query.filters.programId).success) throw new ValidationError('programId harus berupa UUID');
    const conditions = [];

    if (query.filters.programId) {
      conditions.push(eq(enrollments.programId, query.filters.programId));
    }
    
    // If user is participant, they can only see their own enrollments
    if (!session.roles.some(role => ['admin', 'administrator', 'super_administrator'].includes(role))) {
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

  return Response.json({ error: { message: 'Method not allowed' } }, { status: 405 });
};

export default createHandler(enrollmentsHandler);

export const config: Config = {
  path: ['/api/enrollments', '/api/enrollments/*'],
};
