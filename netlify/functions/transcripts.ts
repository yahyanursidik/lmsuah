import type { Config } from '@netlify/functions';
import { programReadColumns } from "./utils/program-columns.js";
import { and, asc, desc, eq, ne, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createHandler } from './middleware/handler.js';
import { ForbiddenError, requireAuth, requirePermission } from './middleware/auth.js';
import { transcriptDocuments, transcriptVersions, transcriptVersionEvents, lessons, programs, programRevisions, user } from './db/schema/index.js';
import { db } from './utils/db.js';
import { featureRequested, requireFeature } from './utils/advanced-features.js';
import { getProgramPublication } from './utils/program-snapshots.js';
import { getDatabaseActorId, logMutationAudit } from './utils/contentHelper.js';
import { canReadDrafts } from './utils/content-policy.js';
import { HttpError } from './utils/http-error.js';
import { validateBody } from './utils/validation.js';
import { privateTranscriptStore, readLimitedPdfBody, safePdfFilename, validatePdf } from './utils/pdf-files.js';
import { nextTranscriptStatus } from '../../shared/review-policy.js';

const actionSchema = z.object({ action: z.enum(['submit', 'approve', 'request_revision', 'publish', 'archive']), note: z.string().trim().min(3).max(2000) });
function metadata(version: typeof transcriptVersions.$inferSelect, document: typeof transcriptDocuments.$inferSelect, history: Array<{ action: string; note: string; actorName: string | null; createdAt: Date }> = []) {
  return { id: version.id, documentId: document.id, lessonId: document.lessonId, title: document.title, version: version.version, filename: version.filename,
    sizeBytes: version.sizeBytes, sha256: version.sha256, status: version.status, isDownloadable: version.isDownloadable,
    uploadedBy: version.uploadedBy, reviewedBy: version.reviewedBy, uploadedAt: version.uploadedAt, reviewNote: version.reviewNote, history,
    viewUrl: `/api/transcript-file/${version.id}`, downloadUrl: version.isDownloadable ? `/api/transcript-file/${version.id}?download=1` : null };
}
function headerText(request: Request, name: string) {
  try { return decodeURIComponent(request.headers.get(name) || ''); }
  catch { throw new HttpError(400, 'Metadata nama/judul berkas tidak valid.'); }
}

