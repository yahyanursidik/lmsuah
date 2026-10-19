import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@netlify/functions';
import type { UserSession } from '../netlify/functions/middleware/auth';
import { canReadDrafts, publicQuizMetadata, scoreQuiz } from '../netlify/functions/utils/content-policy';
import { requireContentUpdateAccess } from '../netlify/functions/utils/contentHelper';
import { PgDialect } from 'drizzle-orm/pg-core';

const state = vi.hoisted(() => ({
  session: { userId: 'participant', roles: ['participant'] } as UserSession | null,
  rows: new Map<string, unknown[]>(),
  batch: vi.fn(),
}));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../netlify/functions/utils/db.js', async () => {
  const { getTableName } = await import('drizzle-orm');
  return { db: {
    select: vi.fn(() => {
      let table = '';
      const query = {
        from: (value: Parameters<typeof getTableName>[0]) => { table = getTableName(value); return query; },
        where: () => query, limit: () => query, orderBy: () => query, offset: () => query, innerJoin: () => query,
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(state.rows.get(table) || []).then(resolve),
      };
      return query;
    }),
    execute: vi.fn(query => query), batch: state.batch,
  } };
});
vi.mock('../netlify/functions/utils/contentHelper.js', async importOriginal => ({
  ...await importOriginal<typeof import('../netlify/functions/utils/contentHelper')>(),
  getOptionalAuth: vi.fn(async () => state.session),
}));

import quizHandler from '../netlify/functions/quizzes';
import lessonHandler from '../netlify/functions/lessons';
import enrollmentHandler from '../netlify/functions/enrollments';
import progressHandler from '../netlify/functions/progress';
const ids = { lesson: '11111111-1111-4111-8111-111111111111', program: '22222222-2222-4222-8222-222222222222', quiz: '33333333-3333-4333-8333-333333333333', question: '44444444-4444-4444-8444-444444444444', option: '55555555-5555-4555-8555-555555555555' };
const quiz = { id: ids.quiz, lessonId: ids.lesson, title: 'Evaluasi', description: 'Uji', passingScore: 70, maxAttempts: 1, isPublished: true };
const question = { id: ids.question, quizId: ids.quiz, type: 'single_choice', text: 'Soal', explanation: 'Rahasia', points: 1 };
const option = { id: ids.option, questionId: ids.question, text: 'Jawaban', isCorrect: true };
const context = {} as Context;

beforeEach(() => {
  state.session = { userId: 'participant', roles: ['participant'] };
  state.rows.clear(); state.batch.mockReset();
  state.rows.set('programs', [{ id: ids.program, status: 'published' }]);
  state.rows.set('lessons', [{ id: ids.lesson, programId: ids.program, title: 'Pertemuan', status: 'published' }]);
  state.rows.set('quizzes', [quiz]); state.rows.set('questions', [question]);
  state.rows.set('question_options', [{ question_options: option }]);
});

