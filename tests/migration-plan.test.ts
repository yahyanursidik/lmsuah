import { describe, expect, it } from 'vitest';
import { migrationPlan } from '../netlify/functions/db/migration-plan';

describe('Migration deployment safety', () => {
  const entries = [{ tag: '0000_base', when: 100 }, { tag: '0010_revisions', when: 200 }];
  it('refuses to replay old CREATE TABLE migrations on an untracked populated schema', () => {
    expect(migrationPlan(true, 0, entries)).toEqual({ baselineRequired: true, canRunMigrator: false, pendingMigrations: null, reason: 'BASELINE_REQUIRED' });
  });
  it('selects only unapplied migrations on a tracked database', () => {
    expect(migrationPlan(true, 100, entries).pendingMigrations).toEqual(['0010_revisions']);
  });
  it('allows the full chain on a genuinely empty database', () => {
    expect(migrationPlan(false, 0, entries).pendingMigrations).toEqual(['0000_base', '0010_revisions']);
  });
});
