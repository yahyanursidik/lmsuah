import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@netlify/functions';

const state = vi.hoisted(() => ({
  active: 0, maximum: 0, tables: [] as string[],
  roles: ['administrator'],
}));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../netlify/functions/utils/db.js', async () => {
  const { getTableName } = await import('drizzle-orm');
  return { db: { select: () => {
    let table = '';
    const query = {
      from: (value: Parameters<typeof getTableName>[0]) => { table = getTableName(value); return query; },
      where: () => query, limit: () => query, orderBy: () => query, innerJoin: () => query,
      then: (resolve: (rows: unknown[]) => unknown) => {
        state.active++; state.maximum = Math.max(state.maximum, state.active); state.tables.push(table);
        return new Promise<unknown[]>(done => setTimeout(() => {
          state.active--;
          done(table === 'lessons' ? [{ id: 'lesson', programId: 'program', status: 'published' }]
            : table === 'programs' ? [{ status: 'published' }]
            : table === 'quizzes' ? [{ id: 'quiz', isPublished: true }]
            : table === 'questions' ? [{ id: 'question' }]
            : table === 'question_options' ? [{ question_options: { questionId: 'question', isCorrect: true } }]
            : []);
        }, 10)).then(resolve);
      },
    };
    return query;
  } } };
});
vi.mock('../netlify/functions/utils/contentHelper.js', async importOriginal => ({
  ...await importOriginal<typeof import('../netlify/functions/utils/contentHelper')>(),
  getOptionalAuth: async () => ({ userId: 'user', roles: state.roles }),
}));
import handler from '../netlify/functions/lessons';

beforeEach(() => {
  state.active = 0; state.maximum = 0; state.tables = []; state.roles = ['administrator'];
});

describe('Lesson detail read concurrency with real handler and isolated DB', () => {
  it('overlaps independent material/quiz reads and admin quiz detail reads', async () => {
    const response = await handler(new Request('http://localhost/api/lessons/pertemuan'), {} as Context);
    expect(response.status).toBe(200);
    expect(state.maximum).toBeGreaterThanOrEqual(3);
    expect(state.active).toBe(0);
    expect(state.tables).toContain('quiz_attempts');
    expect((await response.json()).data.quiz.questions[0].options[0].isCorrect).toBe(true);
  });
  it('does not fetch private question/answer rows for a participant', async () => {
    state.roles = ['participant'];
    const response = await handler(new Request('http://localhost/api/lessons/pertemuan'), {} as Context);
    expect(response.status).toBe(200);
    expect(state.maximum).toBeGreaterThanOrEqual(3);
    expect(state.tables).not.toContain('questions');
    expect((await response.json()).data.quiz).not.toHaveProperty('questions');
  });
});
