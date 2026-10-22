import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ProgramPublicationSnapshot, PublicationQuiz } from '../../../shared/program-publication.js';
import { HttpError } from './http-error.js';
import { imageSourceSchema } from './image-validation.js';

const id = z.string().uuid();
const text = (max: number) => z.string().max(max);
const option = z.object({ id, questionId: id, text: text(500), isCorrect: z.boolean() });
const question = z.object({ id, text: text(1000), type: z.enum(['single_choice', 'true_false']), points: z.number().int().min(1).max(100), explanation: text(2000).nullable(), options: z.array(option).min(2).max(10) });
export const revisionSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  program: z.object({ id, slug: text(160), title: text(160), description: text(500).nullable(), coverImage: imageSourceSchema.nullable().optional(), category: text(100).optional(), instructor: text(180).optional(), bookTitle: text(2000).optional(), author: text(1000).optional(), routineSchedule: text(500).optional(), venueName: text(180).optional() }),
  chapters: z.array(z.object({ id, programId: id.nullable(), bookId: id.nullable(), title: text(180), sequence: z.number().int().min(1) })).max(1000),
  series: z.array(z.object({ id, programId: id, slug: text(180), title: text(180), description: text(2000).nullable(), sequence: z.number().int().min(1), status: z.enum(['draft', 'published', 'archived']), books: z.array(z.object({ id, title: text(180), slug: text(160), author: text(180).nullable(), status: z.string().max(30) })).max(100) })).max(200),
  lessons: z.array(z.object({ id, programId: id, chapterId: id.nullable(), slug: text(180), title: text(180), sequence: z.number().int().min(1), date: text(10).nullable(), description: text(5000).nullable(), status: z.literal('published'),
    materials: z.array(z.object({ id, type: z.enum(['youtube', 'PDF', 'audio', 'drive', 'DOCX', 'link']), url: text(2000), filename: text(200).optional(), duration: text(40).nullable().optional(), isDownloadable: z.boolean().optional() })).max(100),
    markers: z.array(z.object({ id, videoId: id, timestamp: z.number().int().min(0).max(604800), title: text(180), description: text(1000).nullable() })).max(300),
    quiz: z.object({ id, lessonId: id, title: text(180), description: text(1000).nullable(), passingScore: z.number().int().min(0).max(100), maxAttempts: z.number().int().min(1).max(20), isPublished: z.boolean(), questions: z.array(question).max(200) }).nullable(),
  })).max(2000),
});

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, entry]) => [key, canonical(entry)]));
  return value;
}
export function revisionPartHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export function revisionHash(snapshot: ProgramPublicationSnapshot) {
  return revisionPartHash(snapshot);
}
function quizContent(quiz: PublicationQuiz) {
  return JSON.stringify({ title: quiz.title, description: quiz.description, passingScore: quiz.passingScore, maxAttempts: quiz.maxAttempts, isPublished: quiz.isPublished,
    questions: quiz.questions.map(q => ({ type: q.type, text: q.text, points: q.points, explanation: q.explanation, options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })) })) });
}
/** Preserve unchanged assessment IDs; changed assessments always get fresh IDs. */
export function forkChangedRevisionQuizzes(snapshot: ProgramPublicationSnapshot, base: ProgramPublicationSnapshot) {
  for (const lesson of snapshot.lessons) {
    if (!lesson.quiz) continue;
    const previous = base.lessons.find(item => item.id === lesson.id)?.quiz;
    if (previous && quizContent(previous) === quizContent(lesson.quiz)) { lesson.quiz = structuredClone(previous); continue; }
    const quizId = crypto.randomUUID();
    lesson.quiz = { ...lesson.quiz, id: quizId, lessonId: lesson.id, questions: lesson.quiz.questions.map(q => { const questionId = crypto.randomUUID(); return { ...q, id: questionId, options: q.options.map(o => ({ ...o, id: crypto.randomUUID(), questionId })) }; }) };
  }
  return snapshot;
}
export function validateRevisionForSubmission(snapshot: ProgramPublicationSnapshot) {
  if (!snapshot.program.title.trim() || !snapshot.program.description?.trim() || !snapshot.lessons.length) throw new HttpError(409, 'Judul, deskripsi, dan minimal satu pertemuan lengkap diperlukan.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(snapshot.program.slug) || snapshot.chapters.some(module => !module.title.trim()) || snapshot.series.some(group => !group.title.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group.slug))) throw new HttpError(409, 'Lengkapi judul modul/seri serta slug program dan seri yang valid.');
  if (new Set(snapshot.series.map(group => group.slug)).size !== snapshot.series.length) throw new HttpError(409, 'Slug seri tidak boleh berulang.');
  const slugs = new Set<string>(); const sequences = new Set<number>();
  for (const lesson of snapshot.lessons) {
    if (!lesson.title.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug) || !lesson.materials.length) throw new HttpError(409, `Lengkapi judul, slug, dan materi pertemuan “${lesson.title || lesson.sequence}”.`);
    if (slugs.has(lesson.slug) || sequences.has(lesson.sequence)) throw new HttpError(409, 'Slug dan urutan pertemuan harus unik di dalam revisi.');
    slugs.add(lesson.slug); sequences.add(lesson.sequence);
    if (lesson.date && (!/^\d{4}-\d{2}-\d{2}$/.test(lesson.date) || Number.isNaN(Date.parse(lesson.date)) || new Date(lesson.date).toISOString().slice(0, 10) !== lesson.date)) throw new HttpError(409, 'Tanggal pertemuan tidak valid.');
    for (const material of lesson.materials) {
      if (!/^https?:\/\//i.test(material.url) && !/^\/api\/transcript-file\/[a-f0-9-]{36}$/.test(material.url)) throw new HttpError(409, 'URL materi harus HTTP(S) atau endpoint PDF privat yang valid.');
      if (material.type === 'youtube') {
        let host = ''; try { host = new URL(material.url).hostname; } catch { /* Validation below rejects it. */ }
        if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(host) || !/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)[\w-]{11}/.test(material.url)) throw new HttpError(409, 'URL YouTube tidak valid.');
      }
    }
    if (lesson.quiz?.isPublished && (!lesson.quiz.title.trim() || !lesson.quiz.questions.length || lesson.quiz.questions.some(q => !q.text.trim() || q.options.some(o => !o.text.trim()) || q.options.filter(o => o.isCorrect).length !== 1 || q.type === 'true_false' && q.options.length !== 2))) throw new HttpError(409, `Lengkapi soal dan satu jawaban benar untuk kuis “${lesson.quiz.title}”.`);
  }
}
