// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Context } from '@netlify/functions';
import type { ProgramPublicationSnapshot } from '../shared/program-publication';
import { isolatedHttpDatabase } from './helpers/neon-pglite';
import revisions from '../netlify/functions/program-revisions';
import progress from '../netlify/functions/progress';
import enrollments from '../netlify/functions/enrollments';
import quizzes from '../netlify/functions/quizzes';
import lessons from '../netlify/functions/lessons';
import programs from '../netlify/functions/programs';
import transcripts from '../netlify/functions/transcripts';
import transcriptFile from '../netlify/functions/transcript-file';
import { featureAvailable } from '../netlify/functions/utils/advanced-features';

const state = vi.hoisted(() => ({
  database: null as Awaited<ReturnType<typeof isolatedHttpDatabase>> | null,
  blobs: new Map<string, ArrayBuffer>(),
}));
vi.mock('../netlify/functions/utils/db.js', () => ({ db: new Proxy({}, { get: (_, key) => {
  const database = state.database!.db;
  const value = Reflect.get(database, key);
  return typeof value === 'function' ? value.bind(database) : value;
} }) }));
vi.mock('../netlify/functions/middleware/auth.js', async original => {
  const actual = await original<typeof import('../netlify/functions/middleware/auth')>();
  return { ...actual, requireAuth: async (request: Request) => {
    const userId = request.headers.get('x-test-user');
    if (!userId) throw new actual.AuthError('Masuk terlebih dahulu.');
    return { userId, roles: [userId === 'participant' || userId === 'other' ? 'participant' : userId === 'limited' ? 'scientific_reviewer' : 'administrator'] };
  } };
});
vi.mock('@netlify/blobs', () => ({ getStore: () => ({
  set: async (key: string, bytes: ArrayBuffer) => { state.blobs.set(key, bytes.slice(0)); return { modified: true }; },
  get: async (key: string) => state.blobs.get(key) || null,
}) }));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

