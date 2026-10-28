// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Context } from '@netlify/functions';
import { isolatedHttpDatabase } from './helpers/neon-pglite';
import programs from '../netlify/functions/programs';
import lessons from '../netlify/functions/lessons';
import { programReadiness } from '../shared/program-readiness';

const state = vi.hoisted(() => ({ database: null as Awaited<ReturnType<typeof isolatedHttpDatabase>> | null }));
vi.mock('../netlify/functions/utils/db.js', () => ({ db: new Proxy({}, { get: (_, key) => {
  const db = state.database!.db;
  const value = Reflect.get(db, key);
  return typeof value === 'function' ? value.bind(db) : value;
} }) }));
vi.mock('../netlify/functions/utils/contentHelper.js', async original => ({
  ...await original<typeof import('../netlify/functions/utils/contentHelper')>(),
  getOptionalAuth: async () => ({ userId: 'publisher', roles: ['publisher'], isDevelopmentDemo: true }),
  logMutationAudit: vi.fn(),
}));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

let database: Awaited<ReturnType<typeof isolatedHttpDatabase>>;
beforeAll(async () => {
  database = await isolatedHttpDatabase(); state.database = database;
  vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'false');
  vi.stubEnv('LMS_PRIVATE_PDF_ENABLED', 'false');
}, 120000);
afterAll(async () => { await database?.client.close(); vi.unstubAllEnvs(); });

async function seed(statuses = ['published']) {
  const programId = randomUUID();
  await database.client.query("insert into programs(id,slug,title,description) values ($1,$2,'Kajian','Deskripsi')", [programId, `program-${programId}`]);
  const ids: string[] = [];
  for (const [index, status] of statuses.entries()) {
    const id = randomUUID(); ids.push(id);
    await database.client.query('insert into lessons(id,program_id,slug,title,sequence,status) values ($1,$2,$3,$4,$5,$6)', [id, programId, `lesson-${id}`, `Pertemuan ${index + 1}`, index + 1, status]);
  }
  return { programId, ids };
}
async function checklist(programId: string) {
  const response = await lessons(new Request(`https://example.test/api/lessons?programId=${programId}`), {} as Context);
  expect(response.status).toBe(200);
  const body = await response.json();
  return body.data.items as Array<{ status: string; materialCount: number }>;
}
const publish = (id: string) => programs(new Request(`https://example.test/api/programs/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'published' }) }), {} as Context);

describe('Checklist and publication gate agree on real PostgreSQL', () => {
  it.each(['video', 'link', 'PDF'])('publishes a lesson with %s whose material ID differs from the lesson ID', async type => {
    const { programId, ids } = await seed(['published', 'draft']);
    if (type === 'video') await database.client.query("insert into lesson_videos(id,lesson_id,youtube_id) values ($1,$2,'dQw4w9WgXcQ')", [randomUUID(), ids[0]]);
    else await database.client.query("insert into lesson_attachments(id,lesson_id,filename,url,type) values ($1,$2,'Materi','https://example.test/materi',$3)", [randomUUID(), ids[0], type]);
    const items = await checklist(programId);
    expect(items.map(item => item.materialCount)).toEqual([1, 0]);
    expect(programReadiness({ title: 'Kajian', description: 'Deskripsi' }, items).every(check => check.ready)).toBe(true);
    const response = await publish(programId);
    expect(response.status, JSON.stringify(await response.json())).toBe(200);
  });
  it('rejects an empty published lesson even when another lesson or program has materials', async () => {
    const { programId, ids } = await seed(['published', 'published']);
    const other = await seed();
    for (const id of [ids[0], other.ids[0]]) await database.client.query("insert into lesson_videos(lesson_id,youtube_id) values ($1,'dQw4w9WgXcQ')", [id]);
    expect((await checklist(programId)).map(item => item.materialCount)).toEqual([1, 0]);
    const response = await publish(programId);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe('PROGRAM_NOT_READY');
    expect(body.error.message).toContain('Pertemuan 2');
    const saved = await database.client.query<{ status: string }>('select status from programs where id=$1', [programId]);
    expect(saved.rows[0]!.status).toBe('draft');
  });
  it('counts only published private PDF versions when the feature is enabled', async () => {
    vi.stubEnv('LMS_PRIVATE_PDF_ENABLED', 'true');
    try {
      const { programId, ids } = await seed();
      const documentId = randomUUID();
      await database.client.query("insert into transcript_documents(id,lesson_id,title) values ($1,$2,'Transkrip')", [documentId, ids[0]]);
      await database.client.query("insert into transcript_versions(document_id,version,blob_key,filename,size_bytes,sha256) values ($1,1,$2,'materi.pdf',100,$3)", [documentId, randomUUID(), 'a'.repeat(64)]);
      const reviewer = randomUUID();
      await database.client.query('insert into "user" (id,name,email,email_verified,created_at,updated_at) values ($1,$1,$2,true,now(),now())', [reviewer, `${reviewer}@example.test`]);
      await database.client.query("update transcript_versions set status='submitted' where document_id=$1", [documentId]);
      await database.client.query("update transcript_versions set status='approved',reviewed_by=$2 where document_id=$1", [documentId, reviewer]);
      expect((await checklist(programId))[0]!.materialCount).toBe(0);
      expect((await publish(programId)).status).toBe(409);
      await database.client.query("update transcript_versions set status='published' where document_id=$1", [documentId]);
      expect((await checklist(programId))[0]!.materialCount).toBe(1);
      expect((await publish(programId)).status).toBe(200);
    } finally { vi.stubEnv('LMS_PRIVATE_PDF_ENABLED', 'false'); }
  });
  it('rejects programs without published lessons', async () => {
    const { programId } = await seed(['draft']);
    expect((await publish(programId)).status).toBe(409);
  });
});
