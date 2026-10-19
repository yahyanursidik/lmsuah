// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { ProgramPublicationSnapshot } from '../shared/program-publication';
import { revisionBaseGuardSql, legacyProgramGuardSql } from '../netlify/functions/utils/revision-sql';
import { readPublishedLessonList, readPublishedCollection } from '../netlify/functions/utils/publication-readers';
import { normalizeRevisionSnapshot, revisionSourceWrites } from '../netlify/functions/utils/revision-persistence';
import { assertQuizReadable } from '../netlify/functions/utils/publication-quiz-access';
import { db } from '../netlify/functions/utils/db';
import { quizzes } from '../netlify/functions/db/schema/index';
import { eq } from 'drizzle-orm';

const state = vi.hoisted(() => ({ client: null as PGlite | null }));
vi.mock('../netlify/functions/utils/db.js', async () => {
  const { PgDialect } = await import('drizzle-orm/pg-core');
  const { drizzle } = await import('drizzle-orm/pglite');
  const orm = () => drizzle(state.client!);
  return { db: {
    execute: (statement: SQL) => ({ getSQL: () => statement, then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => { const query = new PgDialect().sqlToQuery(statement); return state.client!.query(query.sql, query.params).then(resolve, reject); } }),
    select: (...args: Parameters<ReturnType<typeof drizzle>['select']>) => orm().select(...args),
    insert: (...args: Parameters<ReturnType<typeof drizzle>['insert']>) => orm().insert(...args),
    update: (...args: Parameters<ReturnType<typeof drizzle>['update']>) => orm().update(...args),
    delete: (...args: Parameters<ReturnType<typeof drizzle>['delete']>) => orm().delete(...args),
  } };
});
vi.mock('../netlify/functions/middleware/auth.js', () => ({ ForbiddenError: class extends Error {} }));
let client: PGlite;
beforeAll(async () => {
  client = new PGlite(); state.client = client;
  const directory = 'netlify/functions/db/migrations';
  for (const file of readdirSync(directory).filter(file => /^\d+_.+\.sql$/.test(file)).sort()) await client.exec(readFileSync(`${directory}/${file}`, 'utf8'));
  for (const id of ['author', 'reviewer', 'publisher']) await client.query('insert into "user" (id, name, email, email_verified, created_at, updated_at) values ($1, $1, $2, true, now(), now())', [id, `${id}@example.test`]);
}, 120000);
afterAll(async () => { await client?.close(); vi.unstubAllEnvs(); });

async function program(status = 'draft') {
  const id = randomUUID();
  await client.query('insert into programs (id, slug, title, description, status) values ($1, $2, $3, $4, $5)', [id, `program-${id}`, 'Program sumber', 'Deskripsi', status]);
  return id;
}
function snapshot(programId: string): ProgramPublicationSnapshot {
  const lessonId = randomUUID(); const quizId = randomUUID(); const questionId = randomUUID();
  return { schemaVersion: 1, program: { id: programId, slug: `program-${programId}`, title: 'Judul disetujui', description: 'Deskripsi versi publik' },
    chapters: [{ id: randomUUID(), programId, bookId: null, title: 'Modul publik', sequence: 1 }],
    series: [{ id: randomUUID(), programId, title: 'Seri publik', slug: `seri-${randomUUID()}`, description: null, sequence: 1, status: 'published', books: [{ id: randomUUID(), title: 'Kitab terbit', slug: 'kitab', author: null, status: 'published' }, { id: randomUUID(), title: 'Kitab draft privat', slug: 'privat', author: null, status: 'draft' }] }],
    lessons: [{ id: lessonId, programId, chapterId: null, slug: `pertemuan-${lessonId}`, title: 'Pertemuan disetujui', sequence: 1, date: null, description: 'Ringkasan publik', status: 'published', materials: [{ id: randomUUID(), type: 'link', url: 'https://example.test/materi' }], markers: [],
      quiz: { id: quizId, lessonId, title: 'Kuis', description: null, passingScore: 70, maxAttempts: 3, isPublished: true, questions: [{ id: questionId, text: 'Soal', type: 'single_choice', points: 1, explanation: 'secret_explanation', options: [{ id: randomUUID(), questionId, text: 'Pilihan A', isCorrect: true }, { id: randomUUID(), questionId, text: 'Pilihan B', isCorrect: false }] }] } }] };
}
async function revision(programId: string, version: number, content = snapshot(programId), base: string | null = null) {
  const id = randomUUID();
  await client.query('insert into program_revisions (id, program_id, base_revision_id, version, snapshot, content_hash, change_note, submitted_by) values ($1,$2,$3,$4,$5,$6,$7,$8)', [id, programId, base, version, JSON.stringify(content), 'a'.repeat(64), 'Perubahan versi', 'author']);
  return { id, content };
}
async function approve(id: string) {
  await client.query("update program_revisions set status = 'submitted' where id = $1", [id]);
  await client.query("update program_revisions set status = 'approved', reviewed_by = 'reviewer', reviewed_at = now() where id = $1", [id]);
}
async function publish(programId: string, record: { id: string; content: ProgramPublicationSnapshot }) {
  await client.query('insert into program_publications (program_id, revision_id, snapshot, published_by) values ($1,$2,$3,$4)', [programId, record.id, JSON.stringify(record.content), 'publisher']);
  await client.query("update program_revisions set status = 'published', published_at = now() where id = $1", [record.id]);
  await client.query("update programs set status = 'published' where id = $1", [programId]);
}
async function run(statement: SQL) { const query = new PgDialect().sqlToQuery(statement); return client.query(query.sql, query.params); }

