import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { buildMigrationReference, migrationsFolder } from './baseline-reference.js';
import { schemaCatalogSql, compareCatalogs, type SchemaCatalog } from './schema-catalog.js';
import { copyDatabaseUrl, type CopyManifest } from './copy-target.js';
import { createJournalSql, historyGuardSql, readMigrationHistory, runAtomicMigrations, verifyMigrationHistory, migrationFiles } from './atomic-migrations.js';

config({ quiet: true });
async function main() {
  const path = process.argv.find(arg => arg.startsWith('--manifest='))?.slice('--manifest='.length);
  if (!path || !process.env.DATABASE_URL) throw new Error('COPY_MANIFEST_REQUIRED');
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as CopyManifest;
  const targetUrl = copyDatabaseUrl(process.env.DATABASE_URL, manifest);
  const client = neon(targetUrl);
  const baseline = await buildMigrationReference(manifest.baselineLastIndex);
  const history = await readMigrationHistory(client);
  verifyMigrationHistory(history, migrationFiles(migrationsFolder));
  if (history.length > 0 && history.length < baseline.migrations.length) throw new Error('COPY_BASELINE_INCOMPLETE');
  const reference = history.length > baseline.migrations.length ? await buildMigrationReference(history.length - 1) : baseline;
  const current = await client.transaction([client.query(schemaCatalogSql, [])], { readOnly: true, fullResults: true });
  const actual = current[0]!.rows[0]!.catalog as SchemaCatalog;
  const differences = compareCatalogs(reference.catalog, actual);
  const tables = [...new Set(baseline.catalog.columns.map(column => column.table))].sort();
  const countsSql = tables.map(table => `select '${table}' as table_name,count(*)::int as row_count from public."${table}"`).join(' union all ') + ' order by table_name';
  const before = await client.transaction([client.query(countsSql, [])], { readOnly: true, fullResults: true });
  console.log(JSON.stringify({ targetBranchId: manifest.targetBranchId, sourceWrites: false, baselineTables: tables.length, schemaDifferences: differences, existingHistory: history.length, mode: process.argv.includes('--apply-on-copy') ? 'apply-copy-only' : 'inspect-only' }));
  if (!process.argv.includes('--apply-on-copy')) { if (differences.length) process.exitCode = 2; return; }
  if (differences.length) throw new Error('BASELINE_SCHEMA_DRIFT');
  if (history.length === 0) {
    // Check the catalog again under the same lock/transaction that records the
    // verified baseline. Zero application DDL or application records are changed.
    await client.transaction([
      client.query("select pg_advisory_xact_lock(hashtextextended('lms:database-migrations',0))", []),
      client.query(`with reference as (${schemaCatalogSql}) select 1 / case when catalog=$1::jsonb then 1 else 0 end as schema_guard from reference`, [JSON.stringify(baseline.catalog)]),
      client.query('create schema if not exists drizzle', []),
      client.query(createJournalSql, []),
      client.query(historyGuardSql, ['[]']),
      ...baseline.migrations.map(migration => client.query('insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)', [migration.hash, migration.when])),
    ], { fullResults: true });
  }
  const migration = await runAtomicMigrations(client, migrationsFolder);
  const expected = await buildMigrationReference(13);
  const after = await client.transaction([client.query(schemaCatalogSql, []), client.query(countsSql, [])], { readOnly: true, fullResults: true });
  const upgraded = after[0]!.rows[0]!.catalog as SchemaCatalog;
  const remaining = compareCatalogs(expected.catalog, upgraded);
  const rowsUnchanged = JSON.stringify(before[0]!.rows) === JSON.stringify(after[1]!.rows);
  const ledger = await readMigrationHistory(client); verifyMigrationHistory(ledger, migrationFiles(migrationsFolder));
  const rerun = await runAtomicMigrations(client, migrationsFolder);
  console.log(JSON.stringify({ migration, finalTables: new Set(upgraded.columns.map(column => column.table)).size, remainingSchemaDifferences: remaining, originalTableRowCountsUnchanged: rowsUnchanged, journalEntries: ledger.length, repeatApplied: rerun.applied, sourceWrites: false }));
  if (remaining.length || !rowsUnchanged || ledger.length !== expected.migrations.length || rerun.applied !== 0) throw new Error('COPY_VERIFICATION_FAILED');
}
main().catch(error => { console.error(JSON.stringify({ error: error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'COPY_BASELINE_FAILED', sourceWrites: false })); process.exitCode = 1; });
