import type { Config } from '@netlify/functions';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createHandler } from './middleware/handler.js';
import { lessons } from './db/schema/index.js';
import { db } from './utils/db.js';
import { getDatabaseActorId, getOptionalAuth, requireContentUpdateAccess, logMutationAudit } from './utils/contentHelper.js';
import { validateBody } from './utils/validation.js';
import { HttpError } from './utils/http-error.js';
import { assertLegacyWorkspaceWritable, legacyWorkspaceGuardWrites } from './utils/program-snapshots.js';

export default createHandler(async request => {
  if (request.method !== 'POST') throw new HttpError(405, 'Metode tidak didukung');
  const session = await getOptionalAuth(request);
  const body = await validateBody(request, z.object({ programId: z.string().uuid(), ids: z.array(z.string().uuid()).min(1).max(2000) }));
  const items = await db.select().from(lessons).where(eq(lessons.programId, body.programId));
  const auth = requireContentUpdateAccess(session, items.some(item => item.status === 'published') ? 'published' : 'draft');
  await assertLegacyWorkspaceWritable(body.programId);
  if (new Set(body.ids).size !== body.ids.length || items.length !== body.ids.length || items.some(item => !body.ids.includes(item.id))) throw new HttpError(409, 'Daftar pertemuan berubah. Muat ulang sebelum mengurutkan.');
  await db.batch([
    db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${body.programId}`}, 0))`),
    ...legacyWorkspaceGuardWrites([body.programId]),
    db.execute(sql`select 1 / case when (select count(*) from ${lessons} where ${lessons.programId} = ${body.programId}::uuid) = ${body.ids.length}
      and (select count(*) from ${lessons} where ${lessons.programId} = ${body.programId}::uuid and ${inArray(lessons.id, body.ids)}) = ${body.ids.length} then 1 else 0 end as revision_guard`),
    ...body.ids.map((id, index) => db.update(lessons).set({ sequence: index + 1, updatedAt: new Date(), updatedBy: getDatabaseActorId(auth) }).where(and(eq(lessons.id, id), eq(lessons.programId, body.programId)))),
  ]);
  logMutationAudit('UPDATE', 'lesson-order', body.programId, auth.userId, { ids: body.ids });
  return { id: body.programId };
});
export const config: Config = { path: '/api/lesson-order' };
