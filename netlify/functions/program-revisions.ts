import type { Config } from '@netlify/functions';
import { programReadColumns } from "./utils/program-columns.js";
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createHandler } from './middleware/handler.js';
import { ForbiddenError, requireAuth, requirePermission } from './middleware/auth.js';
import { programs, programPublications, programRevisions, programRevisionEvents, user } from './db/schema/index.js';
import { db } from './utils/db.js';
import { requireFeature } from './utils/advanced-features.js';
import { canReadDrafts } from './utils/content-policy.js';
import { HttpError } from './utils/http-error.js';
import { validateBody } from './utils/validation.js';
import { parseQueryParams, logMutationAudit } from './utils/contentHelper.js';
import { buildSourceSnapshot, getProgramPublication } from './utils/program-snapshots.js';
import { revisionHash, revisionPartHash, validateRevisionForSubmission } from './utils/revision-content.js';
import { normalizeRevisionSnapshot, revisionAnchorWrites, revisionSourceWrites, revisionPdfWrites, validateRevisionReferencesForPublication } from './utils/revision-persistence.js';
import { nextProgramRevisionStatus, type ProgramRevisionStatus, type ProgramRevisionAction } from '../../shared/program-revision-policy.js';
import type { ProgramPublicationSnapshot } from '../../shared/program-publication.js';
import { revisionBaseGuardSql } from './utils/revision-sql.js';

const createSchema = z.object({ programId: z.string().uuid(), note: z.string().trim().min(3).max(2000), fromRevisionId: z.string().uuid().optional(), includeDrafts: z.boolean().optional() });
const actionSchema = z.object({ action: z.enum(['save', 'submit', 'approve', 'request_revision', 'publish', 'cancel', 'restore']), note: z.string().trim().min(3).max(2000), expectedHash: z.string().regex(/^[a-f0-9]{64}$/), snapshot: z.unknown().optional() });