let database: Awaited<ReturnType<typeof isolatedHttpDatabase>>;
const context = {} as Context;
type Handler = (request: Request, context: Context) => Promise<Response>;
async function call(handler: Handler, path: string, actor: string | null, method = 'GET', body?: unknown) {
  return handler(new Request(`https://example.test/api/${path}`, { method, headers: { ...(actor ? { 'x-test-user': actor } : {}), 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), context);
}
async function data<T>(response: Response): Promise<T> {
  const body = await response.json();
  expect(response.status, JSON.stringify(body)).toBe(200);
  return body.data as T;
}
interface Revision { id: string; version: number; status: string; contentHash: string; snapshot: ProgramPublicationSnapshot }
async function action(revision: Revision, name: string, actor = 'author') {
  return call(revisions, `program-revisions/${revision.id}`, actor, 'PATCH', { action: name, note: 'Catatan pengujian lengkap', expectedHash: revision.contentHash });
}
async function seedProgram(status = 'draft') {
  const id = randomUUID();
  await database.client.query('insert into programs (id,slug,title,description,status) values ($1,$2,$3,$4,$5)', [id, `program-${id}`, 'Program kajian', 'Deskripsi kajian', status]);
  return id;
}
async function createDraft(programId: string) {
  return data<Revision>(await call(revisions, 'program-revisions', 'author', 'POST', { programId, note: 'Snapshot awal program' }));
}
async function populate(draft: Revision) {
  const lessonId = randomUUID(); const questionId = randomUUID();
  draft.snapshot.lessons.push({ id: lessonId, programId: draft.snapshot.program.id, chapterId: null, slug: `lesson-${lessonId}`, title: 'Pertemuan pertama', sequence: 1, date: null, description: 'Ringkasan', status: 'published', materials: [{ id: randomUUID(), type: 'link', url: 'https://example.test/materi' }], markers: [],
    quiz: { id: randomUUID(), lessonId, title: 'Evaluasi', description: null, passingScore: 70, maxAttempts: 2, isPublished: true, questions: [{ id: questionId, text: 'Pertanyaan awal', type: 'single_choice', points: 1, explanation: 'Rahasia pembahasan', options: [{ id: randomUUID(), questionId, text: 'Benar', isCorrect: true }, { id: randomUUID(), questionId, text: 'Salah', isCorrect: false }] }] } });
  return data<Revision>(await call(revisions, `program-revisions/${draft.id}`, 'author', 'PATCH', { action: 'save', note: 'Lengkapi pertemuan dan kuis', expectedHash: draft.contentHash, snapshot: draft.snapshot }));
}
async function publish(draft: Revision) {
  await data(await action(draft, 'submit'));
  await data(await action(draft, 'approve', 'reviewer'));
  await data(await action(draft, 'publish', 'publisher'));
}
beforeAll(async () => {
  database = await isolatedHttpDatabase(); state.database = database;
  vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'true'); vi.stubEnv('LMS_PRIVATE_PDF_ENABLED', 'true');
  for (const id of ['author', 'reviewer', 'publisher', 'participant', 'other', 'limited']) {
    await database.client.query('insert into "user" (id,name,email,email_verified,created_at,updated_at) values ($1,$1,$2,true,now(),now())', [id, `${id}@example.test`]);
  }
  // Exercise the real RBAC lookup for participant PDF reads.
  await database.client.exec("insert into roles(id,name) values ('participant','Participant'); insert into permissions(id,name) values ('transcript.read','Read PDFs'); insert into role_permissions(role_id,permission_id) values ('participant','transcript.read'); insert into user_roles(user_id,role_id) values ('participant','participant'), ('other','participant');");
}, 120000);
afterAll(async () => { await database?.client.close(); vi.unstubAllEnvs(); });

describe('Production HTTP handler workflow on isolated PostgreSQL', () => {
  it('keeps category edits private until approval and publication, and synchronizes the approved category', async () => {
    const programId = await seedProgram();
    await database.client.query("update programs set category='Tauhid' where id=$1", [programId]);
    const first = await populate(await createDraft(programId));
    expect(first.snapshot.program.category).toBe('Tauhid');
    await publish(first);
    const next = await createDraft(programId);
    next.snapshot.program.category = '  Aqidah  ';
    const saved = await data<Revision>(await call(revisions, `program-revisions/${next.id}`, 'author', 'PATCH', { action: 'save', note: 'Perbaiki kategori program', expectedHash: next.contentHash, snapshot: next.snapshot }));
    expect(saved.snapshot.program.category).toBe('Aqidah');
    expect(saved.contentHash).not.toBe(next.contentHash);
    expect((await data<{ category: string }>(await call(programs, `programs/${programId}`, 'participant'))).category).toBe('Tauhid');
    expect((await call(programs, `programs/${programId}`, 'author', 'PATCH', { category: 'Fiqih' })).status).toBe(409);
    await publish(saved);
    expect((await data<{ category: string }>(await call(programs, `programs/${programId}`, 'participant'))).category).toBe('Aqidah');
    const source = await database.client.query<{ category: string }>('select category from programs where id=$1', [programId]);
    expect(source.rows[0]!.category).toBe('Aqidah');
    const old = await data<Revision>(await call(revisions, `program-revisions/${first.id}`, 'author'));
    expect(old.snapshot.program.category).toBe('Tauhid');
    const cleared = await createDraft(programId); cleared.snapshot.program.category = '';
    const empty = await data<Revision>(await call(revisions, `program-revisions/${cleared.id}`, 'author', 'PATCH', { action: 'save', note: 'Kosongkan kategori', expectedHash: cleared.contentHash, snapshot: cleared.snapshot }));
    await publish(empty);
    expect((await data<{ category: string | null }>(await call(programs, `programs/${programId}`, 'participant'))).category).toBeNull();
  });
  it('enables migrated features, but not disabled or incomplete installations', async () => {
    expect(await featureAvailable('privatePdf')).toBe(true);
    expect(await featureAvailable('programRevisions')).toBe(true);
    await database.client.exec('alter table program_revisions disable trigger program_revision_immutable_guard');
    try { expect(await featureAvailable('programRevisions')).toBe(false); }
    finally { await database.client.exec('alter table program_revisions enable trigger program_revision_immutable_guard'); }
    vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'false');
    expect(await featureAvailable('programRevisions')).toBe(false);
    vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'true');
  });
  it('publishes only independently approved content; preserves progress, attempts and old public content through revisions', async () => {
    const programId = await seedProgram();
    const first = await populate(await createDraft(programId));
    expect((await call(revisions, `program-revisions/${first.id}`, 'author')).headers.get('cache-control')).toBe('private, no-store');
    expect((await call(lessons, `lessons/${first.snapshot.lessons[0]!.id}`, 'participant')).status).toBe(403);
    expect((await call(revisions, `program-revisions/${first.id}`, 'participant')).status).toBe(403);
    await data(await action(first, 'submit'));
    expect((await action(first, 'approve', 'author')).status).toBe(409);
    expect((await action(first, 'approve', 'limited')).status).toBe(403);
    await data(await action(first, 'approve', 'reviewer'));
    await data(await action(first, 'publish', 'publisher'));
    const lesson = first.snapshot.lessons[0]!; const quiz = lesson.quiz!;
    const publicLesson = await data<{ title: string }>(await call(lessons, `lessons/${lesson.slug}`, 'participant'));
    expect(publicLesson.title).toBe(lesson.title);
    const publicQuiz = await data(await call(quizzes, `quizzes/${quiz.id}`, 'participant'));
    expect(JSON.stringify(publicQuiz)).not.toContain('isCorrect'); expect(JSON.stringify(publicQuiz)).not.toContain('Rahasia');
    await data(await call(enrollments, 'enrollments', 'participant', 'POST', { programId, status: 'active' }));
    await data(await call(enrollments, 'enrollments', 'participant', 'POST', { programId, status: 'active' }));
    const p1 = await data<{ id: string }>(await call(progress, 'progress', 'participant', 'POST', { lessonId: lesson.id, lastPositionSeconds: 91, isCompleted: true }));
    const p2 = await data<{ id: string; isCompleted: boolean; lastPositionSeconds: number }>(await call(progress, 'progress', 'participant', 'POST', { lessonId: lesson.id, lastPositionSeconds: 105 }));
    expect(p2.id).toBe(p1.id); expect(p2.isCompleted).toBe(true); expect(p2.lastPositionSeconds).toBe(105);
    const privateProgress = await data<{ total: number }>(await call(progress, 'progress?userId=participant', 'other'));
    expect(privateProgress.total).toBe(0);
    const attempt = await data<{ id: string }>(await call(quizzes, `quizzes/${quiz.id}/attempts`, 'participant', 'POST'));
    const resumed = await data<{ id: string }>(await call(quizzes, `quizzes/${quiz.id}/attempts`, 'participant', 'POST'));
    expect(resumed.id).toBe(attempt.id);
    const second = await createDraft(programId);
    const staleBase = await createDraft(programId);
    second.snapshot.lessons[0]!.title = 'Judul revisi belum terbit';
    second.snapshot.lessons[0]!.quiz!.questions[0]!.text = 'Pertanyaan baru';
    const saved = await data<Revision>(await call(revisions, `program-revisions/${second.id}`, 'author', 'PATCH', { action: 'save', note: 'Perbaikan kuis dan pertemuan', expectedHash: second.contentHash, snapshot: second.snapshot }));
    expect(saved.snapshot.lessons[0]!.quiz!.id).not.toBe(quiz.id);
    expect((await data<{ title: string }>(await call(lessons, `lessons/${lesson.id}`, 'participant'))).title).toBe(lesson.title);
    expect((await call(revisions, `program-revisions/${second.id}`, 'author', 'PATCH', { action: 'save', note: 'Permintaan stale', expectedHash: second.contentHash, snapshot: second.snapshot })).status).toBe(409);
    await publish({ ...saved, id: second.id });
    const staleResponse = await action(staleBase, 'submit');
    expect(staleResponse.status).toBe(409);
    expect((await staleResponse.json()).error.code).toBe('BASE_REVISION_CHANGED');
    expect((await data<{ title: string }>(await call(lessons, `lessons/${lesson.id}`, 'participant'))).title).toBe('Judul revisi belum terbit');
    expect((await call(quizzes, `quizzes/${quiz.id}/attempts`, 'other', 'POST')).status).toBe(403);
    const oldResume = await data<{ id: string }>(await call(quizzes, `quizzes/${quiz.id}/attempts`, 'participant', 'POST'));
    expect(oldResume.id).toBe(attempt.id);
    const answer = { answers: [{ questionId: quiz.questions[0]!.id, optionId: quiz.questions[0]!.options[0]!.id }] };
    expect((await call(quizzes, `quizzes/${quiz.id}/attempts/${attempt.id}/submit`, 'other', 'POST', answer)).status).toBe(403);
    const result = await data<{ score: number }>(await call(quizzes, `quizzes/${quiz.id}/attempts/${attempt.id}/submit`, 'participant', 'POST', answer));
    expect(result.score).toBe(100);
    await data(await call(quizzes, `quizzes/${quiz.id}/attempts/${attempt.id}/submit`, 'participant', 'POST', answer));
    const records = await database.client.query<{ count: number }>('select count(*)::int as count from quiz_answers where attempt_id=$1', [attempt.id]);
    expect(records.rows[0]!.count).toBe(1);
    const oldQuizView = await data<{ canStartAttempt: boolean }>(await call(quizzes, `quizzes/${quiz.id}?history=1`, 'participant'));
    expect(oldQuizView.canStartAttempt).toBe(false);
    expect(JSON.stringify(oldQuizView)).not.toContain('isCorrect');
    expect((await call(quizzes, `quizzes/${quiz.id}?history=1`, 'other')).status).toBe(403);
    const ownHistory = await data<{ items: Array<{ id: string }>; total: number }>(await call(quizzes, 'quizzes/history', 'participant'));
    expect(ownHistory.items.some(item => item.id === attempt.id)).toBe(true);
    expect((await data<{ total: number }>(await call(quizzes, 'quizzes/history?userId=participant', 'other'))).total).toBe(0);
    const entries = await database.client.query<{ count: number }>('select count(*)::int as count from enrollments where user_id=$1 and program_id=$2', ['participant', programId]);
    expect(entries.rows[0]!.count).toBe(1);
    await database.client.query("update programs set status='archived' where id=$1", [programId]);
    expect((await call(progress, 'progress', 'participant', 'POST', { lessonId: lesson.id, isCompleted: false })).status).toBe(403);
    expect((await call(quizzes, `quizzes/${saved.snapshot.lessons[0]!.quiz!.id}/attempts`, 'participant', 'POST')).status).toBe(403);
  });
  it('uploads, reviews and embeds a private PDF in the FIRST snapshot without exposing draft bytes', async () => {
    const programId = await seedProgram(); const first = await populate(await createDraft(programId));
    const lessonId = first.snapshot.lessons[0]!.id;
    const bytes = new TextEncoder().encode('%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF');
    const uploaded = await data<{ id: string }>(await transcripts(new Request('https://example.test/api/transcripts', { method: 'POST', headers: { 'x-test-user': 'author', 'content-type': 'application/pdf', 'x-lms-lesson-id': lessonId, 'x-lms-filename': 'modul.pdf', 'x-lms-title': 'Modul privat' }, body: bytes }), context));
    expect((await call(transcriptFile, `transcript-file/${uploaded.id}`, null)).status).toBe(401);
    expect((await call(transcriptFile, `transcript-file/${uploaded.id}`, 'participant')).status).toBe(403);
    await data(await call(transcripts, `transcripts/${uploaded.id}`, 'author', 'PATCH', { action: 'submit', note: 'Mohon review' }));
    expect((await call(transcripts, `transcripts/${uploaded.id}`, 'author', 'PATCH', { action: 'approve', note: 'Review sendiri' })).status).toBe(403);
    await data(await call(transcripts, `transcripts/${uploaded.id}`, 'reviewer', 'PATCH', { action: 'approve', note: 'Isi sudah diperiksa' }));
    // Still approved, not independently exposed before its first publication.
    expect((await call(transcriptFile, `transcript-file/${uploaded.id}`, 'participant')).status).toBe(403);
    first.snapshot.lessons[0]!.materials.push({ id: uploaded.id, type: 'PDF', url: `/api/transcript-file/${uploaded.id}` });
    const saved = await data<Revision>(await call(revisions, `program-revisions/${first.id}`, 'author', 'PATCH', { action: 'save', note: 'Sertakan PDF privat', expectedHash: first.contentHash, snapshot: first.snapshot }));
    await publish({ ...saved, id: first.id });
    const response = await call(transcriptFile, `transcript-file/${uploaded.id}`, 'participant');
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    const ranged = await transcriptFile(new Request(`https://example.test/api/transcript-file/${uploaded.id}`, { headers: { 'x-test-user': 'participant', range: 'bytes=0-7' } }), context);
    expect(ranged.status).toBe(206); expect(await ranged.text()).toBe('%PDF-1.7');
    expect((await call(transcriptFile, `transcript-file/${uploaded.id}?download=1`, 'participant')).status).toBe(403);
  });
  it('keeps rejected snapshots immutable and starts the replacement as a new audited draft', async () => {
    const programId = await seedProgram(); const first = await populate(await createDraft(programId));
    await data(await action(first, 'submit'));
    await data(await action(first, 'request_revision', 'reviewer'));
    expect((await call(revisions, `program-revisions/${first.id}`, 'author', 'PATCH', { action: 'save', note: 'Jangan ubah yang sudah diajukan', expectedHash: first.contentHash, snapshot: first.snapshot })).status).toBe(409);
    const replacement = await data<Revision>(await call(revisions, 'program-revisions', 'author', 'POST', { programId, fromRevisionId: first.id, note: 'Tindak lanjut catatan reviewer' }));
    expect(replacement.id).not.toBe(first.id); expect(replacement.status).toBe('draft');
    expect(replacement.snapshot.lessons[0]!.quiz!.id).toBe(first.snapshot.lessons[0]!.quiz!.id);
  });
  it('carries legacy draft meetings into an explicit initial snapshot without publishing incomplete content', async () => {
    const programId = await seedProgram(); const lessonId = randomUUID();
    await database.client.query("insert into lessons(id,program_id,slug,title,sequence,status) values ($1,$2,$3,'Draft lama',1,'draft')", [lessonId, programId, `legacy-${lessonId}`]);
    const draft = await data<Revision>(await call(revisions, 'program-revisions', 'author', 'POST', { programId, note: 'Sertakan pekerjaan lama', includeDrafts: true }));
    expect(draft.snapshot.lessons.map(lesson => lesson.id)).toEqual([lessonId]);
    expect((await action(draft, 'submit')).status).toBe(409);
    expect((await call(lessons, `lessons/${lessonId}`, 'participant')).status).toBe(403);
  });
  it('rolls back source synchronization and audit updates if publication fails late in the transaction', async () => {
    const programId = await seedProgram(); const first = await populate(await createDraft(programId)); await publish(first);
    const next = await createDraft(programId); next.snapshot.program.title = 'Judul yang tidak boleh bocor';
    const saved = await data<Revision>(await call(revisions, `program-revisions/${next.id}`, 'author', 'PATCH', { action: 'save', note: 'Ubah judul', expectedHash: next.contentHash, snapshot: next.snapshot }));
    await data(await action(saved, 'submit')); await data(await action(saved, 'approve', 'reviewer'));
    database.intercept.failStatement = text => text.startsWith('insert into "program_publications"');
    expect((await action(saved, 'publish', 'publisher')).status).toBe(500);
    const publication = await database.client.query<{ revision_id: string }>('select revision_id from program_publications where program_id=$1', [programId]);
    expect(publication.rows[0]!.revision_id).toBe(first.id);
    const source = await database.client.query<{ title: string }>('select title from programs where id=$1', [programId]);
    expect(source.rows[0]!.title).toBe('Program kajian');
    const record = await data<{ status: string; events: Array<{ action: string }> }>(await call(revisions, `program-revisions/${saved.id}`, 'reviewer'));
    expect(record.status).toBe('approved'); expect(record.events.some(event => event.action === 'publish')).toBe(false);
  });
  it('rechecks withdrawal inside the write transaction for attempts, progress and enrollment', async () => {
    const programId = await seedProgram(); const first = await populate(await createDraft(programId)); await publish(first);
    const lesson = first.snapshot.lessons[0]!;
    const withdraw = async () => { await database.client.query("update programs set status='archived' where id=$1", [programId]); };
    const restore = async () => { await database.client.query("update programs set status='published' where id=$1", [programId]); };
    database.intercept.beforeBatch = withdraw;
    expect((await call(quizzes, `quizzes/${lesson.quiz!.id}/attempts`, 'participant', 'POST')).status).toBe(403);
    await restore(); database.intercept.beforeBatch = withdraw;
    expect((await call(progress, 'progress', 'participant', 'POST', { lessonId: lesson.id, isCompleted: true })).status).toBe(409);
    await restore(); database.intercept.beforeBatch = withdraw;
    expect((await call(enrollments, 'enrollments', 'participant', 'POST', { programId, status: 'active' })).status).toBe(409);
    const counts = await database.client.query('select (select count(*)::int from quiz_attempts where quiz_id=$1) as attempts, (select count(*)::int from lesson_progress where lesson_id=$2) as progress, (select count(*)::int from enrollments where program_id=$3) as enrollments', [lesson.quiz!.id, lesson.id, programId]);
    expect(counts.rows[0]).toEqual({ attempts: 0, progress: 0, enrollments: 0 });
  });
});
