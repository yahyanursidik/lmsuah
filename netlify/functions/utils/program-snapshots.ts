import { and, asc, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { programReadColumns } from "./program-columns.js";
import { books, chapters, lessons, lessonVideos, lessonAttachments, lessonMarkers, lessonQuizDrafts, programs, programPublications, programRevisions, quizzes, questions, questionOptions, schedules, venues, series, seriesBooks } from '../db/schema/index.js';
import { db } from './db.js';
import { featureRequested, requireFeature } from './advanced-features.js';
import { HttpError } from './http-error.js';
import { publishedTranscriptMaterials } from './transcript-materials.js';
import type { ProgramPublicationSnapshot, PublicationLesson, PublicationQuiz } from '../../../shared/program-publication.js';
import { revisionSnapshotSchema } from './revision-content.js';
import { legacyProgramGuardSql } from './revision-sql.js';

export async function getProgramPublication(programId: string, includeWithdrawn = false) {
  if (!featureRequested('programRevisions')) return null;
  const rows = await db.select({ publication: programPublications, programStatus: programs.status }).from(programPublications).innerJoin(programs, eq(programs.id, programPublications.programId))
    .where(and(eq(programPublications.programId, programId), includeWithdrawn ? undefined : eq(programs.status, 'published'))).limit(1);
  return rows[0] ? { ...rows[0].publication, programStatus: rows[0].programStatus } : null;
}
export async function assertLegacyWorkspaceWritable(programId: string | null | undefined) {
  if (!programId || !featureRequested('programRevisions')) return;
  await requireFeature('programRevisions');
  const [program] = await db.select(programReadColumns()).from(programs).where(eq(programs.id, programId)).limit(1);
  const [revision] = await db.select({ id: programRevisions.id }).from(programRevisions).where(and(eq(programRevisions.programId, programId), ne(programRevisions.status, 'cancelled'))).limit(1);
  if (program?.status === 'published' || revision || await getProgramPublication(programId, true)) throw new HttpError(409, 'Program ini menggunakan revisi terpisah. Buka Review & Revisi untuk menyunting; versi publik tidak diubah melalui editor langsung.', 'SEPARATE_REVISION_REQUIRED');
}
export function legacyWorkspaceGuardWrites(programIds: Array<string | null | undefined>) {
  if (!featureRequested('programRevisions')) return [];
  return [...new Set(programIds.filter((id): id is string => Boolean(id)))].map(programId => db.execute(legacyProgramGuardSql(programId)));
}
export async function publishedSnapshotLesson(resource: string, includeWithdrawn = false) {
  if (!featureRequested('programRevisions')) return null;
  const result = await db.execute(sql`select candidate.value as lesson from program_publications p inner join programs pr on pr.id = p.program_id
    cross join lateral jsonb_array_elements(p.snapshot->'lessons') candidate(value)
    where ${includeWithdrawn ? sql`true` : sql`pr.status = 'published'`} and (candidate.value->>'id' = ${resource} or candidate.value->>'slug' = ${resource}) limit 1`);
  return (result.rows[0]?.lesson as PublicationLesson | undefined) || null;
}
export async function publishedSnapshotQuiz(quizId: string) {
  if (!featureRequested('programRevisions')) return null;
  const result = await db.execute(sql`select candidate.value->'quiz' as quiz from program_publications p inner join programs pr on pr.id = p.program_id
    cross join lateral jsonb_array_elements(p.snapshot->'lessons') candidate(value)
    where pr.status = 'published' and candidate.value->'quiz'->>'id' = ${quizId} and candidate.value->'quiz'->>'isPublished' = 'true' limit 1`);
  return (result.rows[0]?.quiz as PublicationQuiz | undefined) || null;
}

export async function buildSourceSnapshot(programId: string, includeDrafts = false): Promise<ProgramPublicationSnapshot> {
  const [program] = await db.select(programReadColumns()).from(programs).where(eq(programs.id, programId)).limit(1);
  if (!program) throw new HttpError(404, 'Program tidak ditemukan.');
  const items = await db.select().from(lessons).where(and(eq(lessons.programId, programId), includeDrafts ? undefined : eq(lessons.status, 'published'))).orderBy(asc(lessons.sequence), asc(lessons.id));
  const ids = items.map(item => item.id);
  const [modules, groups, videos, attachments, assessments, pointers, transcripts, agenda] = await Promise.all([
    db.select().from(chapters).where(or(eq(chapters.programId, programId), ids.length ? inArray(chapters.id, items.map(item => item.chapterId).filter((id): id is string => Boolean(id))) : undefined)).orderBy(asc(chapters.sequence)),
    db.select().from(series).where(eq(series.programId, programId)).orderBy(asc(series.sequence)),
    ids.length ? db.select().from(lessonVideos).where(inArray(lessonVideos.lessonId, ids)) : [],
    ids.length ? db.select().from(lessonAttachments).where(inArray(lessonAttachments.lessonId, ids)) : [],
    ids.length ? db.select().from(quizzes).where(inArray(quizzes.lessonId, ids)).orderBy(desc(quizzes.createdAt), desc(quizzes.id)) : [],
    ids.length ? db.select().from(lessonQuizDrafts).where(inArray(lessonQuizDrafts.lessonId, ids)) : [],
    publishedTranscriptMaterials(ids),
    db.select({ category: schedules.category, instructor: schedules.speaker, day: schedules.day, startTime: schedules.startTime, venueName: venues.name }).from(schedules).innerJoin(venues, eq(venues.id, schedules.venueId)).where(and(eq(schedules.programId, programId), eq(schedules.status, 'Rutin'))).orderBy(desc(schedules.date)).limit(1),
  ]);
  const groupIds = groups.map(item => item.id);
  const references = groupIds.length ? await db.select({ seriesId: seriesBooks.seriesId, id: books.id, title: books.title, slug: books.slug, author: books.author, status: books.status }).from(seriesBooks).innerJoin(books, eq(books.id, seriesBooks.bookId)).where(inArray(seriesBooks.seriesId, groupIds)).orderBy(asc(seriesBooks.sequence)) : [];
  const selected = items.map(lesson => {
    const pointer = pointers.find(item => item.lessonId === lesson.id);
    return pointer ? assessments.find(item => item.id === pointer.quizId) : assessments.find(item => item.lessonId === lesson.id);
  }).filter((quiz): quiz is typeof quizzes.$inferSelect => Boolean(quiz));
  const quizIds = selected.map(item => item.id);
  const quizQuestions = quizIds.length ? await db.select().from(questions).where(inArray(questions.quizId, quizIds)) : [];
  const options = quizQuestions.length ? await db.select().from(questionOptions).where(inArray(questionOptions.questionId, quizQuestions.map(item => item.id))) : [];
  const markers = videos.length ? await db.select().from(lessonMarkers).where(inArray(lessonMarkers.videoId, videos.map(item => item.id))).orderBy(asc(lessonMarkers.timestamp)) : [];
  const localModules = new Map(modules.map(module => [module.id, module.programId === programId ? module.id : crypto.randomUUID()]));
  const snapshot: ProgramPublicationSnapshot = {
    schemaVersion: 1,
    program: { id: program.id, title: program.title, slug: program.slug, description: program.description, coverImage: program.coverImage,
      category: agenda[0]?.category || undefined, instructor: agenda[0]?.instructor, routineSchedule: agenda[0] ? [agenda[0].day, agenda[0].startTime].filter(Boolean).join(' · ') : undefined, venueName: agenda[0]?.venueName },
    chapters: modules.map(module => ({ id: localModules.get(module.id)!, programId, bookId: module.bookId, title: module.title, sequence: module.sequence })),
    series: groups.map(group => ({ id: group.id, programId, slug: group.slug, title: group.title, description: group.description, sequence: group.sequence, status: group.status, books: references.filter(book => book.seriesId === group.id).map(book => ({ id: book.id, title: book.title, slug: book.slug, author: book.author, status: book.status })) })),
    lessons: items.map(lesson => {
      const quiz = selected.find(item => item.lessonId === lesson.id);
      return { id: lesson.id, programId, chapterId: lesson.chapterId ? localModules.get(lesson.chapterId) || null : null, title: lesson.title, slug: lesson.slug, sequence: lesson.sequence, date: lesson.date, description: lesson.description, status: 'published',
        materials: [...videos.filter(item => item.lessonId === lesson.id).map(item => ({ id: item.id, type: 'youtube', url: `https://youtube.com/watch?v=${item.youtubeId}`, duration: item.duration })), ...attachments.filter(item => item.lessonId === lesson.id).map(item => ({ id: item.id, type: item.type, url: item.url, filename: item.filename })), ...transcripts.filter(item => item.lessonId === lesson.id)],
        markers: markers.filter(marker => videos.some(video => video.id === marker.videoId && video.lessonId === lesson.id)).map(marker => ({ id: marker.id, videoId: marker.videoId, timestamp: marker.timestamp, title: marker.title, description: marker.description })),
        quiz: quiz ? { id: quiz.id, lessonId: lesson.id, title: quiz.title, description: quiz.description, passingScore: quiz.passingScore, maxAttempts: quiz.maxAttempts, isPublished: quiz.isPublished,
          questions: quizQuestions.filter(item => item.quizId === quiz.id).map(item => ({ id: item.id, text: item.text, type: item.type, points: item.points, explanation: item.explanation, options: options.filter(option => option.questionId === item.id).map(option => ({ id: option.id, questionId: item.id, text: option.text, isCorrect: option.isCorrect })) })) } : null };
    }),
  };
  const visibleBooks = snapshot.series.filter(group => group.status === 'published').flatMap(group => group.books.filter(book => book.status === 'published'));
  snapshot.program.bookTitle = [...new Set(visibleBooks.map(book => book.title))].join(', ') || undefined;
  snapshot.program.author = [...new Set(visibleBooks.map(book => book.author).filter(Boolean))].join(', ') || undefined;
  const parsed = revisionSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) throw new HttpError(409, `Sumber program belum dapat disalin: ${parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  return parsed.data;
}
