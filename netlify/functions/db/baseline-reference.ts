import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { migrationFiles } from './atomic-migrations.js';
import { schemaCatalogSql, type SchemaCatalog } from './schema-catalog.js';

export const migrationsFolder = 'netlify/functions/db/migrations';
export async function buildMigrationReference(lastIndex: number) {
  const journal = JSON.parse(readFileSync(`${migrationsFolder}/meta/_journal.json`, 'utf8')) as { entries: Array<{ idx: number; tag: string; when: number }> };
  const migrations = migrationFiles(migrationsFolder);
  const database = new PGlite();
  try {
    for (const entry of journal.entries.filter(entry => entry.idx <= lastIndex)) {
      await database.exec(readFileSync(`${migrationsFolder}/${entry.tag}.sql`, 'utf8'));
    }
    const result = await database.query<{ catalog: SchemaCatalog }>(schemaCatalogSql);
    return { catalog: result.rows[0]!.catalog, migrations: journal.entries.filter(entry => entry.idx <= lastIndex).map(entry => ({ ...entry, hash: migrations[entry.idx]!.hash })) };
  } finally { await database.close(); }
}
