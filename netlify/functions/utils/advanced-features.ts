import { getTableColumns, getTableName, sql } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { lessonQuizDrafts, programPublications, programRevisionEvents, programRevisions, transcriptDocuments, transcriptVersionEvents, transcriptVersions } from '../db/schema/index.js';
import { db } from './db.js';
import { HttpError } from './http-error.js';

export type AdvancedFeature = 'privatePdf' | 'programRevisions';
const definitions = {
  privatePdf: { flag: 'LMS_PRIVATE_PDF_ENABLED', tables: [transcriptDocuments, transcriptVersions, transcriptVersionEvents],
    triggers: [['transcript_versions', 'transcript_version_immutable_guard']],
    indexes: ['transcript_versions_document_version_unique', 'transcript_versions_blob_key_unique', 'transcript_versions_one_published_unique'], constraints: [] as string[] },
  programRevisions: { flag: 'LMS_PROGRAM_REVISIONS_ENABLED', tables: [programRevisions, programPublications, programRevisionEvents, lessonQuizDrafts],
    triggers: [['program_revisions', 'program_revision_immutable_guard'], ['program_publications', 'program_publication_approved_guard']],
    indexes: ['program_revisions_program_version_unique', 'program_revisions_program_id_unique'], constraints: ['program_revisions_base_program_fk', 'program_publications_revision_program_fk'] },
};
export const featureRequested = (feature: AdvancedFeature) => process.env[definitions[feature].flag] === 'true';

/** Catalog-only check: safe even before migration 0010. No runtime DDL and no
 * cached success that could hide a disabled integrity trigger after deploy. */
export function featureReadinessQuery(feature: AdvancedFeature) {
  const definition = definitions[feature];
  const requirements = [
    ...definition.tables.flatMap(table => Object.values(getTableColumns(table)).map(column => ({ kind: 'column', table: getTableName(table), name: column.name }))),
    ...definition.triggers.map(([table, name]) => ({ kind: 'trigger', table, name })),
    ...definition.indexes.map(name => ({ kind: 'index', table: '', name })),
    ...definition.constraints.map(name => ({ kind: 'constraint', table: '', name })),
    ...definition.tables.flatMap(table => {
      const config = getTableConfig(table);
      return [...config.foreignKeys.map(key => key.getName()), ...config.checks.map(check => check.name)].map(name => ({ kind: 'constraint', table: getTableName(table), name }));
    }),
  ];
  return sql`select r.kind || ':' || r."table" || '.' || r.name as missing
    from jsonb_to_recordset(${JSON.stringify(requirements)}::jsonb) as r(kind text, "table" text, name text)
    where not case r.kind
      when 'column' then exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = r."table" and c.column_name = r.name)
      when 'trigger' then exists (select 1 from pg_trigger t where t.tgrelid = to_regclass('public.' || r."table") and t.tgname = r.name and t.tgenabled in ('O', 'A') and not t.tgisinternal)
      when 'index' then exists (select 1 from pg_index i where i.indexrelid = to_regclass('public.' || r.name) and i.indisvalid and i.indisunique)
      when 'constraint' then exists (select 1 from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public' and c.conname = r.name and c.convalidated and (r."table" = '' or c.conrelid = to_regclass('public.' || r."table")))
      else false end`;
}

export async function featureSchemaStatus(feature: AdvancedFeature) {
  const result = await db.execute(featureReadinessQuery(feature));
  const missing = result.rows.map(row => String(row.missing));
  return { ready: missing.length === 0, missing };
}

export async function featureReadiness(feature: AdvancedFeature) {
  const requested = featureRequested(feature);
  if (!requested) return { requested, available: false, reason: 'FLAG_DISABLED' as const };
  const schema = await featureSchemaStatus(feature);
  return { requested, available: schema.ready, reason: schema.ready ? null : 'MIGRATION_REQUIRED' as const };
}

export async function featureAvailable(feature: AdvancedFeature) {
  return (await featureReadiness(feature)).available;
}

export async function requireFeature(feature: AdvancedFeature) {
  const readiness = await featureReadiness(feature);
  if (!readiness.available) throw new HttpError(503,
    readiness.reason === 'MIGRATION_REQUIRED' ? 'Struktur atau pelindung integritas database belum lengkap. Terapkan migrasi yang disetujui dan jalankan pemeriksaan kesiapan.' : 'Fitur belum diaktifkan pada konfigurasi server.',
    readiness.reason || 'FEATURE_NOT_READY');
}
