import type { PublicationLesson, PublicationQuiz, ProgramPublicationSnapshot } from './program-publication';

export function publicPublicationLesson(lesson: PublicationLesson & { materialCount?: number; hasQuiz?: boolean }, requiresAuth = false) {
  const quiz = lesson.quiz?.isPublished ? { id: lesson.quiz.id, title: lesson.quiz.title, description: lesson.quiz.description, passingScore: lesson.quiz.passingScore, maxAttempts: lesson.quiz.maxAttempts } : null;
  return { id: lesson.id, programId: lesson.programId, chapterId: lesson.chapterId, slug: lesson.slug, title: lesson.title, sequence: lesson.sequence, date: lesson.date, description: lesson.description, status: 'published' as const,
    materials: (lesson.materials || []).map(material => ({ id: material.id, type: material.type, url: material.url, filename: material.filename, duration: material.duration,
      isDownloadable: material.isDownloadable, ...(/^\/api\/transcript-file\//.test(material.url) ? { downloadUrl: `${material.url}?download=1`, requiresAuth } : {}) })),
    markers: lesson.markers || [], quiz, materialCount: lesson.materialCount ?? lesson.materials.length, hasQuiz: lesson.hasQuiz ?? Boolean(quiz) };
}
export function publicPublicationQuiz(quiz: PublicationQuiz) {
  return { id: quiz.id, lessonId: quiz.lessonId, title: quiz.title, description: quiz.description, passingScore: quiz.passingScore, maxAttempts: quiz.maxAttempts,
    questions: quiz.questions.map(question => ({ id: question.id, type: question.type, text: question.text, points: question.points, options: question.options.map(option => ({ id: option.id, text: option.text })) })) };
}
export function publicPublicationSeries(snapshot: ProgramPublicationSnapshot) {
  return snapshot.series.filter(series => series.status === 'published').map(series => ({ ...series, books: series.books.filter(book => book.status === 'published') }));
}