describe('Security regressions: execute real API handlers with isolated database fixtures', () => {
  it('GET quiz does not return answers or explanations', async () => {
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}`), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.questions[0]).not.toHaveProperty('explanation');
    expect(body.data.questions[0].options[0]).not.toHaveProperty('isCorrect');
  });
  it('GET lesson cannot bypass quiz answer protection', async () => {
    const response = await lessonHandler(new Request(`http://localhost/api/lessons/${ids.lesson}`), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.quiz).not.toHaveProperty('questions');
    expect(JSON.stringify(body)).not.toContain('isCorrect');
  });
  it('hides a draft quiz through lesson endpoint', async () => {
    state.rows.set('quizzes', [{ ...quiz, isPublished: false }]);
    const response = await lessonHandler(new Request(`http://localhost/api/lessons/${ids.lesson}`), context);
    expect((await response.json()).data.quiz).toBeNull();
  });
  it.each(['draft', 'archived'])('participant cannot read a lesson under %s program', async status => {
    state.rows.set('programs', [{ id: ids.program, status }]);
    const response = await lessonHandler(new Request(`http://localhost/api/lessons/${ids.lesson}`), context);
    expect(response.status).toBe(403);
  });
  it('rejects unpublished quiz attempts before a write', async () => {
    state.rows.set('quizzes', [{ ...quiz, isPublished: false }]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts`, { method: 'POST' }), context);
    expect(response.status).toBe(403); expect(state.batch).not.toHaveBeenCalled();
  });
  it('returns a resumable final attempt from the atomic start query', async () => {
    state.batch.mockResolvedValue([{}, { rows: [{ id: 'active', status: 'in_progress' }] }]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts`, { method: 'POST' }), context);
    expect(response.status).toBe(200); expect((await response.json()).data.id).toBe('active');
    expect(state.batch).toHaveBeenCalledOnce();
  });
  it('rejects an exhausted attempt quota', async () => {
    state.batch.mockResolvedValue([{}, { rows: [] }]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts`, { method: 'POST' }), context);
    expect(response.status).toBe(403);
  });
  it('starts under a lesson lock and resumes active attempts before quota checking', async () => {
    state.batch.mockResolvedValue([{}, { rows: [{ id: 'active', status: 'in_progress' }] }]);
    await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts`, { method: 'POST' }), context);
    const dialect = new PgDialect();
    expect(dialect.sqlToQuery(state.batch.mock.calls[0][0][0]).sql).toContain('pg_advisory_xact_lock');
    const statement = dialect.sqlToQuery(state.batch.mock.calls[0][0][1]);
    expect(statement.sql).toContain('not exists (select 1 from active)');
    expect(statement.sql).toContain('union all');
    expect(statement.params).toContain('participant');
  });
  it('saves submitted answers and server score in a single data-modifying CTE', async () => {
    state.rows.set('quiz_attempts', [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId: 'participant', quizId: ids.quiz, status: 'in_progress' }]);
    state.batch.mockResolvedValue([{}, { rows: [{ id: 'attempt', status: 'submitted', score: 100, passed: true }] }]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/submit`, { method: 'POST', body: JSON.stringify({ score: 999, answers: [{ questionId: ids.question, optionId: ids.option }] }) }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).data.score).toBe(100);
    const statement = new PgDialect().sqlToQuery(state.batch.mock.calls[0][0][1]);
    expect(statement.sql).toContain('insert into quiz_answers');
    expect(statement.sql).toContain('from updated cross join');
    expect(statement.params).not.toContain(999);
  });
  it('rejects slug in UUID program filter with 400 rather than database 500', async () => {
    const response = await lessonHandler(new Request('http://localhost/api/lessons?programId=kajian-tauhid'), context);
    expect(response.status).toBe(400);
  });
  it('rejects submission owned by someone else', async () => {
    state.rows.set('quiz_attempts', [{ id: 'attempt', userId: 'another-user', quizId: ids.quiz, status: 'in_progress' }]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts/attempt/submit`, { method: 'POST', body: JSON.stringify({ answers: [] }) }), context);
    expect(response.status).toBe(403); expect(state.batch).not.toHaveBeenCalled();
  });
  it('rejects submission to a different quiz URL', async () => {
    state.rows.set('quiz_attempts', [{ id: 'attempt', userId: 'participant', quizId: 'different', status: 'in_progress' }]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts/attempt/submit`, { method: 'POST', body: JSON.stringify({ answers: [] }) }), context);
    expect(response.status).toBe(400);
  });
});

describe('Scoring and publication policy', () => {
  it('rejects a correct option from another question', () => {
    expect(() => scoreQuiz([{ id: 'q1', points: 10 }, { id: 'q2', points: 10 }], [{ id: 'o2', questionId: 'q2', isCorrect: true }], [{ questionId: 'q1', optionId: 'o2' }])).toThrow('INVALID_QUIZ_ANSWER');
  });
  it('rejects duplicate answers and foreign questions', () => {
    expect(() => scoreQuiz([question], [option], [{ questionId: ids.question, optionId: ids.option }, { questionId: ids.question, optionId: ids.option }])).toThrow();
    expect(() => scoreQuiz([question], [option], [{ questionId: 'foreign', optionId: ids.option }])).toThrow();
  });
  it('scores only validated server-side points', () => {
    expect(scoreQuiz([question, { id: 'q2', points: 3 }], [option], [{ questionId: ids.question, optionId: ids.option }])).toMatchObject({ score: 25, rawScore: 1, maxScore: 4 });
  });
  it('participants never have editorial read access', () => {
    expect(canReadDrafts(state.session)).toBe(false);
    expect(canReadDrafts(null)).toBe(false);
    expect(canReadDrafts({ userId: 'editor', roles: ['content_contributor'] })).toBe(true);
  });
  it('contributor cannot bypass publication guard by omitting target status', () => {
    expect(() => requireContentUpdateAccess({ userId: 'editor', roles: ['contributor'] }, 'published')).toThrow();
    expect(() => requireContentUpdateAccess({ userId: 'editor', roles: ['publisher'] }, 'published')).not.toThrow();
  });
  it('metadata whitelist excludes unknown sensitive fields', () => {
    expect(publicQuizMetadata({ ...quiz, questions: [question] })).not.toHaveProperty('questions');
  });
});

describe('Enrollment and progress ownership', () => {
  it.each([['enrollments', enrollmentHandler], ['progress', progressHandler]] as const)('keeps %s private without a session', async (resource, handler) => {
    state.session = null;
    const response = await handler(new Request(`http://localhost/api/${resource}`), context);
    expect(response.status).toBe(403);
  });
  it('uses authenticated owner for enrollment, ignoring supplied userId', async () => {
    state.batch.mockResolvedValue([{}, { rows: [{ id: 'enrollment', userId: 'participant', programId: ids.program, status: 'active' }] }]);
    const response = await enrollmentHandler(new Request('http://localhost/api/enrollments', { method: 'POST', body: JSON.stringify({ programId: ids.program, status: 'active', userId: 'attacker' }) }), context);
    expect(response.status).toBe(200);
    const statement = new PgDialect().sqlToQuery(state.batch.mock.calls[0][0][1]);
    expect(statement.params).toContain('participant');
    expect(statement.params).not.toContain('attacker');
  });
  it('uses authenticated owner and atomic partial update for progress', async () => {
    state.batch.mockResolvedValue([{}, { rows: [{ id: 'progress', userId: 'participant', lessonId: ids.lesson, isCompleted: true }] }]);
    const response = await progressHandler(new Request('http://localhost/api/progress', { method: 'POST', body: JSON.stringify({ lessonId: ids.lesson, isCompleted: true, userId: 'attacker' }) }), context);
    expect(response.status).toBe(200);
    const statement = new PgDialect().sqlToQuery(state.batch.mock.calls[0][0][1]);
    expect(statement.sql).toContain('coalesce(');
    expect(statement.params).toContain('participant');
    expect(statement.params).not.toContain('attacker');
  });
  it('does not create database records for a synthetic demo account', async () => {
    state.session = { userId: 'demo-peserta-1', roles: ['participant'], isDevelopmentDemo: true };
    const response = await progressHandler(new Request('http://localhost/api/progress', { method: 'POST', body: JSON.stringify({ lessonId: ids.lesson, isCompleted: true }) }), context);
    expect(response.status).toBe(409);
    expect(state.batch).not.toHaveBeenCalled();
  });
});