describe('Real PostgreSQL in-memory migration integration; never uses DATABASE_URL', () => {
  it('applies the complete additive migration chain with triggers and composite foreign keys', async () => {
    const tables = await client.query<{ count: number }>("select count(*)::int as count from information_schema.tables where table_schema = 'public'");
    expect(tables.rows[0]!.count).toBeGreaterThanOrEqual(40);
    const columns = await client.query("select column_name from information_schema.columns where table_name = 'program_revisions' and column_name = 'base_revision_id'");
    expect(columns.rows).toHaveLength(1);
  });
  it('rejects mutable submitted content and self-approval at the database boundary', async () => {
    const id = await program(); const record = await revision(id, 1);
    await client.query("update program_revisions set status = 'submitted' where id = $1", [record.id]);
    await expect(client.query("update program_revisions set snapshot = jsonb_set(snapshot, '{program,title}', '\"changed\"') where id = $1", [record.id])).rejects.toMatchObject({ code: '23514' });
    await expect(client.query("update program_revisions set status = 'approved', reviewed_by = 'author' where id = $1", [record.id])).rejects.toMatchObject({ code: '23514' });
    const row = await client.query<{ status: string }>('select status from program_revisions where id = $1', [record.id]);
    expect(row.rows[0]!.status).toBe('submitted');
  });
  it('requires the exact approved snapshot, not a modified publication payload', async () => {
    const id = await program(); const record = await revision(id, 1); await approve(record.id);
    const altered = structuredClone(record.content); altered.program.title = 'Unreviewed change';
    await expect(client.query('insert into program_publications (program_id, revision_id, snapshot) values ($1,$2,$3)', [id, record.id, JSON.stringify(altered)])).rejects.toMatchObject({ code: '23514' });
    await publish(id, record);
    const row = await client.query<{ snapshot: ProgramPublicationSnapshot }>('select snapshot from program_publications where program_id = $1', [id]);
    expect(row.rows[0]!.snapshot.program.title).toBe('Judul disetujui');
  });
  it('prevents a revision from referencing a base belonging to another program', async () => {
    const a = await program(); const b = await program(); const base = await revision(a, 1);
    await expect(revision(b, 1, snapshot(b), base.id)).rejects.toMatchObject({ code: '23503' });
  });
  it('uses the application SQL guards to freeze source writes and reject stale publication bases', async () => {
    const id = await program(); await expect(run(legacyProgramGuardSql(id))).resolves.toBeDefined();
    const first = await revision(id, 1); await expect(run(legacyProgramGuardSql(id))).rejects.toMatchObject({ code: '22012' });
    await expect(run(revisionBaseGuardSql(id, null))).resolves.toBeDefined();
    await approve(first.id); await publish(id, first);
    await expect(run(revisionBaseGuardSql(id, null))).rejects.toMatchObject({ code: '22012' });
    await expect(run(revisionBaseGuardSql(id, first.id))).resolves.toBeDefined();
  });
  it('serves immutable lesson/series/chapter projections without answer leakage', async () => {
    vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'true'); vi.stubEnv('LMS_PRIVATE_PDF_ENABLED', 'false');
    const id = await program(); const record = await revision(id, 1); await approve(record.id); await publish(id, record);
    await client.query('insert into lessons (id, program_id, title, slug, sequence, status) values ($1,$2,$3,$4,2,$5)', [randomUUID(), id, 'Unpublished working addition', `working-${randomUUID()}`, 'published']);
    const query = { page: 1, limit: 100, offset: 0, sortOrder: 'asc' as const, filters: { programId: id } };
    const lessons = await readPublishedLessonList(query);
    expect(lessons.total).toBe(1); expect(lessons.items[0]!.title).toBe('Pertemuan disetujui');
    expect(JSON.stringify(lessons)).not.toContain('secret_explanation'); expect(JSON.stringify(lessons)).not.toContain('isCorrect');
    const groups = await readPublishedCollection('series', query);
    expect(groups.items[0]!.books).toHaveLength(1); expect(JSON.stringify(groups)).not.toContain('Kitab draft privat');
    const modules = await readPublishedCollection('chapters', query);
    expect(modules.items[0]!.title).toBe('Modul publik');
  });
  it('preserves the old published PDF when a replacement transaction fails', async () => {
    const p = await program(); const lessonId = randomUUID(); const documentId = randomUUID();
    await client.query("insert into lessons (id, program_id, title, slug, sequence, status) values ($1,$2,'Lesson',$3,1,'draft')", [lessonId, p, `lesson-${lessonId}`]);
    await client.query("insert into transcript_documents (id, lesson_id, title) values ($1,$2,'PDF')", [documentId, lessonId]);
    const ids = [randomUUID(), randomUUID()];
    for (const [index, id] of ids.entries()) {
      await client.query("insert into transcript_versions (id, document_id, version, blob_key, filename, size_bytes, sha256, uploaded_by) values ($1,$2,$3,$4,'file.pdf',100,$5,'author')", [id, documentId, index + 1, `unique-${id}`, 'b'.repeat(64)]);
      await client.query("update transcript_versions set status = 'submitted' where id = $1", [id]);
      await client.query("update transcript_versions set status = 'approved', reviewed_by = 'reviewer' where id = $1", [id]);
    }
    await client.query("update transcript_versions set status = 'published' where id = $1", [ids[0]]);
    await expect(client.query("update transcript_versions set blob_key = 'overwrite' where id = $1", [ids[0]])).rejects.toMatchObject({ code: '23514' });
    await expect(client.query("update transcript_versions set status = 'published' where id = $1", [ids[1]])).rejects.toMatchObject({ code: '23505' });
    await expect(client.transaction(async tx => {
      await tx.query("update transcript_versions set status = 'archived' where id = $1", [ids[0]]);
      await tx.query("update transcript_versions set status = 'published' where id = $1", [ids[1]]);
      throw new Error('simulated failure after replacement');
    })).rejects.toThrow('simulated failure');
    const rows = await client.query<{ id: string; status: string }>('select id, status from transcript_versions where document_id = $1 order by version', [documentId]);
    expect(rows.rows.map(row => row.status)).toEqual(['published', 'approved']);
  });
  it('publishes changed assessment versions without deleting old attempts or answers', async () => {
    vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'true'); vi.stubEnv('LMS_PRIVATE_PDF_ENABLED', 'false');
    const id = await program();
    const first = snapshot(id); first.series = []; first.chapters = [];
    const executeWrites = async (content: ProgramPublicationSnapshot) => {
      const writes = await revisionSourceWrites(content, 'publisher');
      await client.transaction(async tx => {
        for (const write of writes) {
          const query = new PgDialect().sqlToQuery(write.getSQL());
          await tx.query(query.sql, query.params);
        }
      });
    };
    await executeWrites(first);
    const originalQuiz = first.lessons[0]!.quiz!;
    const question = originalQuiz.questions[0]!; const answerId = randomUUID();
    await client.query("insert into quiz_attempts (id, quiz_id, user_id, status, score, passed) values ($1,$2,'author','submitted',100,true)", [answerId, originalQuiz.id]);
    await client.query('insert into quiz_answers (attempt_id, question_id, option_id, is_correct_snapshot) values ($1,$2,$3,true)', [answerId, question.id, question.options[0]!.id]);
    const one = await revision(id, 1, first); await approve(one.id); await publish(id, one);
    const changed = structuredClone(first); changed.lessons[0]!.quiz!.questions[0]!.text = 'Soal versi kedua';
    const second = await normalizeRevisionSnapshot(changed, first, id);
    expect(second.lessons[0]!.quiz!.id).not.toBe(originalQuiz.id);
    await executeWrites(second);
    const two = await revision(id, 2, second, one.id); await approve(two.id);
    await client.transaction(async tx => {
      await tx.query("update program_revisions set status = 'superseded' where id = $1", [one.id]);
      await tx.query('update program_publications set revision_id = $1, snapshot = $2 where program_id = $3', [two.id, JSON.stringify(second), id]);
      await tx.query("update program_revisions set status = 'published' where id = $1", [two.id]);
    });
    const oldAnswers = await client.query('select * from quiz_answers where attempt_id = $1', [answerId]);
    expect(oldAnswers.rows).toHaveLength(1);
    const oldQuiz = (await db.select().from(quizzes).where(eq(quizzes.id, originalQuiz.id)))[0]!;
    await expect(assertQuizReadable(oldQuiz, { userId: 'reviewer', roles: ['participant'] }, true)).rejects.toThrow('tidak termasuk versi publik');
    await client.query("insert into quiz_attempts (quiz_id, user_id, status) values ($1,'author','in_progress')", [originalQuiz.id]);
    const access = await assertQuizReadable(oldQuiz, { userId: 'author', roles: ['participant'] }, true);
    expect(access.allowNewAttempt).toBe(false);
    expect(access.snapshot).toBeNull();
    const current = await readPublishedLessonList({ page: 1, limit: 100, offset: 0, sortOrder: 'asc', filters: { programId: id } });
    expect(current.items[0]!.quiz?.id).toBe(second.lessons[0]!.quiz!.id);
    expect(JSON.stringify(current)).not.toContain('isCorrect');
  });
});
