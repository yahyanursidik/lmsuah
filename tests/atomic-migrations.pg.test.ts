// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isolatedHttpDatabase } from './helpers/neon-pglite';
import { createJournalSql, migrationFiles, readMigrationHistory, runAtomicMigrations } from '../netlify/functions/db/atomic-migrations';

const folder = 'netlify/functions/db/migrations';
describe('Atomic Neon HTTP migrations (real PostgreSQL semantics)', () => {
  it('rolls back ALL pending DDL and history on late failure, then installs once and is idempotent', async () => {
    const database = await isolatedHttpDatabase({ through: -1 });
    try {
      database.intercept.failStatement = text => text.includes('quiz_attempts_user_quiz_status_idx');
      await expect(runAtomicMigrations(database.httpClient, folder)).rejects.toThrow('Simulated');
      expect((await database.client.query("select count(*)::int as n from pg_tables where schemaname='public'")).rows).toEqual([{ n: 0 }]);
      expect(await readMigrationHistory(database.httpClient)).toEqual([]);
      const total = migrationFiles(folder).length;
      expect(await runAtomicMigrations(database.httpClient, folder)).toEqual({ applied: total, total });
      expect(await readMigrationHistory(database.httpClient)).toHaveLength(total);
      expect(await runAtomicMigrations(database.httpClient, folder)).toEqual({ applied: 0, total });
      await database.client.exec("update drizzle.__drizzle_migrations set hash='tampered' where id=1");
      await expect(runAtomicMigrations(database.httpClient, folder)).rejects.toThrow('MIGRATION_HISTORY_MISMATCH');
    } finally { await database.client.close(); }
  }, 120000);

  it('keeps verified baseline, legacy rows and history intact when an actual unique-index upgrade fails', async () => {
    const database = await isolatedHttpDatabase({ through: 9 });
    try {
      await database.client.exec(`create schema drizzle; ${createJournalSql}`);
      for (const file of migrationFiles(folder).slice(0, 10)) {
        await database.client.query('insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)', [file.hash, file.folderMillis]);
      }
      await database.client.exec(`insert into "user" (id,name,email,email_verified,created_at,updated_at) values ('atomic-fixture','Test','atomic@example.test',true,now(),now());
        insert into programs(id,slug,title,status) values ('00000000-0000-4000-8000-000000000001','atomic-fixture','Test','draft');
        insert into enrollments(user_id,program_id) values ('atomic-fixture','00000000-0000-4000-8000-000000000001'),('atomic-fixture','00000000-0000-4000-8000-000000000001');`);
      await expect(runAtomicMigrations(database.httpClient, folder)).rejects.toMatchObject({ code: '23505' });
      expect(await readMigrationHistory(database.httpClient)).toHaveLength(10);
      expect((await database.client.query("select to_regclass('public.program_revisions') as new_table,(select count(*)::int from enrollments) as enrollments")).rows).toEqual([{ new_table: null, enrollments: 2 }]);
      expect((await database.client.query("select count(*)::int as n from pg_tables where schemaname='public'")).rows).toEqual([{ n: 33 }]);
    } finally { await database.client.close(); }
  }, 120000);

  it('aborts a stale migration plan if another runner changes the journal while waiting for its lock', async () => {
    const database = await isolatedHttpDatabase({ through: -1 });
    try {
      database.intercept.beforeBatch = async () => {
        await database.client.exec(`create schema drizzle; ${createJournalSql}; insert into drizzle.__drizzle_migrations(hash,created_at) values ('concurrent',1)`);
      };
      await expect(runAtomicMigrations(database.httpClient, folder)).rejects.toMatchObject({ code: '22012' });
      expect((await database.client.query("select count(*)::int as n from pg_tables where schemaname='public'")).rows).toEqual([{ n: 0 }]);
      expect(await readMigrationHistory(database.httpClient)).toEqual([{ hash: 'concurrent', created_at: 1 }]);
    } finally { await database.client.close(); }
  }, 120000);
});
