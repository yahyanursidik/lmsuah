import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Netlify release safety', () => {
  it('omits only explicitly public configuration and keeps credential scanning enabled', () => {
    const config = readFileSync('netlify.toml', 'utf8');
    const omit = config.match(/^\s*SECRETS_SCAN_OMIT_KEYS\s*=\s*"([^"]+)"\s*$/m)?.[1]?.split(',') || [];
    const allowed = ['BETTER_AUTH_URL', 'CONTABO_ENDPOINT', 'CONTABO_BUCKET', 'CONTABO_PUBLIC_URL', 'CONTABO_SIGNING_REGION', 'S3_ENDPOINT', 'S3_BUCKET', 'S3_REGION', 'S3_PUBLIC_URL', 'CONTABO_PRIVATE_BUCKET', 'CONTABO_PRIVATE_ENDPOINT', 'LMS_PRIVATE_PDF_STORAGE', 'LMS_PRIVATE_PDF_ENABLED', 'LMS_PROGRAM_REVISIONS_ENABLED'];
    expect(omit).toContain('BETTER_AUTH_URL');
    expect(omit).toContain('S3_BUCKET');
    expect(omit).toContain('LMS_PRIVATE_PDF_STORAGE');
    expect(omit.every(key => allowed.includes(key))).toBe(true);
    for (const secret of ['DATABASE_URL', 'GOOGLE_CLIENT_SECRET', 'BETTER_AUTH_SECRET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'CONTABO_ACCESS_KEY_ID', 'CONTABO_SECRET_ACCESS_KEY']) expect(omit).not.toContain(secret);
    expect(config).not.toMatch(/^\s*SECRETS_SCAN_ENABLED\s*=\s*"?false/im);
    expect(config).not.toMatch(/^\s*SECRETS_SCAN_OMIT_PATHS\s*=/m);
    expect(config).toContain('functions = "netlify/functions"');
    expect(config).toContain('publish = "dist"');
  });
});
