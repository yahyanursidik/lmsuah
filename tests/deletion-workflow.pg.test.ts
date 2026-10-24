// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Context } from '@netlify/functions';
import { isolatedHttpDatabase } from './helpers/neon-pglite';
import programs from '../netlify/functions/programs';
import lessons from '../netlify/functions/lessons';
import chapters from '../netlify/functions/chapters';
import series from '../netlify/functions/series';
import books from '../netlify/functions/books';
import venues from '../netlify/functions/venues';
import schedules from '../netlify/functions/schedules';
import announcements from '../netlify/functions/announcements';

const state = vi.hoisted(() => ({ database: null as Awaited<ReturnType<typeof isolatedHttpDatabase>> | null }));
vi.mock('../netlify/functions/utils/db.js', () => ({ db: new Proxy({}, { get: (_, key) => {
  const db = state.database!.db; const value = Reflect.get(db, key);
  return typeof value === 'function' ? value.bind(db) : value;
} }) }));
vi.mock('../netlify/functions/middleware/auth.js', async original => {
  const actual = await original<typeof import('../netlify/functions/middleware/auth')>();
  return { ...actual, requireAuth: async (request: Request) => {
    const actor = request.headers.get('x-test-user');
    if (!actor) throw new actual.AuthError('Masuk terlebih dahulu.');
    return { userId: actor, roles: [actor === 'admin' ? 'administrator' : 'participant'] };
  } };
});
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
const handlers = { programs, lessons, chapters, series, books, venues, schedules, announcements };
type Resource = keyof typeof handlers;
let database: Awaited<ReturnType<typeof isolatedHttpDatabase>>;
const call = (resource: Resource, id: string, actor: string | null = 'admin', method = 'DELETE', body?: unknown) => handlers[resource](new Request(`https://example.test/api/${resource}/${id}`, {
  method, headers: { ...(actor ? { 'x-test-user': actor } : {}), 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
}), {} as Context);
async function program() {
  const id = randomUUID(); await database.client.query("insert into programs(id,slug,title) values($1::uuid,$1::text,'Program')", [id]); return id;
}
async function lesson(programId: string) {
  const id = randomUUID(); await database.client.query("insert into lessons(id,program_id,slug,title,sequence) values($1::uuid,$2,$1::text,'Pertemuan',1)", [id, programId]); return id;
}
async function venue() {
  const id = randomUUID(); await database.client.query("insert into venues(id,slug,name,address,city) values($1::uuid,$1::text,'Lokasi','Alamat','Kota')", [id]); return id;
}
async function schedule(p: string, v: string) {
  const id = randomUUID(); await database.client.query("insert into schedules(id,program_id,venue_id,title,speaker,day,date) values($1,$2,$3,'Jadwal','Pemateri','Sabtu','2026-10-24')", [id, p, v]); return id;
}
async function exists(table: Resource | 'bookmarks' | 'lesson_videos' | 'lesson_quiz_drafts' | 'quiz_attempts' | 'user_notes', id: string) {
  const key = table === 'lesson_quiz_drafts' ? 'lesson_id' : 'id';
  return (await database.client.query(`select 1 from ${table} where ${key}=$1`, [id])).rows.length > 0;
}
async function conflict(response: Response, text: string) {
  const body = await response.json(); expect(response.status, JSON.stringify(body)).toBe(409);
  expect(body.error.code).toBe('DEPENDENCY_CONFLICT'); expect(body.error.message).toContain(text);
}
beforeAll(async () => {
  database = await isolatedHttpDatabase(); state.database = database;
  vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'false'); vi.stubEnv('LMS_PRIVATE_PDF_ENABLED', 'false');
  for (const id of ['admin', 'participant']) await database.client.query('insert into "user"(id,name,email,email_verified,created_at,updated_at) values($1,$1,$2,true,now(),now())', [id, `${id}@example.test`]);
}, 120000);
afterAll(async () => { await database?.client.close(); vi.unstubAllEnvs(); });

