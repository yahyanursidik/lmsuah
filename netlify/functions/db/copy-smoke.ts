import { config } from 'dotenv';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { copyDatabaseUrl, type CopyManifest } from './copy-target.js';
import { migrationFiles, readMigrationHistory, verifyMigrationHistory } from './atomic-migrations.js';
import { migrationsFolder, buildMigrationReference } from './baseline-reference.js';
import { compareCatalogs, schemaCatalogSql, type SchemaCatalog } from './schema-catalog.js';

// All records below are synthetic, including users without credentials. No
// source accounts, passwords, sessions, or tokens are read. The outer transaction
// ALWAYS aborts, even when every assertion passes.
export const copyIntegritySql = `do $$
declare
  token text := gen_random_uuid()::text;
  author_id text; reviewer_id text; publisher_id text;
  p uuid := gen_random_uuid(); other_p uuid := gen_random_uuid();
  lesson uuid := gen_random_uuid(); revision uuid := gen_random_uuid();
  document uuid := gen_random_uuid(); pdf_one uuid := gen_random_uuid(); pdf_two uuid := gen_random_uuid();
begin
  author_id := 'copy-smoke-author-'||token;
  reviewer_id := 'copy-smoke-reviewer-'||token;
  publisher_id := 'copy-smoke-publisher-'||token;
  insert into public."user"(id,name,email,email_verified,created_at,updated_at)
    select id,'Migration fixture',id||'@example.test',true,now(),now()
    from unnest(array[author_id,reviewer_id,publisher_id]) as id;
  insert into programs(id,slug,title,status) values (p,'copy-smoke-'||p,'Migration fixture','draft'),(other_p,'copy-smoke-'||other_p,'Other fixture','draft');
  insert into lessons(id,program_id,slug,title,sequence,status) values (lesson,p,'copy-smoke-'||lesson,'Fixture',1,'draft');
  insert into program_revisions(id,program_id,version,snapshot,content_hash,change_note,submitted_by)
    values (revision,p,1,'{"fixture":true}',repeat('a',64),'Fixture',author_id);
  update program_revisions set status='submitted' where id=revision;
  begin
    update program_revisions set snapshot='{"tampered":true}' where id=revision;
    raise exception 'Mutable submitted revision accepted';
  exception when check_violation then null; end;
  begin
    update program_revisions set status='approved',reviewed_by=author_id where id=revision;
    raise exception 'Self-approval accepted';
  exception when check_violation then null; end;
  update program_revisions set status='approved',reviewed_by=reviewer_id,reviewed_at=now() where id=revision;
  begin
    insert into program_publications(program_id,revision_id,snapshot,published_by) values(p,revision,'{"tampered":true}',publisher_id);
    raise exception 'Unapproved publication payload accepted';
  exception when check_violation then null; end;
  insert into program_publications(program_id,revision_id,snapshot,published_by) values(p,revision,'{"fixture":true}',publisher_id);
  update program_revisions set status='published',published_at=now() where id=revision;
  begin
    insert into program_revisions(program_id,base_revision_id,version,snapshot,content_hash,change_note,submitted_by)
      values(other_p,revision,1,'{}',repeat('b',64),'Cross-program fixture',author_id);
    raise exception 'Cross-program revision base accepted';
  exception when foreign_key_violation then null; end;
  insert into enrollments(user_id,program_id,status) values(author_id,p,'active');
  begin
    insert into enrollments(user_id,program_id,status) values(author_id,p,'active');
    raise exception 'Duplicate enrollment accepted';
  exception when unique_violation then null; end;
  insert into lesson_progress(user_id,lesson_id,last_position_seconds,is_completed) values(author_id,lesson,42,true);
  begin
    insert into lesson_progress(user_id,lesson_id) values(author_id,lesson);
    raise exception 'Duplicate progress accepted';
  exception when unique_violation then null; end;
  insert into transcript_documents(id,lesson_id,title,created_by) values(document,lesson,'Fixture PDF',author_id);
  insert into transcript_versions(id,document_id,version,blob_key,filename,size_bytes,sha256,uploaded_by)
    values(pdf_one,document,1,'copy-smoke/'||pdf_one,'fixture.pdf',100,repeat('c',64),author_id),
      (pdf_two,document,2,'copy-smoke/'||pdf_two,'fixture.pdf',101,repeat('d',64),author_id);
  begin
    update transcript_versions set blob_key='tampered' where id=pdf_one;
    raise exception 'Mutable PDF content accepted';
  exception when check_violation then null; end;
  update transcript_versions set status='submitted' where id in(pdf_one,pdf_two);
  begin
    update transcript_versions set status='approved',reviewed_by=author_id where id=pdf_one;
    raise exception 'Self-approved PDF accepted';
  exception when check_violation then null; end;
  update transcript_versions set status='approved',reviewed_by=reviewer_id where id in(pdf_one,pdf_two);
  update transcript_versions set status='published' where id=pdf_one;
  begin
    update transcript_versions set status='published' where id=pdf_two;
    raise exception 'Two published PDF versions accepted';
  exception when unique_violation then null; end;
  begin
    update transcript_versions set status='archived' where id=pdf_one;
    update transcript_versions set status='published' where id=pdf_two;
    raise exception 'Simulated replacement failure' using errcode='ZX002';
  exception when sqlstate 'ZX002' then null; end;
  if (select status from transcript_versions where id=pdf_one) <> 'published' or
     (select status from transcript_versions where id=pdf_two) <> 'approved' then
    raise exception 'Failed PDF replacement damaged previous version';
  end if;
  insert into program_revision_events(revision_id,actor_id,action,note) values(revision,publisher_id,'published','Fixture');
  insert into transcript_version_events(version_id,actor_id,action,note) values(pdf_one,publisher_id,'published','Fixture');
  raise exception 'COPY_INTEGRITY_ASSERTIONS_PASSED_ROLLBACK' using errcode='ZX001';
end $$`;