export default createHandler(async request => {
  const session = await requireAuth(request);
  await requireFeature('privatePdf');
  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean)[2];
  if (request.method === 'GET') {
    await requirePermission(session, 'transcript.read');
    if (!canReadDrafts(session) && !session.roles.includes('transcript_uploader')) throw new ForbiddenError('Daftar versi privat hanya untuk tim konten.');
    const lessonId = z.string().uuid().safeParse(url.searchParams.get('lessonId'));
    if (!lessonId.success) throw new HttpError(400, 'lessonId UUID diperlukan.');
    const rows = await db.select({ version: transcriptVersions, document: transcriptDocuments }).from(transcriptVersions)
      .innerJoin(transcriptDocuments, eq(transcriptDocuments.id, transcriptVersions.documentId)).where(eq(transcriptDocuments.lessonId, lessonId.data))
      .orderBy(asc(transcriptDocuments.createdAt), desc(transcriptVersions.version));
    const events = rows.length ? await db.select({ versionId: transcriptVersionEvents.versionId, action: transcriptVersionEvents.action, note: transcriptVersionEvents.note, actorName: user.name, createdAt: transcriptVersionEvents.createdAt }).from(transcriptVersionEvents).leftJoin(user, eq(user.id, transcriptVersionEvents.actorId)).where(inArray(transcriptVersionEvents.versionId, rows.map(row => row.version.id))).orderBy(desc(transcriptVersionEvents.createdAt)) : [];
    return { items: rows.map(row => metadata(row.version, row.document, events.filter(event => event.versionId === row.version.id))), total: rows.length };
  }
  if (session.isDevelopmentDemo) throw new HttpError(409, 'Gunakan akun tim nyata untuk menyimpan atau mereview PDF privat.');
  if (request.method === 'POST') {
    await requirePermission(session, 'transcript.upload');
    const lessonId = z.string().uuid().safeParse(request.headers.get('x-lms-lesson-id'));
    if (!lessonId.success) throw new HttpError(400, 'lessonId UUID diperlukan.');
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId.data)).limit(1);
    if (!lesson?.programId) throw new HttpError(404, 'Pertemuan/program tidak ditemukan.');
    const filename = safePdfFilename(headerText(request, 'x-lms-filename'));
    const title = headerText(request, 'x-lms-title').trim() || filename;
    if (title.length > 180) throw new HttpError(400, 'Judul PDF maksimal 180 karakter.');
    const bytes = await readLimitedPdfBody(request);
    const sha256 = validatePdf(bytes, request.headers.get('content-type') || '');
    const existingDocumentId = request.headers.get('x-lms-document-id');
    if (existingDocumentId && !z.string().uuid().safeParse(existingDocumentId).success) throw new HttpError(400, 'documentId tidak valid.');
    const [existing] = existingDocumentId ? await db.select().from(transcriptDocuments).where(eq(transcriptDocuments.id, existingDocumentId)).limit(1) : [];
    if (existingDocumentId && existing?.lessonId !== lesson.id) throw new ForbiddenError('Dokumen harus berada dalam pertemuan yang sama.');
    const documentId = existing?.id || crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const blobKey = `${process.env.LMS_PRIVATE_PDF_STORAGE === 'contabo' ? 'contabo/private/' : ''}transcripts/${lesson.programId}/${lesson.id}/${documentId}/${versionId}.pdf`;
    const store = privateTranscriptStore(blobKey);
    const result = await store.set(blobKey, bytes.buffer, { onlyIfNew: true, metadata: { mime: 'application/pdf', sha256 } });
    if (!result.modified) throw new HttpError(409, 'Kunci versi PDF sudah ada. Unggah kembali sebagai versi baru.');
    try {
      const queries = await db.batch([
        db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`transcript:${documentId}`}, 0))`),
        ...(existing ? [] : [db.insert(transcriptDocuments).values({ id: documentId, lessonId: lesson.id, title, createdBy: getDatabaseActorId(session) })]),
        db.execute(sql`insert into transcript_versions (id, document_id, version, blob_key, filename, mime, size_bytes, sha256, status, is_downloadable, uploaded_by)
          select ${versionId}::uuid, ${documentId}::uuid, coalesce(max(version), 0) + 1, ${blobKey}, ${filename}, 'application/pdf', ${bytes.length}, ${sha256}, 'draft', ${request.headers.get('x-lms-downloadable') === 'true'}, ${session.userId}
          from transcript_versions where document_id = ${documentId}::uuid
          returning id, version`),
        db.insert(transcriptVersionEvents).values({ versionId, actorId: session.userId, action: 'upload', note: 'Versi PDF baru diunggah sebagai draft.' }),
      ]);
      const saved = queries[queries.length - 2] as { rows: Array<{ id: string; version: number }> };
      logMutationAudit('CREATE', 'transcript_versions', versionId, session.userId, { lessonId: lesson.id, documentId, sha256, sizeBytes: bytes.length });
      return { id: versionId, documentId, lessonId: lesson.id, version: saved.rows[0]?.version, status: 'draft', filename };
    } catch (cause) {
      // A network failure may occur after the DB committed. Never delete a
      // blob on an uncertain commit; retain it for audited orphan reconciliation.
      logMutationAudit('CREATE', 'transcript-upload-reconciliation', versionId, session.userId, { documentId, lessonId: lesson.id, blobKey });
      throw cause;
    }
  }
  if (request.method === 'PATCH' && id) {
    if (!z.string().uuid().safeParse(id).success) throw new HttpError(400, 'ID versi tidak valid.');
    const body = await validateBody(request, actionSchema);
    const permission = body.action === 'submit' ? 'transcript.upload' : ['approve', 'request_revision'].includes(body.action) ? 'transcript.review' : 'transcript.publish';
    await requirePermission(session, permission);
    const [version] = await db.select().from(transcriptVersions).where(eq(transcriptVersions.id, id)).limit(1);
    if (!version) throw new HttpError(404, 'Versi PDF tidak ditemukan.');
    if (body.action === 'approve' && version.uploadedBy === session.userId) throw new ForbiddenError('Pengunggah tidak dapat menyetujui berkasnya sendiri.');
    let next: string;
    try { next = nextTranscriptStatus(version.status, body.action); }
    catch { throw new HttpError(409, 'Status PDF berubah atau tindakan tidak sesuai. Muat ulang daftar versi.'); }
    const [document] = await db.select().from(transcriptDocuments).where(eq(transcriptDocuments.id, version.documentId)).limit(1);
    if (!document) throw new HttpError(404, 'Dokumen PDF tidak ditemukan.');
    if (body.action === 'publish' && featureRequested('programRevisions')) {
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, document.lessonId)).limit(1);
      if (lesson?.programId && !await getProgramPublication(lesson.programId, true)) {
        const [program] = await db.select(programReadColumns()).from(programs).where(eq(programs.id, lesson.programId)).limit(1);
        const [revision] = await db.select({ id: programRevisions.id }).from(programRevisions).where(and(eq(programRevisions.programId, lesson.programId), sql`${programRevisions.status} <> 'cancelled'`)).limit(1);
        if (program?.status === 'published' || revision) throw new HttpError(409, 'Terbitkan snapshot awal program terlebih dahulu. PDF baru tidak boleh mengubah versi publik lama selama snapshot awal disiapkan.');
      }
    }
    const results = await db.batch([
      db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`transcript:${version.documentId}`}, 0))`),
      db.execute(sql`select 1 / case when exists (select 1 from transcript_versions where id = ${id}::uuid and status = ${version.status}) then 1 else 0 end as revision_guard`),
      ...(body.action === 'publish' ? [db.update(transcriptVersions).set({ status: 'archived' }).where(and(eq(transcriptVersions.documentId, version.documentId), eq(transcriptVersions.status, 'published'), ne(transcriptVersions.id, id)))] : []),
      db.insert(transcriptVersionEvents).values({ versionId: id, actorId: session.userId, action: body.action, note: body.note }),
      db.update(transcriptVersions).set({ status: next, reviewNote: body.note, ...(['approve', 'request_revision'].includes(body.action) ? { reviewedBy: session.userId, reviewedAt: new Date() } : {}) }).where(and(eq(transcriptVersions.id, id), eq(transcriptVersions.status, version.status))).returning(),
    ]);
    const saved = results[results.length - 1] as Array<typeof transcriptVersions.$inferSelect>;
    if (!saved[0]) throw new HttpError(409, 'Versi PDF berubah. Muat ulang sebelum melanjutkan.');
    logMutationAudit('UPDATE', 'transcript_versions', id, session.userId, { action: body.action, note: body.note });
    return metadata(saved[0], document);
  }
  throw new HttpError(405, 'Metode tidak didukung');
});
export const config: Config = { path: ['/api/transcripts', '/api/transcripts/*'] };