describe('Safe deletion through real production handlers and isolated PostgreSQL', () => {
  it.each(Object.keys(handlers) as Resource[])('%s rejects guests, participants and malformed IDs', async resource => {
    const id = randomUUID();
    expect((await call(resource, id, null)).status).toBe(resource === 'announcements' ? 401 : 403);
    expect((await call(resource, id, 'participant')).status).toBe(403);
    expect((await call(resource, 'not-a-uuid')).status).toBe(400);
  });
  it.each(Object.keys(handlers) as Resource[])('%s returns 404 for a missing record', async resource => {
    expect((await call(resource, randomUUID())).status).toBe(404);
  });
  it('deletes an unused program and its bookmarks, not other bookmarks', async () => {
    const p = await program(); const other = await program(); const bookmark = randomUUID(); const keep = randomUUID();
    await database.client.query("insert into bookmarks(id,user_id,resource_type,resource_id) values($1,'participant','program',$2),($3,'participant','program',$4)", [bookmark, p, keep, other]);
    expect((await call('programs', p)).status).toBe(200);
    expect(await exists('programs', p)).toBe(false); expect(await exists('bookmarks', bookmark)).toBe(false); expect(await exists('bookmarks', keep)).toBe(true);
  });
  it('reports all program dependencies and offers a working non-destructive archive', async () => {
    const p = await program(); const v = await venue(); const l = await lesson(p); await schedule(p, v);
    await database.client.query("insert into enrollments(user_id,program_id) values('participant',$1)", [p]);
    const response = await call('programs', p); const body = await response.json();
    expect(response.status).toBe(409); expect(body.error.message).toContain('1 pertemuan'); expect(body.error.message).toContain('1 jadwal'); expect(body.error.message).toContain('1 pendaftaran peserta');
    expect((await call('programs', p, 'admin', 'PATCH', { status: 'archived' })).status).toBe(200);
    expect(await exists('lessons', l)).toBe(true);
    expect((await database.client.query('select status from programs where id=$1', [p])).rows[0]!.status).toBe('archived');
  });
  it('retains cancelled revision history even with the feature flag off', async () => {
    const p = await program(); const id = randomUUID();
    await database.client.query("insert into program_revisions(id,program_id,version,snapshot,content_hash,change_note) values($1,$2,1,'{}',$3,'History')", [id, p, 'a'.repeat(64)]);
    await database.client.query("update program_revisions set status='cancelled' where id=$1", [id]);
    await conflict(await call('programs', p), '1 versi revisi');
  });
  it('deletes series-book links atomically while retaining the shared book', async () => {
    const p = await program(); const s = randomUUID(); const b = randomUUID();
    await database.client.query("insert into series(id,program_id,slug,title,sequence) values($1::uuid,$2,$1::text,'Seri',1)", [s, p]);
    await database.client.query("insert into books(id,slug,title) values($1::uuid,$1::text,'Kitab')", [b]);
    await database.client.query('insert into series_books(series_id,book_id,sequence) values($1,$2,1)', [s, b]);
    await conflict(await call('books', b), '1 rujukan seri');
    database.intercept.failStatement = text => text.startsWith('delete from "series"');
    expect((await call('series', s)).status).toBe(500);
    expect((await database.client.query('select 1 from series_books where series_id=$1', [s])).rows).toHaveLength(1);
    expect((await call('series', s)).status).toBe(200); expect(await exists('books', b)).toBe(true);
    expect((await call('books', b)).status).toBe(200);
  });
  it('blocks module and book deletion until lessons and module references are moved', async () => {
    const p = await program(); const l = await lesson(p); const c = randomUUID(); const b = randomUUID();
    await database.client.query("insert into books(id,slug,title) values($1::uuid,$1::text,'Kitab')", [b]);
    await database.client.query("insert into chapters(id,program_id,book_id,title,sequence) values($1,$2,$3,'Modul',1)", [c, p, b]);
    await database.client.query('update lessons set chapter_id=$1 where id=$2', [c, l]);
    await conflict(await call('chapters', c), '1 pertemuan'); await conflict(await call('books', b), '1 modul');
    await database.client.query('update lessons set chapter_id=null where id=$1', [l]);
    expect((await call('chapters', c)).status).toBe(200); expect((await call('books', b)).status).toBe(200);
  });
  it('blocks a used venue and permits deletion after its schedule is removed', async () => {
    const p = await program(); const v = await venue(); const s = await schedule(p, v);
    await conflict(await call('venues', v), '1 jadwal');
    expect((await call('schedules', s)).status).toBe(200); expect((await call('venues', v)).status).toBe(200);
  });
  it('retains participant progress and notes, reporting both without partially deleting video', async () => {
    const p = await program(); const l = await lesson(p); const video = randomUUID(); const note = randomUUID();
    await database.client.query("insert into lesson_videos(id,lesson_id,youtube_id) values($1,$2,'dQw4w9WgXcQ')", [video, l]);
    await database.client.query("insert into lesson_progress(user_id,lesson_id) values('participant',$1)", [l]);
    await database.client.query("insert into user_notes(id,user_id,lesson_id,content) values($1,'participant',$2,'Private')", [note, l]);
    const response = await call('lessons', l); const body = await response.json();
    expect(response.status).toBe(409); expect(body.error.message).toContain('1 progres peserta'); expect(body.error.message).toContain('1 catatan peserta');
    expect(await exists('lesson_videos', video)).toBe(true); expect(await exists('user_notes', note)).toBe(true);
  });
  it('cleans a working quiz pointer before deleting an unused lesson, rolling back failures', async () => {
    const p = await program(); const l = await lesson(p); const q = randomUUID(); const video = randomUUID();
    await database.client.query("insert into quizzes(id,lesson_id,title) values($1,$2,'Kuis')", [q, l]);
    await database.client.query('insert into lesson_quiz_drafts(lesson_id,quiz_id) values($1,$2)', [l, q]);
    await database.client.query("insert into lesson_videos(id,lesson_id,youtube_id) values($1,$2,'dQw4w9WgXcQ')", [video, l]);
    database.intercept.failStatement = text => text.startsWith('delete from "lessons"');
    expect((await call('lessons', l)).status).toBe(500);
    expect(await exists('lesson_quiz_drafts', l)).toBe(true); expect(await exists('lesson_videos', video)).toBe(true);
    expect((await call('lessons', l)).status).toBe(200);
    expect(await exists('lessons', l)).toBe(false); expect(await exists('lesson_quiz_drafts', l)).toBe(false);
  });
  it('protects quiz attempts and answers instead of cascading their deletion', async () => {
    const p = await program(); const l = await lesson(p); const q = randomUUID(); const question = randomUUID(); const option = randomUUID(); const attempt = randomUUID();
    await database.client.query("insert into quizzes(id,lesson_id,title) values($1,$2,'Kuis')", [q, l]);
    await database.client.query("insert into questions(id,quiz_id,type,text) values($1,$2,'single_choice','Soal')", [question, q]);
    await database.client.query("insert into question_options(id,question_id,text,is_correct) values($1,$2,'Jawaban',true)", [option, question]);
    await database.client.query("insert into quiz_attempts(id,quiz_id,user_id,status) values($1,$2,'participant','submitted')", [attempt, q]);
    await database.client.query('insert into quiz_answers(attempt_id,question_id,option_id) values($1,$2,$3)', [attempt, question, option]);
    await conflict(await call('lessons', l), '1 percobaan kuis');
    expect(await exists('quiz_attempts', attempt)).toBe(true);
    expect((await database.client.query('select 1 from quiz_answers where attempt_id=$1', [attempt])).rows).toHaveLength(1);
  });
  it('protects PDFs and snapshot lesson references even when both advanced features are off', async () => {
    const p = await program(); const l = await lesson(p); const revision = randomUUID();
    await database.client.query("insert into transcript_documents(lesson_id,title) values($1,'PDF privat')", [l]);
    await database.client.query("insert into program_revisions(id,program_id,version,snapshot,content_hash,change_note) values($1,$2,1,$3,$4,'History')", [revision, p, JSON.stringify({ lessons: [{ id: l }] }), 'a'.repeat(64)]);
    const response = await call('lessons', l); const body = await response.json();
    expect(response.status).toBe(409); expect(body.error.message).toContain('1 dokumen PDF privat'); expect(body.error.message).toContain('1 snapshot revisi');
    expect(await exists('lessons', l)).toBe(true);
  });
  it('preserves bookmarks when a concurrent enrollment blocks program deletion', async () => {
    const p = await program(); const bookmark = randomUUID();
    await database.client.query("insert into bookmarks(id,user_id,resource_type,resource_id) values($1,'participant','program',$2)", [bookmark, p]);
    database.intercept.beforeBatch = async () => { await database.client.query("insert into enrollments(user_id,program_id) values('participant',$1)", [p]); };
    await conflict(await call('programs', p), 'riwayat');
    expect(await exists('programs', p)).toBe(true); expect(await exists('bookmarks', bookmark)).toBe(true);
  });
  it('deletes announcements and returns 404 rather than false success on retry', async () => {
    const id = randomUUID(); await database.client.query("insert into announcements(id,title,content) values($1,'Judul','Isi')", [id]);
    expect((await call('announcements', id)).status).toBe(200); expect((await call('announcements', id)).status).toBe(404);
  });
  it('deletes unused data on a legacy schema without optional revision/PDF tables', async () => {
    const original = database; const legacy = await isolatedHttpDatabase({ through: 9 });
    try {
      database = legacy; state.database = legacy;
      const p = await program(); const l = await lesson(p);
      expect((await call('lessons', l)).status).toBe(200); expect((await call('programs', p)).status).toBe(200);
    } finally { database = original; state.database = original; await legacy.client.close(); }
  }, 120000);
});
