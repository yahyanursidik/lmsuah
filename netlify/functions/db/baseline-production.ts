import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import {
  buildMigrationReference,
  migrationsFolder,
} from "./baseline-reference.js";
import { copyDatabaseUrl, type CopyManifest } from "./copy-target.js";
import {
  schemaCatalogSql,
  compareCatalogs,
  type SchemaCatalog,
} from "./schema-catalog.js";
import {
  migrationFiles,
  readMigrationHistory,
  verifyMigrationHistory,
  runAtomicMigrations,
} from "./atomic-migrations.js";
import { reconcileBaselineAndMigrate } from "./baseline-reconcile.js";

config({ quiet: true });
async function main() {
  const path = process.argv
    .find((arg) => arg.startsWith("--tested-copy="))
    ?.slice(14);
  if (!path || !process.env.DATABASE_URL)
    throw new Error("TESTED_COPY_REQUIRED");
  const manifest = JSON.parse(readFileSync(path, "utf8")) as CopyManifest;
  // Validates source endpoint/database and an isolated, non-default copy.
  const copy = neon(copyDatabaseUrl(process.env.DATABASE_URL, manifest));
  const files = migrationFiles(migrationsFolder);
  const expected = await buildMigrationReference(files.length - 1);
  const copyHistory = await readMigrationHistory(copy);
  verifyMigrationHistory(copyHistory, files);
  const copyResult = await copy.transaction(
    [copy.query(schemaCatalogSql, [])],
    { readOnly: true, fullResults: true },
  );
  if (
    copyHistory.length !== files.length ||
    compareCatalogs(
      expected.catalog,
      copyResult[0]!.rows[0]!.catalog as SchemaCatalog,
    ).length
  )
    throw new Error("COPY_NOT_VERIFIED");
  const source = neon(process.env.DATABASE_URL);
  const history = await readMigrationHistory(source);
  verifyMigrationHistory(history, files);
  const baseline = await buildMigrationReference(manifest.baselineLastIndex);
  const reference = history.length
    ? await buildMigrationReference(history.length - 1)
    : baseline;
  const inspect = await source.transaction(
    [
      source.query(schemaCatalogSql, []),
      source.query(
        `select exists(select 1 from enrollments group by user_id,program_id having count(*)>1) or exists(select 1 from lesson_progress group by user_id,lesson_id having count(*)>1) as duplicates`,
        [],
      ),
    ],
    { readOnly: true, fullResults: true },
  );
  const differences = compareCatalogs(
    reference.catalog,
    inspect[0]!.rows[0]!.catalog as SchemaCatalog,
  );
  console.log(
    JSON.stringify({
      mode: process.argv.includes("--approved")
        ? "approved-production"
        : "inspect-only",
      testedCopyBranch: manifest.targetBranchId,
      sourceBranch: manifest.sourceBranchId,
      historyEntries: history.length,
      schemaDifferences: differences,
      duplicates: inspect[1]!.rows[0]!.duplicates,
    }),
  );
  if (differences.length || inspect[1]!.rows[0]!.duplicates)
    throw new Error("SOURCE_NOT_READY");
  if (!process.argv.includes("--approved")) return;
  const result = history.length
    ? await runAtomicMigrations(source, migrationsFolder)
    : await reconcileBaselineAndMigrate(
        source,
        migrationsFolder,
        baseline.catalog,
        baseline.migrations.length,
      );
  const finalHistory = await readMigrationHistory(source);
  verifyMigrationHistory(finalHistory, files);
  const final = await source.transaction([source.query(schemaCatalogSql, [])], {
    readOnly: true,
    fullResults: true,
  });
  const remaining = compareCatalogs(
    expected.catalog,
    final[0]!.rows[0]!.catalog as SchemaCatalog,
  );
  const repeat = await runAtomicMigrations(source, migrationsFolder);
  console.log(
    JSON.stringify({
      result,
      finalHistoryEntries: finalHistory.length,
      remainingSchemaDifferences: remaining,
      repeatApplied: repeat.applied,
      applicationRowWrites: false,
      featureFlagsChanged: false,
    }),
  );
  if (
    remaining.length ||
    finalHistory.length !== files.length ||
    repeat.applied
  )
    throw new Error("SOURCE_VERIFICATION_FAILED");
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : "PRODUCTION_BASELINE_FAILED",
    }),
  );
  process.exitCode = 1;
});
