import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { books, chapters, lessons, lessonAttachments, lessonMarkers, lessonQuizDrafts, lessonVideos, programs, quizzes, questions, questionOptions, series, seriesBooks, transcriptDocuments, transcriptVersions, transcriptVersionEvents } from '../db/schema/index.js';
import { db } from './db.js';
import { HttpError } from './http-error.js';
import { forkChangedRevisionQuizzes, revisionSnapshotSchema } from './revision-content.js';
import type { ProgramPublicationSnapshot } from '../../../shared/program-publication.js';

export async function normalizeRevisionSnapshot(input: unknown, base: ProgramPublicationSnapshot, programId: string) {
  const parsed = revisionSnapshotSchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  const snapshot = parsed.data;
  if (Buffer.byteLength(JSON.stringify(snapshot)) > 4 * 1024 * 1024) throw new HttpError(413, 'Snapshot revisi maksimal 4 MB. Bagi program yang terlalu besar sebelum mengajukan revisi.');
  if (snapshot.program.id !== programId || snapshot.lessons.some(item => item.programId !== programId) || snapshot.series.some(item => item.programId !== programId) || snapshot.chapters.some(item => item.programId !== programId)) throw new HttpError(400, 'Seluruh isi revisi harus berada di program yang sama.');
  for (const items of [snapshot.lessons, snapshot.chapters, snapshot.series]) if (new Set(items.map(item => item.id)).size !== items.length) throw new HttpError(400, 'ID konten dalam revisi tidak boleh berulang.');
  const [storedLessons, storedChapters, storedSeries] = await Promise.all([
    snapshot.lessons.length ? db.select({ id: lessons.id, programId: lessons.programId }).from(lessons).where(inArray(lessons.id, snapshot.lessons.map(item => item.id))) : [],
    snapshot.chapters.length ? db.select({ id: chapters.id, programId: chapters.programId }).from(chapters).where(inArray(chapters.id, snapshot.chapters.map(item => item.id))) : [],
    snapshot.series.length ? db.select({ id: series.id, programId: series.programId }).from(series).where(inArray(series.id, snapshot.series.map(item => item.id))) : [],
  ]);
  if ([...storedLessons, ...storedChapters, ...storedSeries].some(item => item.programId !== programId)) throw new HttpError(403, 'ID konten milik program lain tidak dapat digunakan dalam revisi.');
  const chapterIds = new Set(snapshot.chapters.map(item => item.id));
  if (snapshot.lessons.some(item => item.chapterId && !chapterIds.has(item.chapterId))) throw new HttpError(400, 'Pindahkan pertemuan sebelum menghapus modul yang masih digunakan.');
  const allMaterialIds = snapshot.lessons.flatMap(lesson => lesson.materials.map(material => material.id));
  const allMarkerIds = snapshot.lessons.flatMap(lesson => lesson.markers.map(marker => marker.id));
  if (new Set(allMaterialIds).size !== allMaterialIds.length || new Set(allMarkerIds).size !== allMarkerIds.length) throw new HttpError(400, 'ID materi dan timestamp harus unik di seluruh revisi.');
  const bookIds = [...new Set([...snapshot.series.flatMap(item => item.books.map(book => book.id)), ...snapshot.chapters.map(module => module.bookId).filter((id): id is string => Boolean(id))])];
  const storedBooks = bookIds.length ? await db.select({ id: books.id }).from(books).where(inArray(books.id, bookIds)) : [];
  if (storedBooks.length !== bookIds.length) throw new HttpError(400, 'Kitab rujukan tidak ditemukan. Muat ulang katalog kitab.');
  for (const lesson of snapshot.lessons) {
    if (new Set(lesson.materials.map(item => item.id)).size !== lesson.materials.length) throw new HttpError(400, 'ID sumber materi tidak boleh berulang.');
    for (const material of lesson.materials) {
      const managedId = material.url.match(/^\/api\/transcript-file\/([a-f0-9-]{36})$/)?.[1];
      if (managedId) {
        const [record] = await db.select({ version: transcriptVersions, document: transcriptDocuments }).from(transcriptVersions).innerJoin(transcriptDocuments, eq(transcriptDocuments.id, transcriptVersions.documentId)).where(eq(transcriptVersions.id, managedId)).limit(1);
        if (!record || record.document.lessonId !== lesson.id) throw new HttpError(403, 'PDF privat harus berasal dari pertemuan yang sama.');
        material.id = record.version.id;
        material.type = 'PDF';
        material.filename = `${record.document.title} · versi ${record.version.version}`;
        material.isDownloadable = record.version.isDownloadable;
      }
    }
    if (lesson.markers.some(marker => !lesson.materials.some(material => material.id === marker.videoId && material.type === 'youtube'))) throw new HttpError(400, 'Timestamp harus terhubung ke video di pertemuan yang sama.');
  }
  const references = snapshot.series.filter(item => item.status === 'published').flatMap(item => item.books.filter(book => book.status === 'published'));
  snapshot.program.bookTitle = [...new Set(references.map(book => book.title))].join(', ') || undefined;
  snapshot.program.author = [...new Set(references.map(book => book.author).filter(Boolean))].join(', ') || undefined;
  return forkChangedRevisionQuizzes(snapshot, base);
}

