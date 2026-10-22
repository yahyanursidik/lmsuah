import { getTableColumns, sql } from "drizzle-orm";
import { programs } from "../db/schema/index.js";

/** Reads stay compatible before the additive cover migration is applied. */
export function programReadColumns() {
  const columns = getTableColumns(programs);
  return {
    ...columns,
    coverImage: sql<string | null>`to_jsonb(${programs})->>'cover_image'`.as(
      "cover_image",
    ),
  };
}
