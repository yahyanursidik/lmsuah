import type { Config } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createHandler } from './middleware/handler.js';
import { ForbiddenError, requireAuth, requirePermission } from './middleware/auth.js';
import { transcriptVersions, transcriptDocuments, systemSettings, lessons } from './db/schema/index.js';
import { db } from './utils/db.js';
import { requireFeature } from './utils/advanced-features.js';
import { canReadDrafts } from './utils/content-policy.js';
import { assertLessonReadable } from './utils/lesson-access.js';
import { privateTranscriptStore, pdfRange, validatePdf, safePdfFilename } from './utils/pdf-files.js';
import { HttpError } from './utils/http-error.js';
import { getProgramPublication, publishedSnapshotLesson } from './utils/program-snapshots.js';

export default createHandler(async request => {
  if (request.method !== 'GET') throw new HttpError(405, 'Metode tidak didukung');
  const session = await requireAuth(request);
  await requirePermission(session, 'transcript.read');
  await requireFeature('privatePdf');
  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean)[2];
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(400, 'ID versi PDF tidak valid.');
  const [version] = await db.select().from(transcriptVersions).where(eq(transcriptVersions.id, id!)).limit(1);
  if (!version) throw new HttpError(404, 'PDF tidak ditemukan.');
  const [document] = await db.select().from(transcriptDocuments).where(eq(transcriptDocuments.id, version.documentId)).limit(1);
  if (!document) throw new HttpError(404, 'Dokumen tidak ditemukan.');
  const editor = canReadDrafts(session) || session.roles.includes('transcript_uploader');
  if (!editor) {
    const [lesson] = await db.select({ programId: lessons.programId }).from(lessons).where(eq(lessons.id, document.lessonId)).limit(1);
    const publication = lesson?.programId ? await getProgramPublication(lesson.programId, true) : null;
    if (publication) {
      const snapshot = await publishedSnapshotLesson(document.lessonId);
      if (!snapshot?.materials.some(material => material.id === version.id && material.url === `/api/transcript-file/${version.id}`) || !['published', 'archived'].includes(version.status) || !version.reviewedBy || version.reviewedBy === version.uploadedBy) throw new ForbiddenError('PDF ini tidak termasuk versi publik program saat ini.');
    } else {
      if (version.status !== 'published') throw new ForbiddenError('Versi PDF belum dipublikasikan.');
      await assertLessonReadable(document.lessonId, session, false);
    }
  }
  const download = url.searchParams.get('download') === '1';
  const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, 'general')).limit(1);
  if (download && (!version.isDownloadable || settings?.allowPdfDownload === false)) throw new ForbiddenError('Pengunduhan PDF ini tidak diizinkan.');
  const data = await privateTranscriptStore(version.blobKey).get(version.blobKey, { type: 'arrayBuffer', consistency: 'strong' });
  if (!data) throw new HttpError(404, 'Berkas PDF tidak tersedia di penyimpanan.');
  const bytes = new Uint8Array(data);
  if (bytes.length !== version.sizeBytes || validatePdf(bytes, version.mime) !== version.sha256) throw new HttpError(502, 'Integritas PDF tidak cocok. Hubungi pengelola.', 'FILE_INTEGRITY_ERROR');
  const filename = safePdfFilename(version.filename);
  const ascii = Array.from(filename).map(character => { const code = character.charCodeAt(0); return code >= 32 && code <= 126 && character !== '"' && character !== '\\' ? character : '_'; }).join('');
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  const headers = new Headers({ 'Content-Type': 'application/pdf', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'Accept-Ranges': 'bytes',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'", 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encoded}` });
  let range: ReturnType<typeof pdfRange>;
  try { range = pdfRange(request.headers.get('range'), bytes.length); }
  catch (cause) {
    if (cause instanceof HttpError && cause.statusCode === 416) { headers.set('Content-Range', `bytes */${bytes.length}`); return new Response(null, { status: 416, headers }); }
    throw cause;
  }
  if (range) {
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${bytes.length}`);
    headers.set('Content-Length', String(range.end - range.start + 1));
    return new Response(bytes.slice(range.start, range.end + 1), { status: 206, headers });
  }
  headers.set('Content-Length', String(bytes.length));
  return new Response(bytes, { status: 200, headers });
});
export const config: Config = { path: '/api/transcript-file/*' };
