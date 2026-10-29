import { getTableColumns, sql } from "drizzle-orm";
import { programs } from "../db/schema/index.js";

/** Reads stay compatible before additive program metadata migrations. */
export function programReadColumns() {
  const columns = getTableColumns(programs);
  return {
    ...columns,
    category: sql<string | null>`to_jsonb(${programs})->>'category'`.as('category'),
    coverImage: sql<string | null>`to_jsonb(${programs})->>'cover_image'`.as(
      "cover_image",
    ),
  };
}
