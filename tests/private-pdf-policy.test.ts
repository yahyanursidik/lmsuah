import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { MAX_PDF_BYTES, pdfRange, safePdfFilename, validatePdf } from '../netlify/functions/utils/pdf-files';
import { nextTranscriptStatus } from '../shared/review-policy';
import { nextProgramRevisionStatus } from '../shared/program-revision-policy';
import { featureAvailable } from '../netlify/functions/utils/advanced-features';

const execute = vi.hoisted(() => vi.fn());
vi.mock('../netlify/functions/utils/db.js', () => ({ db: { execute } }));
afterEach(() => { vi.unstubAllEnvs(); execute.mockReset(); });

describe('Private PDF validation and distribution', () => {
  const pdf = new TextEncoder().encode('%PDF-1.7\nfixture\n%%EOF');
  it('checks MIME and PDF signature and returns a SHA-256 digest', () => {
    expect(validatePdf(pdf, 'application/pdf')).toMatch(/^[a-f0-9]{64}$/);
    expect(() => validatePdf(pdf, 'text/html')).toThrow();
    expect(() => validatePdf(new TextEncoder().encode('<html>fake</html>'), 'application/pdf')).toThrow();
  });
  it('rejects empty and oversized files', () => {
    expect(() => validatePdf(new Uint8Array(), 'application/pdf')).toThrow();
    expect(() => validatePdf(new Uint8Array(MAX_PDF_BYTES + 1), 'application/pdf')).toThrow();
  });
  it('keeps filenames local and PDF-only', () => {
    expect(safePdfFilename('C:\\uploads\\Modul.pdf')).toBe('Modul.pdf');
    expect(safePdfFilename('../Transkrip.pdf')).toBe('Transkrip.pdf');
    expect(() => safePdfFilename('script.html')).toThrow();
  });
  it('supports bounded and suffix HTTP ranges and rejects multiple ranges', () => {
    expect(pdfRange('bytes=0-4', 20)).toEqual({ start: 0, end: 4 });
    expect(pdfRange('bytes=-5', 20)).toEqual({ start: 15, end: 19 });
    expect(pdfRange('bytes=5-', 20)).toEqual({ start: 5, end: 19 });
    expect(() => pdfRange('bytes=0-1,3-4', 20)).toThrow();
    expect(() => pdfRange('bytes=20-', 20)).toThrow();
  });
  it('cannot publish a PDF directly from draft or revive an archived version', () => {
    expect(() => nextTranscriptStatus('draft', 'publish')).toThrow();
    expect(() => nextTranscriptStatus('archived', 'publish')).toThrow();
    expect(nextTranscriptStatus('draft', 'submit')).toBe('submitted');
    expect(nextTranscriptStatus('submitted', 'approve')).toBe('approved');
    expect(nextTranscriptStatus('approved', 'publish')).toBe('published');
  });
});

describe('Prepared separate revisions remain fail-closed', () => {
  it('does not query tables when PDF feature is disabled', async () => {
    vi.stubEnv('LMS_PRIVATE_PDF_ENABLED', 'false');
    expect(await featureAvailable('privatePdf')).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });
  it('does not activate separate revisions merely because an environment flag is set', async () => {
    vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'true');
    execute.mockResolvedValue({ rows: [{ missing: 'column:program_revisions.base_revision_id' }] });
    expect(await featureAvailable('programRevisions')).toBe(false);
    expect(execute).toHaveBeenCalledOnce();
  });
  it('activates complete schema only when its server flag is enabled', async () => {
    vi.stubEnv('LMS_PROGRAM_REVISIONS_ENABLED', 'true');
    execute.mockResolvedValue({ rows: [] });
    expect(await featureAvailable('programRevisions')).toBe(true);
  });
  it('requires independent approval and valid immutable revision transitions', () => {
    expect(() => nextProgramRevisionStatus('submitted', 'approve', 'author', 'author')).toThrow('INDEPENDENT_REVIEWER_REQUIRED');
    expect(() => nextProgramRevisionStatus('draft', 'publish', 'publisher', 'author')).toThrow();
    expect(nextProgramRevisionStatus('submitted', 'approve', 'reviewer', 'author')).toBe('approved');
    expect(nextProgramRevisionStatus('approved', 'publish', 'publisher', 'author')).toBe('published');
    expect(() => nextProgramRevisionStatus('published', 'submit', 'author', 'author')).toThrow();
  });
  it('prepares additive SQL and creates the composite unique index before its foreign key', () => {
    const migration = readFileSync('netlify/functions/db/migrations/0010_majestic_eddie_brock.sql', 'utf8');
    expect(migration).not.toMatch(/^\s*(?:DROP|TRUNCATE|DELETE\s+FROM|UPDATE\s+\w+\s+SET)/im);
    expect(migration).not.toMatch(/ALTER\s+TABLE[^;]*\sDROP\s/im);
    expect(migration.indexOf('CREATE UNIQUE INDEX "program_revisions_program_id_unique"')).toBeLessThan(migration.indexOf('ADD CONSTRAINT "program_publications_revision_program_fk"'));
    expect(migration).toContain('Submitted revision content is immutable');
    expect(migration).toContain('Publication must use the exact approved immutable revision');
  });
});
