// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isolatedHttpDatabase } from "./helpers/neon-pglite";
import { reconcileBaselineAndMigrate } from "../netlify/functions/db/baseline-reconcile";
import {
  readMigrationHistory,
  migrationFiles,
  runAtomicMigrations,
} from "../netlify/functions/db/atomic-migrations";
import {
  schemaCatalogSql,
  type SchemaCatalog,
} from "../netlify/functions/db/schema-catalog";

const folder = "netlify/functions/db/migrations";
describe("Approved baseline reconciliation", () => {
  it("rolls back baseline journal and all DDL on failure, then preserves legacy rows on success", async () => {
    const db = await isolatedHttpDatabase({ through: 9 });
    try {
      await db.client.exec(
        "insert into programs(slug,title,status) values ('baseline-test','Existing program','draft')",
      );
      const catalog = (
        await db.client.query<{ catalog: SchemaCatalog }>(schemaCatalogSql)
      ).rows[0]!.catalog;
      db.intercept.failStatement = (sql) =>
        sql.includes('ADD COLUMN "cover_image"');
      await expect(
        reconcileBaselineAndMigrate(db.httpClient, folder, catalog, 10),
      ).rejects.toThrow("Simulated");
      expect(await readMigrationHistory(db.httpClient)).toEqual([]);
      expect(
        (
          await db.client.query(
            "select to_regclass('public.program_revisions') as new_table",
          )
        ).rows[0]!.new_table,
      ).toBeNull();
      const total = migrationFiles(folder).length;
      expect(
        await reconcileBaselineAndMigrate(db.httpClient, folder, catalog, 10),
      ).toEqual({ baselineRecorded: 10, applied: total - 10, total });
      expect(await readMigrationHistory(db.httpClient)).toHaveLength(total);
      expect(
        (await db.client.query("select slug,title,cover_image from programs"))
          .rows,
      ).toEqual([
        { slug: "baseline-test", title: "Existing program", cover_image: null },
      ]);
      expect(await runAtomicMigrations(db.httpClient, folder)).toEqual({
        applied: 0,
        total,
      });
    } finally {
      await db.client.close();
    }
  }, 120000);
  it("refuses catalog drift before recording any baseline", async () => {
    const db = await isolatedHttpDatabase({ through: 9 });
    try {
      const catalog = (
        await db.client.query<{ catalog: SchemaCatalog }>(schemaCatalogSql)
      ).rows[0]!.catalog;
      await db.client.exec("alter table programs add column unexpected text");
      await expect(
        reconcileBaselineAndMigrate(db.httpClient, folder, catalog, 10),
      ).rejects.toMatchObject({ code: "22012" });
      expect(await readMigrationHistory(db.httpClient)).toEqual([]);
    } finally {
      await db.client.close();
    }
  }, 120000);
});
