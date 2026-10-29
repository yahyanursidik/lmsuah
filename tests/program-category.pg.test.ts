// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Context } from '@netlify/functions';
import { isolatedHttpDatabase } from './helpers/neon-pglite';
import handler from '../netlify/functions/programs';
import { programs } from '../netlify/functions/db/schema';
import { programReadColumns } from '../netlify/functions/utils/program-columns';

const state = vi.hoisted(() => ({ database: null as Awaited<ReturnType<typeof isolatedHttpDatabase>> | null, roles: ['publisher'] }));
vi.mock('../netlify/functions/utils/db.js', () => ({ db: new Proxy({}, { get: (_, key) => {
  const db = state.database!.db; const value = Reflect.get(db, key);
  return typeof value === 'function' ? value.bind(db) : value;
} }) }));
vi.mock('../netlify/functions/utils/contentHelper.js', async original => ({
  ...await original<typeof import('../netlify/functions/utils/contentHelper')>(),
  getOptionalAuth: async () => ({ userId: 'publisher', roles: state.roles, isDevelopmentDemo: true }),
  logMutationAudit: vi.fn(),
}));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
let database: Awaited<ReturnType<typeof isolatedHttpDatabase>>;
beforeAll(async () => {
  database = await isolatedHttpDatabase(); state.database = database;
  vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'false');
}, 120000);
afterAll(async () => { await database?.client.close(); vi.unstubAllEnvs(); });
const call = (path = '', method = 'GET', body?: unknown) => handler(new Request(`https://example.test/api/programs${path}`, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), {} as Context);
async function create(category?: unknown) {
  const response = await call('', 'POST', { title: 'Program Tauhid', slug: `program-${randomUUID()}`, description: 'Belajar', ...(category === undefined ? {} : { category }) });
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
  return (await response.json()).data as { id: string; category: string | null; updatedAt: string };
}

describe('Program category persistence and policy', () => {
  it('creates, reads, updates, preserves and clears a program category', async () => {
    const program = await create('  Tauhid  ');
    expect(program.category).toBe('Tauhid');
    const detail = await call(`/${program.id}`);
    expect((await detail.json()).data.category).toBe('Tauhid');
    expect((await (await call('?status=draft')).json()).data.items.find((item: { id: string }) => item.id === program.id).category).toBe('Tauhid');
    await call(`/${program.id}`, 'PATCH', { description: 'Deskripsi baru' });
    expect((await (await call(`/${program.id}`)).json()).data.category).toBe('Tauhid');
    expect((await (await call(`/${program.id}`, 'PATCH', { category: '  Bahasa Arab  ' })).json()).data.category).toBe('Bahasa Arab');
    expect((await (await call(`/${program.id}`, 'PATCH', { category: '  ' })).json()).data.category).toBeNull();
    expect((await create()).category).toBeNull();
  });
  it('does not inherit or change category when a routine agenda says Fiqih', async () => {
    const program = await create('Tauhid'); const venue = randomUUID();
    await database.client.query("insert into venues(id,slug,name,address,city) values ($1,$2,'Masjid','Alamat','Bandung')", [venue, `venue-${venue}`]);
    await database.client.query("insert into schedules(program_id,venue_id,title,speaker,category,day,date) values ($1,$2,'Jadwal','Pemateri','Fiqih','Sabtu','2026-10-31')", [program.id, venue]);
    expect((await (await call(`/${program.id}`)).json()).data.category).toBe('Tauhid');
    await call(`/${program.id}`, 'PATCH', { category: null });
    expect((await (await call(`/${program.id}`)).json()).data.category).toBeNull();
    const rows = await database.client.query<{ category: string }>('select category from schedules where program_id=$1', [program.id]);
    expect(rows.rows[0]!.category).toBe('Fiqih');
  });
  it('validates lengths/types and keeps publication permissions', async () => {
    const program = await create('Aqidah');
    for (const category of ['a'.repeat(101), 123, ['Tauhid']]) expect((await call(`/${program.id}`, 'PATCH', { category })).status).toBe(400);
    expect((await call(`/${program.id}`, 'PATCH', { category: 'a'.repeat(100) })).status).toBe(200);
    await database.client.query("update programs set status='published' where id=$1", [program.id]);
    state.roles = ['content_contributor'];
    try { expect((await call(`/${program.id}`, 'PATCH', { category: 'Tafsir' })).status).toBe(403); }
    finally { state.roles = ['publisher']; }
  });
  it('reads a legacy database before migration and preserves data without inventing categories', async () => {
    const legacy = await isolatedHttpDatabase({ through: 14 });
    try {
      await legacy.client.exec("insert into programs(slug,title,status) values ('legacy-category','Tauhid lama','published')");
      const before = (await legacy.db.select(programReadColumns()).from(programs))[0]!;
      expect(before.category).toBeNull();
      await legacy.client.exec(readFileSync('netlify/functions/db/migrations/0015_program_category.sql', 'utf8'));
      const after = (await legacy.db.select(programReadColumns()).from(programs))[0]!;
      expect(after.id).toBe(before.id); expect(after.status).toBe('published'); expect(after.category).toBeNull();
      await legacy.client.exec("update programs set category='Tauhid'");
      expect((await legacy.db.select(programReadColumns()).from(programs))[0]!.category).toBe('Tauhid');
    } finally { await legacy.client.close(); }
  }, 120000);
});
