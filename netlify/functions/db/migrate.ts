import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { migrationPlan } from './migration-plan.js';
import { runAtomicMigrations } from './atomic-migrations.js';

// Load .env
dotenv.config({ quiet: true });

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }
  if (!process.argv.includes('--approved')) throw new Error('APPROVAL_REQUIRED: Jalankan db:preflight, tinjau backup/target database, lalu tambahkan --approved hanya setelah migrasi disetujui.');

  console.log('Running migrations...');
  const sql = neon(process.env.DATABASE_URL);

  const [catalog] = await sql.transaction([sql.query("select to_regclass('public.programs') is not null or to_regclass('public.user') is not null or to_regclass('public.lessons') is not null as has_application, to_regclass('drizzle.__drizzle_migrations') is not null as has_journal")], { readOnly: true });
  const latest = catalog[0]!.has_journal ? Number((await sql.transaction([sql.query('select coalesce(max(created_at),0)::text as latest from drizzle.__drizzle_migrations')], { readOnly: true }))[0]![0]!.latest) : 0;
  if (!migrationPlan(Boolean(catalog[0]!.has_application), latest, []).canRunMigrator) throw new Error('BASELINE_REQUIRED: Tabel aplikasi ada tanpa riwayat migrasi. Rekonsiliasi baseline di salinan database dahulu; jangan menjalankan ulang migrasi awal.');
  if (catalog[0]!.has_application) {
    const [duplicates] = await sql.transaction([sql.query(`select
      exists(select 1 from enrollments group by user_id,program_id having count(*)>1)
      or exists(select 1 from lesson_progress group by user_id,lesson_id having count(*)>1) as found`)], { readOnly: true });
    if (duplicates[0]!.found) throw new Error('MIGRATION_DATA_CONFLICT: Ada enrollment/progres duplikat. Rekonsiliasi riwayat secara terpisah sebelum menambahkan indeks unik; tidak ada data yang dihapus.');
  }
  await runAtomicMigrations(sql, 'netlify/functions/db/migrations');
  console.log('Migrations completed successfully.');
};

runMigration().catch(error => {
  const message = error instanceof Error && /^(APPROVAL_REQUIRED|BASELINE_REQUIRED|MIGRATION_DATA_CONFLICT|MIGRATION_HISTORY_MISMATCH)/.test(error.message) ? error.message : 'Migrasi gagal. Periksa target, izin, dan baseline database; detail koneksi tidak dicetak.';
  console.error(message);
  process.exitCode = 1;
});
