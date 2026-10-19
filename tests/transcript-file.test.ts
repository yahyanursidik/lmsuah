import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { AuthError, ForbiddenError } from '../netlify/functions/middleware/auth';
const fixtures = vi.hoisted(() => ({
  session: { userId: 'reader', roles: ['participant'] },
  rows: new Map<string, unknown[]>(),
  authFailure: false, denied: false, revisionsEnabled: false,
  get: vi.fn(), set: vi.fn(), batch: vi.fn(), execute: vi.fn(),
}));
vi.mock('../netlify/functions/middleware/auth.js', async importOriginal => ({
  ...await importOriginal<typeof import('../netlify/functions/middleware/auth')>(),
  requireAuth: async () => { if (fixtures.authFailure) throw new AuthError('Sesi diperlukan'); return fixtures.session; },
  requirePermission: async () => { if (fixtures.denied) throw new ForbiddenError('Izin tidak tersedia'); },
}));
vi.mock('../netlify/functions/utils/advanced-features.js', () => ({
  requireFeature: vi.fn(async () => undefined),
  featureRequested: (feature: string) => feature === 'programRevisions' && fixtures.revisionsEnabled,
}));
vi.mock('@netlify/blobs', () => ({ getStore: () => ({ get: fixtures.get, set: fixtures.set }) }));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../netlify/functions/utils/db.js', async () => {
  const { getTableName } = await import('drizzle-orm');
  return { db: {
    select: () => {
      let name = '';
      const query = { from: (table: Parameters<typeof getTableName>[0]) => { name = getTableName(table); return query; }, where: () => query, limit: () => query, innerJoin: () => query,
        then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(fixtures.rows.get(name) || []).then(resolve) };
      return query;
    },
    insert: () => ({ values: (value: unknown) => ({ value }) }),
    execute: fixtures.execute, batch: fixtures.batch,
  } };
});
import handler from '../netlify/functions/transcript-file';
import transcripts from '../netlify/functions/transcripts';
const id = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const lessonId = '33333333-3333-4333-8333-333333333333';
const programId = '44444444-4444-4444-8444-444444444444';
const bytes = new TextEncoder().encode('%PDF-1.7\nfixture\n%%EOF');
const context = {} as Context;
const version = { id, documentId, version: 1, blobKey: 'private-storage-key', filename: 'Transkrip.pdf', mime: 'application/pdf', sizeBytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), status: 'published', isDownloadable: true, uploadedBy: 'uploader' };
beforeEach(() => {
  fixtures.session = { userId: 'reader', roles: ['participant'] }; fixtures.authFailure = false; fixtures.denied = false;
  fixtures.revisionsEnabled = false;
  fixtures.execute.mockReset(); fixtures.execute.mockResolvedValue({ rows: [] });
  fixtures.rows.clear(); fixtures.get.mockReset(); fixtures.set.mockReset(); fixtures.batch.mockReset();
  fixtures.rows.set('transcript_versions', [{ ...version }]);
  fixtures.rows.set('transcript_documents', [{ id: documentId, lessonId, title: 'Transkrip' }]);
  fixtures.rows.set('lessons', [{ id: lessonId, programId, status: 'published' }]);
  fixtures.rows.set('programs', [{ id: programId, status: 'published' }]);
  fixtures.rows.set('system_settings', [{ id: 'general', allowPdfDownload: true }]);
  fixtures.get.mockResolvedValue(bytes.buffer);
});

