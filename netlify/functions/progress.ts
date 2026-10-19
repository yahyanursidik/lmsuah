import type { Config } from '@netlify/functions';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createHandler } from './middleware/handler.js';
import { ForbiddenError } from './middleware/auth.js';
import { lessonProgress } from './db/schema/index.js';
import { db } from './utils/db.js';
import { getOptionalAuth, isGuest, parseQueryParams } from './utils/contentHelper.js';
import { validateBody } from './utils/validation.js';
import { HttpError } from './utils/http-error.js';
import { assertLessonReadable, lessonReadScopeSql } from './utils/lesson-access.js';

export default createHandler(async request => {
  const session = await getOptionalAuth(request);
  if (!session || isGuest(session)) throw new ForbiddenError('Masuk untuk menyimpan progres.');
  if (request.method === 'GET') {
    const query = parseQueryParams(new URL(request.url), [], []);
    const where = and(eq(lessonProgress.userId, session.userId));
    const [items, total] = await Promise.all([
      db.select().from(lessonProgress).where(where).orderBy(desc(lessonProgress.updatedAt), desc(lessonProgress.id)).limit(query.limit).offset(query.offset),
      db.select({ count: count() }).from(lessonProgress).where(where),
    ]);
    return { items, total: total[0]?.count || 0, page: query.page, limit: query.limit };
  }
  if (request.method === 'POST') {
    if (session.isDevelopmentDemo) throw new HttpError(409, 'Gunakan akun nyata untuk menyimpan progres ke server.');
    const body = await validateBody(request, z.object({ lessonId: z.string().uuid(), lastPositionSeconds: z.number().int().min(0).max(604800).optional(), isCompleted: z.boolean().optional() }).refine(value => value.lastPositionSeconds !== undefined || value.isCompleted !== undefined, 'Isi posisi atau status selesai yang akan disimpan.'));
    await assertLessonReadable(body.lessonId, session, false);
    const [, result] = await db.batch([
      db.execute(sql`with parent_lock as materialized (select pg_advisory_xact_lock(hashtextextended('program:' || program_id::text, 0)) from lessons where id=${body.lessonId}::uuid)
        select pg_advisory_xact_lock(hashtextextended(${`progress:${session.userId}:${body.lessonId}`}, 0)) from parent_lock`),
      db.execute(sql`with changed as (
        update lesson_progress set last_position_seconds = coalesce(${body.lastPositionSeconds ?? null}::integer, last_position_seconds),
        is_completed = coalesce(${body.isCompleted ?? null}::boolean, is_completed),
        completed_at = case when ${body.isCompleted ?? null}::boolean = true then coalesce(completed_at, now()) when ${body.isCompleted ?? null}::boolean = false then null else completed_at end,
        updated_at = now() where user_id = ${session.userId} and lesson_id = ${body.lessonId}::uuid and ${lessonReadScopeSql(body.lessonId)} returning *
      ), added as (
        insert into lesson_progress (user_id, lesson_id, last_position_seconds, is_completed, completed_at)
        select ${session.userId}, ${body.lessonId}::uuid, ${body.lastPositionSeconds ?? 0}, ${body.isCompleted ?? false}, case when ${body.isCompleted ?? false} then now() else null end
        where not exists (select 1 from changed) and ${lessonReadScopeSql(body.lessonId)} returning *
      ) select id, user_id as "userId", lesson_id as "lessonId", last_position_seconds as "lastPositionSeconds", is_completed as "isCompleted", completed_at as "completedAt", updated_at as "updatedAt" from changed
      union all select id, user_id, lesson_id, last_position_seconds, is_completed, completed_at, updated_at from added`),
    ]);
    if (!result.rows[0]) throw new HttpError(409, 'Pertemuan tidak lagi tersedia pada versi publik. Muat ulang program sebelum menyimpan progres.');
    return result.rows[0];
  }
  throw new HttpError(405, 'Metode tidak didukung');
});
export const config: Config = { path: ['/api/progress', '/api/progress/*'] };