export async function validateRevisionReferencesForPublication(snapshot: ProgramPublicationSnapshot) {
  const [duplicate] = await db.select({ id: programs.id }).from(programs).where(and(eq(programs.slug, snapshot.program.slug), sql`${programs.id} <> ${snapshot.program.id}::uuid`)).limit(1);
  if (duplicate) throw new HttpError(409, 'Slug program sudah digunakan program lain.');
  for (const group of snapshot.series) {
    const [collision] = await db.select({ id: series.id }).from(series).where(and(eq(series.slug, group.slug), sql`${series.id} <> ${group.id}::uuid`)).limit(1);
    if (collision) throw new HttpError(409, `Slug seri “${group.slug}” sudah digunakan.`);
  }
  for (const lesson of snapshot.lessons) {
    const [collision] = await db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.slug, lesson.slug), sql`${lessons.id} <> ${lesson.id}::uuid`)).limit(1);
    if (collision) throw new HttpError(409, `Slug pertemuan “${lesson.slug}” sudah digunakan.`);
    for (const material of lesson.materials) {
      const managedId = material.url.match(/^\/api\/transcript-file\/([a-f0-9-]{36})$/)?.[1];
      if (managedId) {
        const [version] = await db.select().from(transcriptVersions).where(eq(transcriptVersions.id, managedId)).limit(1);
        if (!version || !['approved', 'published', 'archived'].includes(version.status) || !version.reviewedBy || version.reviewedBy === version.uploadedBy) throw new HttpError(409, `PDF privat “${material.filename}” harus disetujui reviewer independen sebelum revisi program diajukan.`);
      }
    }
  }
}

/** Pending approved files become public atomically WITH their first snapshot.
 * Older referenced files remain readable through immutable publications. */
