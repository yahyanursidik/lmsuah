import { and, eq, sql } from 'drizzle-orm';
import { lessons, programs, quizAttempts, quizzes } from '../db/schema/index.js';
import { db } from './db.js';
import { ForbiddenError, type UserSession } from '../middleware/auth.js';
import { canReadDrafts } from './content-policy.js';
import { assertLessonReadable } from './lesson-access.js';
import { getProgramPublication, publishedSnapshotQuiz } from './program-snapshots.js';
import { featureRequested } from './advanced-features.js';

// Same lock order as the content writers: program, then lesson. The following
// batch statement rechecks scope after any publisher/withdrawal has committed.
export const quizMutationLockSql = (lessonId: string) => sql`with parent_lock as materialized (
  select pg_advisory_xact_lock(hashtextextended('program:' || program_id::text, 0)) from lessons where id = ${lessonId}::uuid
) select pg_advisory_xact_lock(hashtextextended(${`lesson:${lessonId}`}, 0)) from parent_lock`;

export function quizMutationScopeSql(quizId: string, userId: string, allowHistorical: boolean) {
  const current = featureRequested('programRevisions') ? sql`(
    (not exists(select 1 from program_publications pub where pub.program_id = p.id) and l.status = 'published')
    or exists(select 1 from program_publications pub cross join lateral jsonb_array_elements(pub.snapshot->'lessons') item
      where pub.program_id = p.id and item->'quiz'->>'id' = q.id::text and item->'quiz'->>'isPublished' = 'true')
    ${allowHistorical ? sql`or exists(select 1 from quiz_attempts a where a.quiz_id=q.id and a.user_id=${userId} and a.status='in_progress')` : sql``}
  )` : sql`l.status = 'published'`;
  return sql`exists(select 1 from quizzes q inner join lessons l on l.id=q.lesson_id inner join programs p on p.id=l.program_id
    where q.id=${quizId}::uuid and q.is_published=true and p.status='published' and ${current})`;
}

export async function assertQuizReadable(quiz: typeof quizzes.$inferSelect, session: UserSession | null, attemptAction = false) {
  if (!attemptAction && canReadDrafts(session)) return { snapshot: await publishedSnapshotQuiz(quiz.id), allowNewAttempt: false };
  if (!quiz.isPublished) throw new ForbiddenError('Kuis belum diterbitkan atau sudah dinonaktifkan.');
  const snapshot = await publishedSnapshotQuiz(quiz.id);
  if (snapshot) return { snapshot, allowNewAttempt: true };
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, quiz.lessonId)).limit(1);
  const publication = lesson?.programId ? await getProgramPublication(lesson.programId, true) : null;
  if (!publication) {
    await assertLessonReadable(quiz.lessonId, session, false);
    return { snapshot: null, allowNewAttempt: true };
  }
  const [program] = lesson?.programId ? await db.select().from(programs).where(eq(programs.id, lesson.programId)).limit(1) : [];
  const [active] = session ? await db.select({ id: quizAttempts.id }).from(quizAttempts).where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, session.userId), eq(quizAttempts.status, 'in_progress'))).limit(1) : [];
  if (program?.status === 'published' && active) return { snapshot: null, allowNewAttempt: false };
  throw new ForbiddenError('Kuis tidak termasuk versi publik saat ini. Percobaan lama hanya dapat dilanjutkan oleh pemiliknya.');
}

/** Explicit historical view: only a participant's own previous assessment may
 * be read after replacement/withdrawal. This NEVER authorizes a new attempt. */
export async function assertQuizHistoryReadable(quiz: typeof quizzes.$inferSelect, session: UserSession | null) {
  try { return await assertQuizReadable(quiz, session); }
  catch (error) {
    if (!(error instanceof ForbiddenError) || !session) throw error;
    const [owned] = await db.select({ id: quizAttempts.id }).from(quizAttempts).where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, session.userId))).limit(1);
    if (!owned) throw error;
    return { snapshot: null, allowNewAttempt: false };
  }
}
