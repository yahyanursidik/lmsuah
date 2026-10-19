// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { copyDatabaseUrl, type CopyManifest } from '../netlify/functions/db/copy-target';
import { migrationFiles, verifyMigrationHistory } from '../netlify/functions/db/atomic-migrations';
import { compareCatalogs, type SchemaCatalog } from '../netlify/functions/db/schema-catalog';

const manifest: CopyManifest = {
  projectId: 'fixture', sourceBranchId: 'br-source', targetBranchId: 'br-copy', targetName: 'codex-baseline-test',
  sourceHost: 'ep-source.c-3.ap-southeast-1.aws.neon.tech', targetHost: 'ep-copy.c-3.ap-southeast-1.aws.neon.tech',
  targetEndpointId: 'ep-copy', databaseName: 'neondb', targetIsDefault: false, targetIsPrimary: false, baselineLastIndex: 9,
};
// Synthetic credentials only. These tests never read .env or connect to a database.
const source = 'postgresql://fixture:synthetic@ep-source-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
describe('Copy-only target safety', () => {
  it('changes only the verified endpoint and retains connection properties in memory', () => {
    const url = new URL(copyDatabaseUrl(source, manifest));
    expect(url.hostname).toBe(manifest.targetHost);
    expect(url.username).toBe('fixture'); expect(url.password).toBe('synthetic');
    expect(url.pathname).toBe('/neondb'); expect(url.search).toBe('?sslmode=require');
  });
  it.each([
    { targetBranchId: manifest.sourceBranchId }, { targetIsDefault: true }, { targetIsPrimary: true },
    { targetHost: manifest.sourceHost, targetEndpointId: 'ep-source' },
    { targetHost: 'ep-source-pooler.c-3.ap-southeast-1.aws.neon.tech', targetEndpointId: 'ep-source-pooler' },
    { targetHost: 'ep-copy.neon.tech.attacker.test' }, { targetEndpointId: 'ep-wrong' },
    { databaseName: 'other' }, { targetName: 'production' }, { baselineLastIndex: 13 },
    { sourceHost: 'ep-other.c-3.ap-southeast-1.aws.neon.tech' }, { targetBranchId: undefined },
  ])('rejects unsafe metadata %j', patch => {
    expect(() => copyDatabaseUrl(source, { ...manifest, ...patch } as CopyManifest)).toThrow('UNSAFE_COPY_TARGET');
  });
  it('rejects connection options overrides and incomplete manifests', () => {
    expect(() => copyDatabaseUrl(source + '&options=endpoint%3Dep-source', manifest)).toThrow('UNSAFE_COPY_TARGET');
    expect(() => copyDatabaseUrl(source, {} as CopyManifest)).toThrow('UNSAFE_COPY_TARGET');
  });
});

describe('Portable, strict migration history', () => {
  const folder = 'netlify/functions/db/migrations';
  const files = migrationFiles(folder);
  it('uses canonical LF hashes across Windows and Linux, while accepting known historical CRLF hashes', () => {
    const journal = JSON.parse(readFileSync(`${folder}/meta/_journal.json`, 'utf8'));
    files.forEach((file, index) => {
      const raw = readFileSync(`${folder}/${journal.entries[index].tag}.sql`, 'utf8');
      expect(file.hash).toBe(createHash('sha256').update(raw.replace(/\r\n/g, '\n')).digest('hex'));
    });
    expect(() => verifyMigrationHistory(files.map(file => ({ hash: file.legacyWindowsHash, created_at: file.folderMillis })), files)).not.toThrow();
  });
  it('rejects unknown hashes, gaps, duplicates and future journal entries', () => {
    const entries = files.map(file => ({ hash: file.hash, created_at: file.folderMillis }));
    for (const invalid of [
      [{ ...entries[0], hash: 'changed' }], entries.slice(1), [entries[0], entries[0]],
      [...entries, { hash: 'future', created_at: 9999999999999 }],
    ]) expect(() => verifyMigrationHistory(invalid, files)).toThrow('MIGRATION_HISTORY_MISMATCH');
    expect(() => verifyMigrationHistory(entries.slice(0, 10), files)).not.toThrow();
  });
});

describe('Exact baseline comparison', () => {
  const catalog: SchemaCatalog = {
    columns: [{ table: 'fixture', name: 'id', type: 'uuid', notNull: true, default: 'gen_random_uuid()' }],
    constraints: [{ table: 'fixture', name: 'fixture_pkey', type: 'p', definition: 'PRIMARY KEY (id)', validated: true }],
    indexes: [{ table: 'fixture', name: 'fixture_pkey', definition: 'CREATE UNIQUE INDEX fixture_pkey ON public.fixture USING btree (id)' }],
    triggers: [{ table: 'fixture', name: 'guard', definition: 'BEFORE UPDATE', enabled: 'O' }],
    functions: [{ table: 'public', name: 'guard()', definition: 'guard body' }],
  };
  it('ignores object property order, but rejects changed column, constraint, index and additional table', () => {
    const equal = JSON.parse(JSON.stringify(catalog)) as SchemaCatalog;
    equal.columns[0] = { default: 'gen_random_uuid()', type: 'uuid', notNull: true, name: 'id', table: 'fixture' };
    expect(compareCatalogs(catalog, equal)).toEqual([]);
    for (const change of [
      (copy: SchemaCatalog) => { copy.columns[0].notNull = false; },
      (copy: SchemaCatalog) => { copy.columns[0].default = null; },
      (copy: SchemaCatalog) => { copy.constraints[0].validated = false; },
      (copy: SchemaCatalog) => { copy.indexes[0].definition += ' WHERE false'; },
      (copy: SchemaCatalog) => { copy.triggers[0].enabled = 'D'; },
      (copy: SchemaCatalog) => { copy.functions[0].definition = 'RETURN NEW'; },
      (copy: SchemaCatalog) => { copy.columns.push({ ...copy.columns[0], table: 'extra' }); },
    ]) {
      const copy = structuredClone(catalog); change(copy);
      expect(compareCatalogs(catalog, copy)).toHaveLength(1);
    }
  });
});
