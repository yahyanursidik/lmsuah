import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL tidak ditemukan');
}

const sql = neon(process.env.DATABASE_URL);

const programColumns = await sql`
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'programs'
  order by ordinal_position
`;

const migrationState = await sql`
  select
    to_regclass('public.programs')::text as programs_table,
    to_regclass('drizzle.__drizzle_migrations')::text as migrations_table
`;

console.log(JSON.stringify({ migrationState, programColumns }, null, 2));
