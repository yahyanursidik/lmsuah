import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@netlify/functions';
import type { UserSession } from '../netlify/functions/middleware/auth';

const state = vi.hoisted(() => ({
  session: { userId: 'admin', roles: ['administrator'] } as UserSession | null,
  rows: [] as unknown[], insert: vi.fn(), update: vi.fn(),
}));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../netlify/functions/utils/db.js', () => ({ db: {
  select: () => { const query = { from: () => query, where: () => query, limit: async () => state.rows }; return query; },
  insert: () => ({ values: (values: Record<string, unknown>) => { state.insert(values); return { returning: async () => [{ id: 'new', ...values }] }; } }),
  update: () => ({ set: (values: Record<string, unknown>) => { state.update(values); return { where: () => ({ returning: async () => [{ id: 'existing', ...values }] }) }; } }),
} }));
vi.mock('../netlify/functions/utils/contentHelper.js', async importOriginal => ({
  ...await importOriginal<typeof import('../netlify/functions/utils/contentHelper')>(),
  getOptionalAuth: async () => state.session,
}));
import handler from '../netlify/functions/schedules';

const id = '11111111-1111-4111-8111-111111111111';
const valid = { venueId: id, title: 'Kajian', speaker: 'Pengajar', day: 'Senin', date: '2026-10-19' };
const call = (method: string, body: unknown, path = '') => handler(new Request(`http://localhost/api/schedules${path}`, { method, body: JSON.stringify(body) }), {} as Context);

beforeEach(() => { state.session = { userId: 'admin', roles: ['administrator'] }; state.rows = [{ id, status: 'Rutin' }]; state.insert.mockClear(); state.update.mockClear(); });

describe('Schedule handler regressions without production database writes', () => {
  it.each(['', null])('creates an agenda without a program using %s', async programId => {
    const response = await call('POST', { ...valid, programId });
    expect(response.status).toBe(200);
    expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ programId: null, createdBy: 'admin' }));
  });
  it('allows omitting the optional program', async () => {
    expect((await call('POST', valid)).status).toBe(200);
  });
  it('can remove an existing program association', async () => {
    expect((await call('PATCH', { programId: null }, `/${id}`)).status).toBe(200);
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ programId: null }));
  });
  it('keeps an existing program when the field is omitted from an update', async () => {
    expect((await call('PATCH', { title: 'Baru' }, `/${id}`)).status).toBe(200);
    expect(state.update.mock.calls[0][0]).not.toHaveProperty('programId');
  });
  it('returns an actionable validation error for a missing venue', async () => {
    const response = await call('POST', { ...valid, venueId: '' });
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain('Pilih lokasi majelis');
    expect(state.insert).not.toHaveBeenCalled();
  });
  it('does not write as an anonymous visitor', async () => {
    state.session = null;
    expect((await call('POST', valid)).status).toBe(403);
    expect(state.insert).not.toHaveBeenCalled();
  });
  it('does not insert a nonexistent demo account into the actor foreign key', async () => {
    state.session = { userId: 'demo-admin-1', roles: ['super_administrator'], isDevelopmentDemo: true };
    expect((await call('POST', valid)).status).toBe(200);
    expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ createdBy: null, updatedBy: null }));
  });
  it('returns 404 rather than a generic server error for a removed schedule', async () => {
    state.rows = [];
    expect((await call('PATCH', { title: 'Baru' }, `/${id}`)).status).toBe(404);
  });
});
