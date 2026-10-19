import { createHash } from 'node:crypto';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { NeonQueryFunction } from '@neondatabase/serverless';

export function migrationFiles(migrationsFolder: string) {
  return readMigrationFiles({ migrationsFolder }).map(migration => {
    const normalized = migration.sql.join('--> statement-breakpoint').replace(/\r\n/g, '\n');
    const hash = (value: string) => createHash('sha256').update(value).digest('hex');
    return { ...migration, hash: hash(normalized), legacyWindowsHash: hash(normalized.replace(/\n/g, '\r\n')) };
  });
}

export interface MigrationRecord { hash: string; created_at: number }
export function verifyMigrationHistory(records: MigrationRecord[], files: ReturnType<typeof migrationFiles>) {
  if (records.length > files.length || records.some((record, index) => {
    const file = files[index];
    return !file || Number(record.created_at) !== file.folderMillis || ![file.hash, file.legacyWindowsHash].includes(record.hash);
  })) throw new Error('MIGRATION_HISTORY_MISMATCH');
}

export async function readMigrationHistory(client: NeonQueryFunction<false, false>): Promise<MigrationRecord[]> {
  const catalog = await client.query("select to_regclass('drizzle.__drizzle_migrations') is not null as present", [], { fullResults: true });
  if (!catalog.rows[0]?.present) return [];
  const history = await client.query('select hash, created_at from drizzle.__drizzle_migrations order by created_at,id', [], { fullResults: true });
  return history.rows.map(row => ({ hash: String(row.hash), created_at: Number(row.created_at) }));
}

export const createJournalSql = 'create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)';
export const historyGuardSql = `select 1 / case when
  (select coalesce(jsonb_agg(jsonb_build_object('hash',hash,'created_at',created_at) order by created_at,id),'[]'::jsonb) from drizzle.__drizzle_migrations) = $1::jsonb then 1 else 0 end as history_guard`;

/** Neon HTTP cannot use interactive transactions. Submit EVERY pending DDL
 * statement and its journal entries in ONE transaction, after a migration lock
 * and a fresh journal guard. Failure leaves neither half-schema nor false history. */
export async function runAtomicMigrations(client: NeonQueryFunction<false, false>, migrationsFolder: string) {
  const files = migrationFiles(migrationsFolder);
  const history = await readMigrationHistory(client);
  verifyMigrationHistory(history, files);
  const pending = files.slice(history.length);
  if (!pending.length) return { applied: 0, total: files.length };
  const queries = [
    client.query("select pg_advisory_xact_lock(hashtextextended('lms:database-migrations',0))", []),
    client.query('create schema if not exists drizzle', []),
    client.query(createJournalSql, []),
    client.query(historyGuardSql, [JSON.stringify(history)]),
    ...pending.flatMap(migration => [
      ...migration.sql.filter(statement => statement.trim()).map(statement => client.query(statement, [])),
      client.query('insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)', [migration.hash, migration.folderMillis]),
    ]),
  ];
  await client.transaction(queries, { isolationLevel: 'ReadCommitted', fullResults: true });
  return { applied: pending.length, total: files.length };
}
