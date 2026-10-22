import type { NeonQueryFunction } from "@neondatabase/serverless";
import { schemaCatalogSql, type SchemaCatalog } from "./schema-catalog.js";
import {
  createJournalSql,
  historyGuardSql,
  migrationFiles,
} from "./atomic-migrations.js";

/** Record a catalog-verified legacy baseline and apply pending DDL atomically.
 * No application row INSERT/UPDATE/DELETE is generated. Failure rolls back both
 * baseline journal and pending migrations. Caller must verify the tested copy. */
export async function reconcileBaselineAndMigrate(
  client: NeonQueryFunction<false, false>,
  folder: string,
  catalog: SchemaCatalog,
  baselineCount: number,
) {
  const files = migrationFiles(folder);
  if (baselineCount !== 10 || files.length < baselineCount)
    throw new Error("INVALID_BASELINE");
  const queries = [
    client.query("set local lock_timeout = '8s'", []),
    client.query("set local statement_timeout = '60s'", []),
    client.query(
      "select pg_advisory_xact_lock(hashtextextended('lms:database-migrations',0))",
      [],
    ),
    client.query(
      `with reference as (${schemaCatalogSql}) select 1 / case when catalog=$1::jsonb then 1 else 0 end as schema_guard from reference`,
      [JSON.stringify(catalog)],
    ),
    client.query("create schema if not exists drizzle", []),
    client.query(createJournalSql, []),
    client.query(historyGuardSql, ["[]"]),
    ...files
      .slice(0, baselineCount)
      .map((file) =>
        client.query(
          "insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)",
          [file.hash, file.folderMillis],
        ),
      ),
    ...files
      .slice(baselineCount)
      .flatMap((file) => [
        ...file.sql
          .filter((statement) => statement.trim())
          .map((statement) => client.query(statement, [])),
        client.query(
          "insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)",
          [file.hash, file.folderMillis],
        ),
      ]),
  ];
  await client.transaction(queries, { fullResults: true });
  return {
    baselineRecorded: baselineCount,
    applied: files.length - baselineCount,
    total: files.length,
  };
}
