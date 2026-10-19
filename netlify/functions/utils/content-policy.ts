import type { UserSession } from '../middleware/auth.js';

export const canReadDrafts = (session: UserSession | null) => Boolean(session?.roles.some(role =>
  ['admin', 'administrator', 'super_administrator', 'publisher', 'contributor', 'content_contributor', 'reviewer', 'scientific_reviewer'].includes(role),
));

export function publicQuizMetadata<T extends { id: string; title: string; description: string | null; passingScore: number; maxAttempts: number; isPublished: boolean }>(quiz: T | undefined) {
  if (!quiz?.isPublished) return null;
  return { id: quiz.id, title: quiz.title, description: quiz.description, passingScore: quiz.passingScore, maxAttempts: quiz.maxAttempts };
}