export async function revisionPdfWrites(snapshot: ProgramPublicationSnapshot, actorId: string) {
  const ids = [...new Set(snapshot.lessons.flatMap(lesson => lesson.materials.filter(material => material.url.startsWith('/api/transcript-file/')).map(material => material.id)))];
  if (!ids.length) return { writes: [] as BatchItem<'pg'>[], publishesPdf: false };
  const versions = await db.select().from(transcriptVersions).where(inArray(transcriptVersions.id, ids));
  if (versions.length !== ids.length) throw new HttpError(409, 'Versi PDF pada snapshot tidak ditemukan.');
  const pending = versions.filter(version => version.status === 'approved');
  if (new Set(pending.map(version => version.documentId)).size !== pending.length) throw new HttpError(409, 'Pilih satu versi PDF baru untuk setiap dokumen.');
  const writes: BatchItem<'pg'>[] = [];
  for (const version of [...versions].sort((a, b) => a.documentId.localeCompare(b.documentId) || a.id.localeCompare(b.id))) {
    writes.push(db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`transcript:${version.documentId}`}, 0))`));
    writes.push(db.execute(sql`select 1 / case when exists(select 1 from transcript_versions where id = ${version.id}::uuid and status = ${version.status} and reviewed_by is not null and reviewed_by <> uploaded_by) then 1 else 0 end as pdf_review_guard`));
    if (version.status !== 'approved') continue;
    writes.push(db.update(transcriptVersions).set({ status: 'archived' }).where(and(eq(transcriptVersions.documentId, version.documentId), eq(transcriptVersions.status, 'published'))));
    writes.push(db.update(transcriptVersions).set({ status: 'published' }).where(eq(transcriptVersions.id, version.id)));
    writes.push(db.insert(transcriptVersionEvents).values({ versionId: version.id, actorId, action: 'publish', note: 'Diterbitkan atomik bersama snapshot program yang disetujui.' }));
  }
  return { writes, publishesPdf: pending.length > 0 };
}

export function revisionAnchorWrites(snapshot: ProgramPublicationSnapshot, actorId: string): BatchItem<'pg'>[] {
  return snapshot.lessons.map(lesson => db.insert(lessons).values({ id: lesson.id, programId: snapshot.program.id, title: lesson.title || 'Pertemuan draft revisi', slug: `revision-${lesson.id}`, sequence: lesson.sequence, status: 'draft', createdBy: actorId, updatedBy: actorId }).onConflictDoNothing());
}

/** Publish-time synchronization keeps foreign-key anchors and all assessment
 * history. It never deletes a lesson, quiz, attempt, answer, progress, or note. */
export async function revisionSourceWrites(snapshot: ProgramPublicationSnapshot, actorId: string): Promise<BatchItem<'pg'>[]> {
  const programId = snapshot.program.id;
  const ids = snapshot.lessons.map(item => item.id);
  const writes: BatchItem<'pg'>[] = [];
  writes.push(db.update(programs).set({ title: snapshot.program.title, slug: snapshot.program.slug, description: snapshot.program.description, status: 'published', updatedAt: new Date(), updatedBy: actorId }).where(eq(programs.id, programId)));
  writes.push(db.update(series).set({ status: 'archived', updatedAt: new Date(), updatedBy: actorId }).where(eq(series.programId, programId)));
  for (const group of snapshot.series) {
    const values = { programId, title: group.title, slug: group.slug, description: group.description, sequence: group.sequence, status: group.status, updatedAt: new Date(), updatedBy: actorId };
    writes.push(db.insert(series).values({ id: group.id, ...values, createdBy: actorId }).onConflictDoUpdate({ target: series.id, set: values, setWhere: eq(series.programId, programId) }));
    writes.push(db.delete(seriesBooks).where(and(eq(seriesBooks.seriesId, group.id), inArray(seriesBooks.seriesId, db.select({ id: series.id }).from(series).where(eq(series.programId, programId))))));
    if (group.books.length) writes.push(db.insert(seriesBooks).values(group.books.map((book, index) => ({ seriesId: group.id, bookId: book.id, sequence: index + 1 }))));
  }
  for (const module of snapshot.chapters) {
    const values = { programId, bookId: module.bookId, title: module.title, sequence: module.sequence, updatedAt: new Date(), updatedBy: actorId };
    writes.push(db.insert(chapters).values({ id: module.id, ...values, createdBy: actorId }).onConflictDoUpdate({ target: chapters.id, set: values, setWhere: eq(chapters.programId, programId) }));
  }
  writes.push(db.update(lessons).set({ status: 'draft', updatedAt: new Date(), updatedBy: actorId }).where(and(eq(lessons.programId, programId), notInArray(lessons.id, ids))));
  for (const lesson of snapshot.lessons) {
    const values = { programId, chapterId: lesson.chapterId, title: lesson.title, slug: lesson.slug, sequence: lesson.sequence, date: lesson.date, description: lesson.description, status: 'published', updatedAt: new Date(), updatedBy: actorId };
    writes.push(db.insert(lessons).values({ id: lesson.id, ...values, createdBy: actorId }).onConflictDoUpdate({ target: lessons.id, set: values, setWhere: eq(lessons.programId, programId) }));
    const ownLesson = db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.id, lesson.id), eq(lessons.programId, programId)));
    const videoIds = db.select({ id: lessonVideos.id }).from(lessonVideos).where(inArray(lessonVideos.lessonId, ownLesson));
    writes.push(db.delete(lessonMarkers).where(inArray(lessonMarkers.videoId, videoIds)));
    writes.push(db.delete(lessonVideos).where(inArray(lessonVideos.lessonId, ownLesson)));
    writes.push(db.delete(lessonAttachments).where(inArray(lessonAttachments.lessonId, ownLesson)));
    for (const material of lesson.materials) {
      if (material.url.startsWith('/api/transcript-file/')) continue;
      if (material.type === 'youtube') {
        const parsed = new URL(material.url);
        const youtubeId = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.split('/').pop();
        if (!youtubeId || !/^[\w-]{11}$/.test(youtubeId)) throw new HttpError(409, 'URL YouTube tidak valid.');
        writes.push(db.insert(lessonVideos).values({ id: material.id, lessonId: lesson.id, youtubeId, duration: material.duration }));
      } else writes.push(db.insert(lessonAttachments).values({ id: material.id, lessonId: lesson.id, filename: material.filename || 'Lampiran', url: material.url, type: material.type }));
    }
    if (lesson.markers.length) writes.push(db.insert(lessonMarkers).values(lesson.markers));
    if (lesson.quiz) {
      const quiz = lesson.quiz;
      const [stored] = await db.select({ id: quizzes.id, lessonId: quizzes.lessonId }).from(quizzes).where(eq(quizzes.id, quiz.id)).limit(1);
      if (stored && stored.lessonId !== lesson.id) throw new HttpError(403, 'Versi kuis berada di pertemuan yang berbeda.');
      if (!stored) {
        writes.push(db.insert(quizzes).values({ id: quiz.id, lessonId: lesson.id, title: quiz.title, description: quiz.description, passingScore: quiz.passingScore, maxAttempts: quiz.maxAttempts, isPublished: quiz.isPublished }));
        for (const question of quiz.questions) {
          writes.push(db.insert(questions).values({ id: question.id, quizId: quiz.id, type: question.type, text: question.text, explanation: question.explanation, points: question.points }));
          writes.push(db.insert(questionOptions).values(question.options));
        }
      }
    }
    writes.push(db.insert(lessonQuizDrafts).values({ lessonId: lesson.id, quizId: lesson.quiz?.id || null }).onConflictDoUpdate({ target: lessonQuizDrafts.lessonId, set: { quizId: lesson.quiz?.id || null, updatedAt: new Date() } }));
  }
  // Recheck anchor ownership after upserts; a colliding foreign UUID must never
  // become a publication target even under a concurrent insertion.
  writes.push(db.execute(sql`select 1 / case when (select count(*) from lessons where program_id = ${programId}::uuid and ${inArray(lessons.id, ids)}) = ${ids.length} then 1 else 0 end as ownership_guard`));
  if (snapshot.series.length) writes.push(db.execute(sql`select 1 / case when (select count(*) from series where program_id = ${programId}::uuid and ${inArray(series.id, snapshot.series.map(item => item.id))}) = ${snapshot.series.length} then 1 else 0 end as series_ownership_guard`));
  if (snapshot.chapters.length) writes.push(db.execute(sql`select 1 / case when (select count(*) from chapters where program_id = ${programId}::uuid and ${inArray(chapters.id, snapshot.chapters.map(item => item.id))}) = ${snapshot.chapters.length} then 1 else 0 end as chapter_ownership_guard`));
  return writes;
}
