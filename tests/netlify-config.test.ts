import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Netlify release safety', () => {
  it('omits only the public auth URL from scanning and keeps secret scanning enabled', () => {
    const config = readFileSync('netlify.toml', 'utf8');
    expect(config).toMatch(/^\s*SECRETS_SCAN_OMIT_KEYS\s*=\s*"BETTER_AUTH_URL"\s*$/m);
    expect(config).not.toMatch(/^\s*SECRETS_SCAN_ENABLED\s*=\s*"?false/im);
    expect(config).not.toMatch(/^\s*SECRETS_SCAN_OMIT_PATHS\s*=/m);
    expect(config).toContain('functions = "netlify/functions"');
    expect(config).toContain('publish = "dist"');
  });
});
