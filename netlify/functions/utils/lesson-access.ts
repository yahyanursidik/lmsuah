import { eq, sql } from 'drizzle-orm';
import { db } from './db.js';
import { lessons, programs } from '../db/schema/index.js';
import { ForbiddenError, type UserSession } from '../middleware/auth.js';
import { canReadDrafts } from './content-policy.js';
import { HttpError } from './http-error.js';
import { getProgramPublication, publishedSnapshotLesson } from './program-snapshots.js';
import { featureRequested } from './advanced-features.js';

export function lessonReadScopeSql(lessonId: string) {
  return sql`exists(select 1 from lessons l inner join programs p on p.id=l.program_id where l.id=${lessonId}::uuid and p.status='published' and ${featureRequested('programRevisions') ? sql`(
    (not exists(select 1 from program_publications pub where pub.program_id=p.id) and l.status='published')
    or exists(select 1 from program_publications pub cross join lateral jsonb_array_elements(pub.snapshot->'lessons') item where pub.program_id=p.id and item->>'id'=l.id::text)
  )` : sql`l.status='published'`})`;
}

export async function assertLessonReadable(lessonId: string, session: UserSession | null, allowEditor = true) {
  if (!allowEditor || !canReadDrafts(session)) {
    const snapshot = await publishedSnapshotLesson(lessonId);
    if (snapshot) return snapshot;
  }
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new HttpError(404, 'Pertemuan tidak ditemukan');
  if (allowEditor && canReadDrafts(session)) return lesson;
  if (lesson.programId && await getProgramPublication(lesson.programId, true)) throw new ForbiddenError('Pertemuan tidak tersedia pada versi publik saat ini.');
  const [program] = lesson.programId ? await db.select().from(programs).where(eq(programs.id, lesson.programId)).limit(1) : [];
  if (lesson.status !== 'published' || program?.status !== 'published') throw new ForbiddenError('Program atau pertemuan belum dipublikasikan.');
  return lesson;
}
