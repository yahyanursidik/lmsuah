import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { PgDialect } from 'drizzle-orm/pg-core';
import { readFileSync } from 'node:fs';
import { migrationPlan } from './migration-plan.js';

// SELECT-only, including at the database transaction level. Never run migrations
// or print the connection string, account details, secrets, or raw DB errors.
config({ quiet: true });
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
  const client = neon(process.env.DATABASE_URL);
  const { featureReadinessQuery } = await import('../utils/advanced-features.js');
  const dialect = new PgDialect();
  const features = ['programRevisions', 'privatePdf'] as const;
  const prepared = features.map(feature => dialect.sqlToQuery(featureReadinessQuery(feature)));
  const results = await client.transaction([
    client.query("select current_setting('transaction_read_only') as read_only, to_regclass('drizzle.__drizzle_migrations') is not null as has_journal, to_regclass('public.programs') is not null or to_regclass('public.user') is not null or to_regclass('public.lessons') is not null as has_application_tables, to_regclass('public.lesson_progress') is not null and to_regclass('public.enrollments') is not null and to_regclass('public.programs') is not null as has_learning_tables"),
    ...prepared.map(query => client.query(query.sql, query.params)),
  ], { readOnly: true });
  const schema = Object.fromEntries(features.map((feature, index) => [feature, { ready: results[index + 1]!.length === 0, missing: results[index + 1]!.map(row => String(row.missing)) }]));
  const journal = JSON.parse(readFileSync('netlify/functions/db/migrations/meta/_journal.json', 'utf8')) as { entries: Array<{ when: number; tag: string }> };
  const applied = results[0]![0]!.has_journal ? await client.transaction([client.query('select coalesce(max(created_at),0)::text as latest from drizzle.__drizzle_migrations')], { readOnly: true }) : [[{ latest: '0' }]];
  const latest = Number(applied[0]![0]!.latest);
  const plan = migrationPlan(Boolean(results[0]![0]!.has_application_tables), latest, journal.entries);
  const metrics = results[0]![0]!.has_learning_tables ? await client.transaction([
    client.query(`select
      (select count(*)::int from (select 1 from enrollments group by user_id,program_id having count(*)>1) e) as duplicate_enrollment_groups,
      (select count(*)::int from (select 1 from lesson_progress group by user_id,lesson_id having count(*)>1) p) as duplicate_progress_groups,
      (select count(*)::int from programs where status='published') as published_programs`),
    client.query(`select p.permission from unnest(array['program.read','program.update','program.review','program.publish','lesson.create','lesson.update','lesson.review','lesson.publish','quiz.create','quiz.update','quiz.review','quiz.publish','transcript.read','transcript.upload','transcript.review','transcript.publish']) as p(permission)
      where not exists(select 1 from permissions where id=p.permission)`),
  ], { readOnly: true }) : null;
  const counts = metrics?.[0]?.[0];
  console.log(JSON.stringify({
    readOnly: results[0]![0]!.read_only === 'on', schema, migrationPlan: plan,
    learning: counts || { error: 'BASE_MIGRATION_REQUIRED' },
    missingPermissionDefinitions: metrics?.[1]?.map(row => row.permission) || [],
    activation: 'Apply approved migrations to a backed-up database, map least-privilege roles, verify Blobs storage and two independent reviewers, then enable server flags. No migration or data change was performed.',
  }, null, 2));
  if (!plan.canRunMigrator || !metrics || counts?.duplicate_enrollment_groups || counts?.duplicate_progress_groups || metrics[1]?.length) process.exitCode = 2;
}
main().catch(() => { console.error('Preflight gagal. Periksa koneksi dan izin SELECT database; kredensial dan detail error tidak dicetak.'); process.exitCode = 1; });