export async function runCopySmoke(client: NeonQueryFunction<false, false>) {
  const files = migrationFiles(migrationsFolder);
  const reference = await buildMigrationReference(files.length - 1);
  const history = await readMigrationHistory(client); verifyMigrationHistory(history, files);
  if (history.length !== files.length) throw new Error('COPY_MIGRATIONS_INCOMPLETE');
  const tables = [...new Set(reference.catalog.columns.map(column => column.table))].sort();
  const countsSql = tables.map(table => `select '${table}' as table_name,count(*)::int as row_count from public."${table}"`).join(' union all ') + ' order by table_name';
  const before = await client.transaction([client.query(countsSql)], { readOnly: true, fullResults: true });
  const probe = `copy_rollback_probe_${randomUUID().replaceAll('-', '')}`;
  let ddlRollback = false; let integrityRollback = false;
  try {
    await client.transaction([
      client.query(`create table public.${probe}(id integer primary key)`),
      client.query(`insert into public.${probe} values (1)`),
      client.query('insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)', ['copy-smoke-rollback-only', 9999999999999]),
      client.query('select 1/0 as intentional_failure'),
    ]);
  } catch (error) { if ((error as { code?: string }).code !== '22012') throw error; ddlRollback = true; }
  if (!ddlRollback) throw new Error('COPY_DDL_ROLLBACK_FAILED');
  try { await client.transaction([client.query(copyIntegritySql)]); }
  catch (error) { if ((error as { code?: string }).code !== 'ZX001') throw error; integrityRollback = true; }
  if (!integrityRollback) throw new Error('COPY_INTEGRITY_ROLLBACK_FAILED');
  const after = await client.transaction([
    client.query(countsSql), client.query(schemaCatalogSql),
    client.query('select to_regclass($1) is null as absent', [`public.${probe}`]),
  ], { readOnly: true, fullResults: true });
  const ledgerAfter = await readMigrationHistory(client);
  if (JSON.stringify(before[0]!.rows) !== JSON.stringify(after[0]!.rows) ||
    JSON.stringify(history) !== JSON.stringify(ledgerAfter) || !after[2]!.rows[0]?.absent ||
    compareCatalogs(reference.catalog, after[1]!.rows[0]!.catalog as SchemaCatalog).length) throw new Error('COPY_SMOKE_RESIDUE');
  return { ddlAndJournalRollback: true, independentReviewAndImmutability: true, crossProgramForeignKey: true,
    enrollmentAndProgressUniqueness: true, privatePdfReviewAndReplacementRollback: true,
    allTableCountsUnchanged: true, journalUnchanged: true, fixturesPersisted: false, sourceWrites: false };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  config({ quiet: true });
  (async () => {
    const path = process.argv.find(arg => arg.startsWith('--manifest='))?.slice('--manifest='.length);
    if (!path || !process.env.DATABASE_URL || !process.argv.includes('--rollback-copy-only')) throw new Error('COPY_SMOKE_APPROVAL_REQUIRED');
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as CopyManifest;
    const result = await runCopySmoke(neon(copyDatabaseUrl(process.env.DATABASE_URL, manifest)));
    console.log(JSON.stringify({ targetBranchId: manifest.targetBranchId, ...result }));
  })().catch(error => {
    console.error(JSON.stringify({ error: error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'COPY_SMOKE_FAILED',
      databaseCode: typeof error?.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : undefined, sourceWrites: false }));
    process.exitCode = 1;
  });
}