describe('Quiz result review policy', () => {
  const submitted = { id: 'attempt', quizId: ids.quiz, userId: 'participant', status: 'submitted', score: 100, passed: true };
  const answer = { questionId: ids.question, optionId: ids.option, isCorrectSnapshot: true };
  it('does not return a key or per-question correctness while retries remain', async () => {
    state.rows.set('quiz_attempts', [submitted]);
    state.rows.set('quizzes', [{ ...quiz, maxAttempts: 3 }]);
    state.rows.set('quiz_answers', [answer]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts/attempt`), context);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.reviewAvailable).toBe(false);
    expect(body.data.review).toEqual([]);
    expect(body.data.answers[0]).not.toHaveProperty('isCorrectSnapshot');
    expect(JSON.stringify(body)).not.toContain('Rahasia');
  });
  it('releases explanations to the owner after all attempts are submitted', async () => {
    state.rows.set('quiz_attempts', [submitted]);
    state.rows.set('quiz_answers', [answer]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts/attempt`), context);
    const body = await response.json();
    expect(body.data.reviewAvailable).toBe(true);
    expect(body.data.review[0]).toMatchObject({ explanation: 'Rahasia', correctAnswerText: 'Jawaban', chosenAnswerText: 'Jawaban', isCorrect: true });
  });
  it('does not release explanations if an in-progress attempt still exists', async () => {
    state.rows.set('quiz_attempts', [submitted, { ...submitted, id: 'pending', status: 'in_progress' }]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts/attempt`), context);
    expect((await response.json()).data.reviewAvailable).toBe(false);
  });
  it('never returns another participant result or explanation', async () => {
    state.rows.set('quiz_attempts', [{ ...submitted, userId: 'someone-else' }]);
    const response = await quizHandler(new Request(`http://localhost/api/quizzes/${ids.quiz}/attempts/attempt`), context);
    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).not.toContain('Rahasia');
  });
});
