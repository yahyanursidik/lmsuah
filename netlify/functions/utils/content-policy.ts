import type { UserSession } from '../middleware/auth.js';

export const canReadDrafts = (session: UserSession | null) => Boolean(session?.roles.some(role =>
  ['admin', 'administrator', 'super_administrator', 'publisher', 'contributor', 'content_contributor', 'reviewer', 'scientific_reviewer'].includes(role),
));

export function publicQuizMetadata<T extends { id: string; title: string; description: string | null; passingScore: number; maxAttempts: number; isPublished: boolean }>(quiz: T | undefined) {
  if (!quiz?.isPublished) return null;
  return { id: quiz.id, title: quiz.title, description: quiz.description, passingScore: quiz.passingScore, maxAttempts: quiz.maxAttempts };
}

interface ScoringQuestion { id: string; points: number }
interface ScoringOption { id: string; questionId: string; isCorrect: boolean }
interface SubmittedAnswer { questionId: string; optionId: string }

export function scoreQuiz(questions: ScoringQuestion[], options: ScoringOption[], answers: SubmittedAnswer[]) {
  const seen = new Set<string>();
  for (const answer of answers) {
    if (seen.has(answer.questionId) || !questions.some(q => q.id === answer.questionId) ||
      !options.some(o => o.id === answer.optionId && o.questionId === answer.questionId)) {
      throw new Error('INVALID_QUIZ_ANSWER');
    }
    seen.add(answer.questionId);
  }
  const scored = questions.map(question => {
    const answer = answers.find(a => a.questionId === question.id);
    const correct = Boolean(answer && options.some(o => o.id === answer.optionId && o.questionId === question.id && o.isCorrect));
    return { questionId: question.id, optionId: answer?.optionId || null, isCorrectSnapshot: correct, points: correct ? question.points : 0 };
  });
  const rawScore = scored.reduce((sum, a) => sum + a.points, 0);
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  return { scored, rawScore, maxScore, score: maxScore ? Math.round(rawScore / maxScore * 100) : 0 };
}
