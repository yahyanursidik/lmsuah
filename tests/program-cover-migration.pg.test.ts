// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { programs } from "../netlify/functions/db/schema";
import { programReadColumns } from "../netlify/functions/utils/program-columns";
import {
  revisionSnapshotSchema,
  revisionHash,
} from "../netlify/functions/utils/revision-content";

describe("Program cover additive migration and immutable revisions", () => {
  it("keeps legacy reads working before migration and preserves rows after upgrade", async () => {
    const database = new PGlite();
    const directory = "netlify/functions/db/migrations";
    try {
      for (const file of readdirSync(directory)
        .filter((f) => /^\d+_.+\.sql$/.test(f) && Number(f.slice(0, 4)) < 14)
        .sort())
        await database.exec(readFileSync(`${directory}/${file}`, "utf8"));
      await database.exec(
        "insert into programs(slug,title,status) values ('legacy-cover','Program Lama','published')",
      );
      const db = drizzle(database);
      const before = await db.select(programReadColumns()).from(programs);
      expect(before[0].coverImage).toBeNull();
      expect(before[0].title).toBe("Program Lama");
      await database.exec(
        readFileSync(`${directory}/0014_program_cover_image.sql`, "utf8"),
      );
      await database.exec(
        "update programs set cover_image='https://storage.example.test/cover.webp'",
      );
      const after = await db.select(programReadColumns()).from(programs);
      expect(after[0].id).toBe(before[0].id);
      expect(after[0].title).toBe(before[0].title);
      expect(after[0].coverImage).toContain("cover.webp");
      await database.exec("update programs set cover_image=null");
      expect(
        (await db.select(programReadColumns()).from(programs))[0].coverImage,
      ).toBeNull();
    } finally {
      await database.close();
    }
  }, 120000);
  it("preserves old snapshots without a cover and includes cover changes in the review hash", () => {
    const old = {
      schemaVersion: 1,
      program: {
        id: crypto.randomUUID(),
        slug: "program",
        title: "Program",
        description: "Deskripsi",
      },
      chapters: [],
      series: [],
      lessons: [],
    };
    const parsed = revisionSnapshotSchema.parse(old);
    expect(parsed.program).not.toHaveProperty("coverImage");
    const updated = revisionSnapshotSchema.parse({
      ...old,
      program: {
        ...old.program,
        coverImage: "https://storage.example.test/cover.webp",
      },
    });
    expect(revisionHash(updated)).not.toBe(revisionHash(parsed));
    expect(
      revisionSnapshotSchema.safeParse({
        ...old,
        program: { ...old.program, coverImage: "javascript:bad" },
      }).success,
    ).toBe(false);
  });
});