describe('Authenticated private PDF delivery', () => {
  it('never fetches private bytes without a session or permission', async () => {
    fixtures.authFailure = true;
    expect((await handler(new Request(`http://localhost/api/transcript-file/${id}`), context)).status).toBe(401);
    fixtures.authFailure = false; fixtures.denied = true;
    expect((await handler(new Request(`http://localhost/api/transcript-file/${id}`), context)).status).toBe(403);
    expect(fixtures.get).not.toHaveBeenCalled();
  });
  it('denies draft versions and unpublished parent programs to participants', async () => {
    fixtures.rows.set('transcript_versions', [{ ...version, status: 'draft' }]);
    expect((await handler(new Request(`http://localhost/api/transcript-file/${id}`), context)).status).toBe(403);
    fixtures.rows.set('transcript_versions', [version]); fixtures.rows.set('programs', [{ id: programId, status: 'draft' }]);
    expect((await handler(new Request(`http://localhost/api/transcript-file/${id}`), context)).status).toBe(403);
    expect(fixtures.get).not.toHaveBeenCalled();
  });
  it('returns binary PDF with private headers and bounded byte ranges', async () => {
    const response = await handler(new Request(`http://localhost/api/transcript-file/${id}`, { headers: { Range: 'bytes=0-4' } }), context);
    expect(response.status).toBe(206);
    expect(await response.text()).toBe('%PDF-');
    expect(response.headers.get('content-range')).toBe(`bytes 0-4/${bytes.length}`);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-type')).toBe('application/pdf');
  });
  it('allows an independently reviewed archived PDF still referenced by the published snapshot', async () => {
    fixtures.revisionsEnabled = true;
    fixtures.rows.set('program_publications', [{ publication: { revisionId: 'revision-one' }, programStatus: 'published' }]);
    fixtures.rows.set('transcript_versions', [{ ...version, status: 'archived', reviewedBy: 'reviewer' }]);
    fixtures.execute.mockResolvedValue({ rows: [{ lesson: { materials: [{ id, url: `/api/transcript-file/${id}` }] } }] });
    const response = await handler(new Request(`http://localhost/api/transcript-file/${id}`), context);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(new TextDecoder().decode(bytes));
    expect(fixtures.get).toHaveBeenCalledOnce();
  });
  it.each(['not-referenced', 'not-reviewed', 'self-reviewed', 'withdrawn-program'])('does not fetch bytes for a PDF rejected by publication policy: %s', async reason => {
    fixtures.revisionsEnabled = true;
    fixtures.rows.set('program_publications', [{ publication: { revisionId: 'revision-one' }, programStatus: reason === 'withdrawn-program' ? 'archived' : 'published' }]);
    fixtures.rows.set('transcript_versions', [{ ...version, reviewedBy: reason === 'not-reviewed' ? null : reason === 'self-reviewed' ? version.uploadedBy : 'reviewer' }]);
    fixtures.execute.mockResolvedValue({ rows: reason === 'withdrawn-program' ? [] : [{ lesson: { materials: reason === 'not-referenced' ? [] : [{ id, url: `/api/transcript-file/${id}` }] } }] });
    const response = await handler(new Request(`http://localhost/api/transcript-file/${id}`), context);
    expect(response.status).toBe(403);
    expect(fixtures.get).not.toHaveBeenCalled();
  });
  it('enforces global download policy without fetching bytes', async () => {
    fixtures.rows.set('system_settings', [{ id: 'general', allowPdfDownload: false }]);
    expect((await handler(new Request(`http://localhost/api/transcript-file/${id}?download=1`), context)).status).toBe(403);
    expect(fixtures.get).not.toHaveBeenCalled();
  });
  it('rejects corrupted or mismatched stored bytes', async () => {
    fixtures.get.mockResolvedValue(new TextEncoder().encode('%PDF-1.7\nchanged').buffer);
    expect((await handler(new Request(`http://localhost/api/transcript-file/${id}`), context)).status).toBe(502);
  });
  it('prevents uploader self-approval and draft-to-published bypass', async () => {
    fixtures.session = { userId: 'uploader', roles: ['administrator'] };
    fixtures.rows.set('transcript_versions', [{ ...version, status: 'submitted' }]);
    expect((await transcripts(new Request(`http://localhost/api/transcripts/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'approve', note: 'Sudah diperiksa' }) }), context)).status).toBe(403);
    fixtures.rows.set('transcript_versions', [{ ...version, status: 'draft' }]);
    expect((await transcripts(new Request(`http://localhost/api/transcripts/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'publish', note: 'Langsung terbit' }) }), context)).status).toBe(409);
    expect(fixtures.batch).not.toHaveBeenCalled();
  });
  it('creates a new immutable storage key and draft version for a valid upload', async () => {
    fixtures.session = { userId: 'uploader', roles: ['administrator'] };
    fixtures.set.mockResolvedValue({ modified: true });
    fixtures.batch.mockResolvedValue([{}, {}, { rows: [{ id: 'new-version', version: 1 }] }, {}]);
    const response = await transcripts(new Request('http://localhost/api/transcripts', { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-LMS-Lesson-Id': lessonId, 'X-LMS-Filename': 'Transkrip.pdf' }, body: bytes }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe('draft');
    expect(fixtures.set).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^transcripts/${programId}/${lessonId}/`)), expect.any(ArrayBuffer), expect.objectContaining({ onlyIfNew: true }));
    expect(fixtures.batch).toHaveBeenCalledOnce();
  });
});
