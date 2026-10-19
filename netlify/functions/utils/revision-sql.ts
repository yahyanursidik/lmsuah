import { sql } from 'drizzle-orm';

export const revisionBaseGuardSql = (programId: string, baseRevisionId: string | null) => sql`select 1 / case when
  (select revision_id from program_publications where program_id = ${programId}::uuid) is not distinct from ${baseRevisionId}::uuid
  then 1 else 0 end as base_guard`;

export const legacyProgramGuardSql = (programId: string) => sql`select 1 / case when
  exists(select 1 from programs where id = ${programId}::uuid and status = 'published')
  or exists(select 1 from program_publications where program_id = ${programId}::uuid)
  or exists(select 1 from program_revisions where program_id = ${programId}::uuid and status <> 'cancelled')
  then 0 else 1 end as workspace_guard`;
