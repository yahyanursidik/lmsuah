import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@netlify/functions';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import handler from '../netlify/functions/announcements';
import { AuthError } from '../netlify/functions/middleware/auth';

const mocks = vi.hoisted(() => ({
  session: null as { userId: string; roles: string[]; isDevelopmentDemo?: boolean } | null,
  rows: [] as unknown[], where: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(),
}));
vi.mock('../netlify/functions/middleware/auth.js', async importOriginal => ({
  ...await importOriginal<typeof import('../netlify/functions/middleware/auth')>(),
  requireAuth: async () => { if (!mocks.session) throw new AuthError('Sesi diperlukan'); return mocks.session; },
}));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../netlify/functions/utils/db.js', () => ({ db: {
  select: () => ({ from: () => ({ where: (condition: SQL) => {
    mocks.where(condition);
    return { limit: async () => mocks.rows, orderBy: async () => mocks.rows };
  } }) }),
  insert: () => ({ values: (value: unknown) => { mocks.insert(value); return { returning: async () => [{ id: 'new-announcement', ...value as object }] }; } }),
  update: mocks.update, delete: mocks.remove,
} }));

const context = {} as Context;
const request = (method: string, path = '/api/announcements') => new Request(`https://example.test${path}`, {
  method, ...(method === 'POST' || method === 'PATCH' ? { body: JSON.stringify({ title: 'Pengumuman', content: 'Informasi peserta', status: 'published' }) } : {}),
});
beforeEach(() => { vi.clearAllMocks(); mocks.session = null; mocks.rows = []; });

describe('Announcement sessions and access', () => {
  it.each(['POST', 'PATCH', 'DELETE'])('requires a session for %s', async method => {
    expect((await handler(request(method, '/api/announcements/item-one'), context)).status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each(['POST', 'PATCH', 'DELETE'])('rejects a participant for %s before a write', async method => {
    mocks.session = { userId: 'participant-one', roles: ['participant'] };
    expect((await handler(request(method, '/api/announcements/item-one'), context)).status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each(['admin', 'administrator', 'super_administrator'])('records the authenticated %s as the author', async role => {
    mocks.session = { userId: 'admin-one', roles: [role] };
    const response = await handler(request('POST'), context);
    expect(response.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'admin-one' }));
  });
  it('does not insert a synthetic demo user into a database foreign key', async () => {
    mocks.session = { userId: 'demo-admin-1', roles: ['administrator'], isDevelopmentDemo: true };
    expect((await handler(request('POST'), context)).status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ createdBy: null }));
  });
  it('limits guest list queries to published announcements even when draft is requested', async () => {
    const response = await handler(request('GET', '/api/announcements?status=draft'), context);
    expect(response.status).toBe(200);
    const filter = new PgDialect().sqlToQuery(mocks.where.mock.calls[0]![0]);
    expect(filter.sql).toContain('status'); expect(filter.params).toContain('published');
  });
  it('applies published visibility to direct guest URLs', async () => {
    expect((await handler(request('GET', '/api/announcements/draft-id'), context)).status).toBe(404);
    const filter = new PgDialect().sqlToQuery(mocks.where.mock.calls[0]![0]);
    expect(filter.params).toContain('published');
  });
});