export default createHandler(async request => {
  const session = await requireAuth(request);
  if (!canReadDrafts(session)) throw new ForbiddenError('Revisi privat hanya untuk tim konten dan reviewer.');
  await requireFeature('programRevisions');
  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean)[2];
  if (request.method === 'GET') {
    await requirePermission(session, 'program.read');
    if (id) {
      if (!z.string().uuid().safeParse(id).success) throw new HttpError(400, 'ID revisi tidak valid.');
      const [revision] = await db.select().from(programRevisions).where(eq(programRevisions.id, id)).limit(1);
      if (!revision) throw new HttpError(404, 'Revisi tidak ditemukan.');
      const events = await db.select({ id: programRevisionEvents.id, actorId: programRevisionEvents.actorId, actorName: user.name, action: programRevisionEvents.action, note: programRevisionEvents.note, createdAt: programRevisionEvents.createdAt }).from(programRevisionEvents).leftJoin(user, eq(user.id, programRevisionEvents.actorId)).where(eq(programRevisionEvents.revisionId, id)).orderBy(asc(programRevisionEvents.createdAt), asc(programRevisionEvents.id));
      const publication = await getProgramPublication(revision.programId, true);
      return { ...revision, events, isCurrentPublication: publication?.revisionId === revision.id, programStatus: publication?.programStatus,
        baseChanged: ['capturing', 'draft', 'submitted', 'approved'].includes(revision.status) && (revision.baseRevisionId || null) !== (publication?.revisionId || null) };
    }
    const programId = z.string().uuid().safeParse(url.searchParams.get('programId'));
    if (!programId.success) throw new HttpError(400, 'programId UUID diperlukan.');
    const query = parseQueryParams(url, [], []);
    const where = eq(programRevisions.programId, programId.data);
    const [items, total, publication] = await Promise.all([
      db.select({ id: programRevisions.id, programId: programRevisions.programId, baseRevisionId: programRevisions.baseRevisionId, version: programRevisions.version, status: programRevisions.status, contentHash: programRevisions.contentHash, changeNote: programRevisions.changeNote, submittedBy: programRevisions.submittedBy, reviewedBy: programRevisions.reviewedBy, reviewNote: programRevisions.reviewNote, createdAt: programRevisions.createdAt, publishedAt: programRevisions.publishedAt }).from(programRevisions).where(where).orderBy(desc(programRevisions.version)).limit(query.limit).offset(query.offset),
      db.select({ count: count() }).from(programRevisions).where(where),
      getProgramPublication(programId.data, true),
    ]);
    return { items: items.map(item => ({ ...item, isCurrentPublication: publication?.revisionId === item.id })), total: total[0]?.count || 0, page: query.page, limit: query.limit };
  }
  if (session.isDevelopmentDemo) throw new HttpError(409, 'Gunakan akun tim nyata untuk menyimpan dan mereview versi program.');
  if (request.method === 'POST' && !id) {
    await requirePermission(session, 'program.update');
    const body = await validateBody(request, createSchema);
    const [program] = await db.select(programReadColumns()).from(programs).where(eq(programs.id, body.programId)).limit(1);
    if (!program) throw new HttpError(404, 'Program tidak ditemukan.');
    const [previous] = body.fromRevisionId ? await db.select().from(programRevisions).where(and(eq(programRevisions.id, body.fromRevisionId), eq(programRevisions.programId, body.programId))).limit(1) : [];
    if (body.fromRevisionId && !previous) throw new HttpError(404, 'Versi sumber tidak ditemukan dalam program ini.');
    const publication = await getProgramPublication(body.programId, true);
    const base = previous?.snapshot || publication?.snapshot;
    const placeholder: ProgramPublicationSnapshot = structuredClone(base || { schemaVersion: 1, program: { id: program.id, title: program.title, slug: program.slug, description: program.description }, chapters: [], series: [], lessons: [] });
    const initialHash = revisionHash(placeholder);
    const revisionId = crypto.randomUUID();
    const [, , result] = await db.batch([
      db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${body.programId}`}, 0))`),
      db.execute(revisionBaseGuardSql(body.programId, publication?.revisionId || null)),
      db.execute(sql`insert into program_revisions (id, program_id, base_revision_id, version, status, snapshot, content_hash, change_note, submitted_by)
        select ${revisionId}::uuid, ${body.programId}::uuid, ${publication?.revisionId || null}::uuid, coalesce(max(version), 0) + 1, 'capturing', ${JSON.stringify(placeholder)}::jsonb, ${initialHash}, ${body.note}, ${session.userId}
        from program_revisions where program_id = ${body.programId}::uuid returning version`),
      db.insert(programRevisionEvents).values({ revisionId, actorId: session.userId, action: 'create', note: body.note }),
    ]);
    try {
      // The capturing row freezes all legacy writes under the program lock.
      // Publishers also wait until capture is complete, so multi-query source
      // reads cannot be interleaved with a source synchronization.
      const source = structuredClone(base || await buildSourceSnapshot(body.programId, body.includeDrafts ?? program.status === 'draft'));
      const snapshot = await normalizeRevisionSnapshot(source, publication?.snapshot || source, body.programId);
      const hash = revisionHash(snapshot);
      await db.batch([
        db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${body.programId}`}, 0))`),
        db.execute(sql`select 1 / case when exists(select 1 from program_revisions where id = ${revisionId}::uuid and status = 'capturing' and content_hash = ${initialHash}) then 1 else 0 end as capture_guard`),
        ...revisionAnchorWrites(snapshot, session.userId),
        db.update(programRevisions).set({ snapshot, contentHash: hash, status: 'draft' }).where(eq(programRevisions.id, revisionId)),
        db.insert(programRevisionEvents).values({ revisionId, actorId: session.userId, action: 'capture', note: 'Snapshot versi kerja berhasil disiapkan tanpa mengubah versi publik.' }),
      ]);
      return { id: revisionId, programId: body.programId, version: result.rows[0]?.version, status: 'draft', contentHash: hash, snapshot };
    } catch (cause) {
      await db.batch([
        db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${body.programId}`}, 0))`),
        db.update(programRevisions).set({ status: 'cancelled' }).where(and(eq(programRevisions.id, revisionId), eq(programRevisions.status, 'capturing'))),
        db.insert(programRevisionEvents).values({ revisionId, actorId: session.userId, action: 'capture_failed', note: 'Persiapan snapshot gagal; tidak ada versi publik yang diubah.' }),
      ]).catch(() => undefined);
      throw cause;
    }
  }
  if (request.method === 'PATCH' && id) {
    if (!z.string().uuid().safeParse(id).success) throw new HttpError(400, 'ID revisi tidak valid.');
    const body = await validateBody(request, actionSchema);
    const permission = ['approve', 'request_revision'].includes(body.action) ? 'program.review' : ['publish', 'restore'].includes(body.action) ? 'program.publish' : 'program.update';
    await requirePermission(session, permission);
    const [revision] = await db.select().from(programRevisions).where(eq(programRevisions.id, id)).limit(1);
    if (!revision) throw new HttpError(404, 'Revisi tidak ditemukan.');
    if (revision.contentHash !== body.expectedHash) throw new HttpError(409, 'Isi revisi berubah. Muat ulang sebelum melanjutkan.', 'REVISION_CONFLICT');
    const lock = db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${revision.programId}`}, 0))`);
    const guard = db.execute(sql`select 1 / case when exists (select 1 from program_revisions where id = ${id}::uuid and status = ${revision.status} and content_hash = ${body.expectedHash}) then 1 else 0 end as revision_guard`);
    if (body.action === 'save') {
      if (revision.status !== 'draft') throw new HttpError(409, 'Snapshot yang sudah diajukan tidak dapat diubah. Buat draft revisi baru.');
      const snapshot = await normalizeRevisionSnapshot(body.snapshot, revision.snapshot, revision.programId);
      const meetingContent = (value: typeof snapshot) => value.lessons.map(lesson => ({ id: lesson.id, programId: lesson.programId, chapterId: lesson.chapterId, slug: lesson.slug, title: lesson.title, sequence: lesson.sequence, date: lesson.date, description: lesson.description, status: lesson.status, materials: lesson.materials, markers: lesson.markers }));
      if (revisionPartHash(meetingContent(snapshot)) !== revisionPartHash(meetingContent(revision.snapshot))) await requirePermission(session, 'lesson.update');
      if (snapshot.lessons.some(lesson => !revision.snapshot.lessons.some(previous => previous.id === lesson.id))) await requirePermission(session, 'lesson.create');
      for (const lesson of snapshot.lessons) {
        const previous = revision.snapshot.lessons.find(item => item.id === lesson.id)?.quiz;
        if (lesson.quiz?.id !== previous?.id) await requirePermission(session, previous ? 'quiz.update' : 'quiz.create');
      }
      const hash = revisionHash(snapshot);
      await db.batch([lock, guard, ...revisionAnchorWrites(snapshot, session.userId), db.update(programRevisions).set({ snapshot, contentHash: hash, changeNote: body.note }).where(eq(programRevisions.id, id)), db.insert(programRevisionEvents).values({ revisionId: id, actorId: session.userId, action: 'save', note: body.note })]);
      return { id, status: 'draft', contentHash: hash, snapshot };
    }
    if (body.action === 'restore') {
      const publication = await getProgramPublication(revision.programId, true);
      if (publication?.revisionId !== id) throw new HttpError(409, 'Hanya versi publik saat ini yang dapat ditampilkan kembali.');
      await db.batch([lock, guard, db.update(programs).set({ status: 'published', updatedBy: session.userId, updatedAt: new Date() }).where(eq(programs.id, revision.programId)), db.insert(programRevisionEvents).values({ revisionId: id, actorId: session.userId, action: 'restore', note: body.note })]);
      return { id, status: revision.status };
    }
    let next: ProgramRevisionStatus;
    try { next = nextProgramRevisionStatus(revision.status as ProgramRevisionStatus, body.action as ProgramRevisionAction, session.userId, revision.submittedBy); }
    catch { throw new HttpError(409, 'Tindakan tidak sesuai status revisi atau persetujuan harus dilakukan reviewer independen.'); }
    if (body.action === 'submit' || body.action === 'publish') {
      validateRevisionForSubmission(revision.snapshot);
      await validateRevisionReferencesForPublication(revision.snapshot);
    }
    if (body.action === 'approve') {
      await requirePermission(session, 'lesson.review');
      if (revision.snapshot.lessons.some(lesson => lesson.quiz?.isPublished)) await requirePermission(session, 'quiz.review');
      const edits = await db.select({ actorId: programRevisionEvents.actorId }).from(programRevisionEvents).where(and(eq(programRevisionEvents.revisionId, id), inArray(programRevisionEvents.action, ['create', 'save', 'submit'])));
      if (edits.some(edit => edit.actorId === session.userId)) throw new ForbiddenError('Penulis atau penyunting revisi tidak dapat menyetujui revisi yang sama.');
    }
    if (['approve', 'publish', 'submit'].includes(body.action)) {
      const publication = await getProgramPublication(revision.programId, true);
      if ((publication?.revisionId || null) !== (revision.baseRevisionId || null)) throw new HttpError(409, 'Versi publik berubah sejak revisi dibuat. Simpan perubahan lalu salin ke draft baru berbasis versi publik terbaru dan lakukan review ulang.', 'BASE_REVISION_CHANGED');
    }
    if (body.action === 'publish') {
      await requirePermission(session, 'lesson.publish');
      if (revision.snapshot.lessons.some(lesson => lesson.quiz?.isPublished)) await requirePermission(session, 'quiz.publish');
      const writes = await revisionSourceWrites(revision.snapshot, session.userId);
      const pdf = await revisionPdfWrites(revision.snapshot, session.userId);
      if (pdf.publishesPdf) {
        await requireFeature('privatePdf');
        await requirePermission(session, 'transcript.publish');
      }
      await db.batch([
        lock, guard,
        db.execute(revisionBaseGuardSql(revision.programId, revision.baseRevisionId || null)),
        db.execute(sql`select 1 / case when not exists(select 1 from program_revisions where program_id = ${revision.programId}::uuid and status = 'capturing') then 1 else 0 end as capture_guard`),
        db.execute(sql`select 1 / case when not exists (select 1 from program_publications p inner join program_revisions r on r.id = p.revision_id where p.program_id = ${revision.programId}::uuid and r.version >= ${revision.version}) then 1 else 0 end as publication_order_guard`),
        ...pdf.writes, ...writes,
        db.execute(sql`with previous as (update program_revisions set status = 'superseded' where program_id = ${revision.programId}::uuid and status = 'published' returning id)
          insert into program_revision_events (revision_id, actor_id, action, note) select id, ${session.userId}, 'supersede', ${`Digantikan versi ${revision.version}.`} from previous`),
        db.insert(programPublications).values({ programId: revision.programId, revisionId: id, snapshot: revision.snapshot, publishedBy: session.userId }).onConflictDoUpdate({ target: programPublications.programId, set: { revisionId: id, snapshot: revision.snapshot, publishedBy: session.userId, publishedAt: new Date() } }),
        db.update(programRevisions).set({ status: 'published', publishedAt: new Date() }).where(eq(programRevisions.id, id)),
        db.insert(programRevisionEvents).values({ revisionId: id, actorId: session.userId, action: 'publish', note: body.note }),
      ]);
    } else await db.batch([lock, guard,
      ...(['approve', 'submit'].includes(body.action) ? [db.execute(revisionBaseGuardSql(revision.programId, revision.baseRevisionId || null))] : []),
      db.update(programRevisions).set({ status: next, ...(body.action === 'submit' ? { submittedBy: session.userId } : {}), ...(['approve', 'request_revision'].includes(body.action) ? { reviewedBy: session.userId, reviewedAt: new Date(), reviewNote: body.note } : {}) }).where(eq(programRevisions.id, id)),
      db.insert(programRevisionEvents).values({ revisionId: id, actorId: session.userId, action: body.action, note: body.note }),
    ]);
    logMutationAudit('UPDATE', 'program_revisions', id, session.userId, { action: body.action, nextStatus: next, version: revision.version });
    return { id, status: next, contentHash: revision.contentHash };
  }
  throw new HttpError(405, 'Metode tidak didukung');
});
export const config: Config = { path: ['/api/program-revisions', '/api/program-revisions/*'] };
