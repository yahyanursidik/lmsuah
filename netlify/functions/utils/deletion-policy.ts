import { sql, type SQL } from 'drizzle-orm';
import { db } from './db.js';
import { HttpError } from './http-error.js';
import { z } from 'zod';

export function validateDeletionId(id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(400, 'ID data yang akan dihapus harus berupa UUID yang valid.');
}

export async function lessonDeletionCleanup(id: string) {
  const tables = await db.execute(sql`select to_regclass('public.lesson_quiz_drafts') is not null as pointers`);
  return tables.rows[0]?.pointers ? [db.execute(sql`delete from lesson_quiz_drafts where lesson_id = ${id}::uuid`)] : [];
}

type Resource = 'programs' | 'lessons' | 'chapters' | 'books' | 'venues';
interface Dependency { label: string; query: SQL }

/** Preflight is explanatory, not a replacement for FK enforcement: a concurrent
 * insert is still rejected by Postgres and the entire delete batch rolls back. */
export async function assertDeletionAllowed(resource: Resource, id: string) {
  const dependencies: Dependency[] = [];
  const add = (label: string, query: SQL) => dependencies.push({ label, query });
  if (resource === 'programs') {
    add('pertemuan', sql`select count(*) from lessons where program_id = ${id}::uuid`);
    add('modul', sql`select count(*) from chapters where program_id = ${id}::uuid`);
    add('seri', sql`select count(*) from series where program_id = ${id}::uuid`);
    add('jadwal', sql`select count(*) from schedules where program_id = ${id}::uuid`);
    add('pendaftaran peserta', sql`select count(*) from enrollments where program_id = ${id}::uuid`);
  } else if (resource === 'lessons') {
    add('progres peserta', sql`select count(*) from lesson_progress where lesson_id = ${id}::uuid`);
    add('catatan peserta', sql`select count(*) from user_notes where lesson_id = ${id}::uuid`);
    add('percobaan kuis', sql`select count(*) from quiz_attempts a inner join quizzes q on q.id = a.quiz_id where q.lesson_id = ${id}::uuid`);
  } else if (resource === 'chapters') {
    add('pertemuan', sql`select count(*) from lessons where chapter_id = ${id}::uuid`);
  } else if (resource === 'books') {
    add('rujukan seri', sql`select count(*) from series_books where book_id = ${id}::uuid`);
    add('modul', sql`select count(*) from chapters where book_id = ${id}::uuid`);
  } else {
    add('jadwal', sql`select count(*) from schedules where venue_id = ${id}::uuid`);
  }

  // Detect installed retention tables independently of feature flags. Flags may
  // be disabled after use; conversely an older DB must not query absent tables.
  if (resource === 'programs' || resource === 'lessons') {
    const tables = await db.execute(sql`select to_regclass('public.program_revisions') is not null as revisions,
      to_regclass('public.transcript_documents') is not null as transcripts`);
    if (resource === 'programs' && tables.rows[0]?.revisions) add('versi revisi (termasuk yang dibatalkan)', sql`select count(*) from program_revisions where program_id = ${id}::uuid`);
    if (resource === 'lessons' && tables.rows[0]?.transcripts) add('dokumen PDF privat', sql`select count(*) from transcript_documents where lesson_id = ${id}::uuid`);
    if (resource === 'lessons' && tables.rows[0]?.revisions) add('snapshot revisi', sql`select count(*) from program_revisions r where exists (select 1 from jsonb_array_elements(r.snapshot->'lessons') l where l->>'id' = ${id})`);
  }
  const result = await db.execute(sql.join(dependencies.map(({ label, query }) => sql`select ${label}::text as label, (${query})::integer as count`), sql` union all `));
  const blockers = result.rows.filter(row => Number(row.count) > 0);
  if (!blockers.length) return;
  const names: Record<Resource, string> = { programs: 'Program', lessons: 'Pertemuan', chapters: 'Modul', books: 'Kitab', venues: 'Lokasi' };
  const advice = resource === 'programs' || resource === 'books'
    ? 'Arsipkan agar tidak tampil di publik tanpa menghapus riwayat, atau lepaskan dependensi yang tidak memiliki riwayat terlebih dahulu.'
    : resource === 'venues' ? 'Pindahkan jadwal ke lokasi lain terlebih dahulu, atau nonaktifkan lokasi.'
      : resource === 'chapters' ? 'Pindahkan pertemuan ke modul lain atau Pertemuan langsung terlebih dahulu.'
        : 'Riwayat peserta dan PDF privat tidak dihapus otomatis. Tarik dari publik atau gunakan revisi program.';
  throw new HttpError(409, `${names[resource]} tidak dapat dihapus karena masih memiliki ${blockers.map(row => `${row.count} ${row.label}`).join(', ')}. ${advice}`, 'DEPENDENCY_CONFLICT');
}
