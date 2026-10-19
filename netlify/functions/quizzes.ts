import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { quizzes, questions, questionOptions, quizAttempts, quizAnswers, lessons, programs } from './db/schema/index.js';
import { eq, and, count, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import { ForbiddenError } from './middleware/auth.js';
import { getOptionalAuth, isGuest, parseQueryParams } from './utils/contentHelper.js';
import { canReadDrafts, scoreQuiz } from './utils/content-policy.js';
import { assertQuizReadable, assertQuizHistoryReadable, quizMutationLockSql, quizMutationScopeSql } from './utils/publication-quiz-access.js';
import { publicPublicationQuiz } from '../../shared/publication-projection.js';
import { HttpError } from './utils/http-error.js';

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      optionId: z.string().uuid(),
    })
  ),
});

const quizzesHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  // Parse path: /api/quizzes/:quizId[/attempts[/:attemptId[/submit]]]
  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;
  const isAttemptsAction = pathParts.length > 3 && pathParts[3] === 'attempts';
  const attemptId = pathParts.length > 4 ? pathParts[4] : null;
  const isSubmit = pathParts.length > 5 && pathParts[5] === 'submit';
  if (method === 'GET' && resourceId === 'history') {
    if (isGuest(session)) throw new ForbiddenError('Masuk untuk melihat hasil evaluasi.');
    const query = parseQueryParams(url, [], []);
    const where = and(eq(quizAttempts.userId, session!.userId), eq(quizAttempts.status, 'submitted'));
    const [items, totals] = await Promise.all([
      db.select({ id: quizAttempts.id, quizId: quizzes.id, title: quizzes.title, lessonId: quizzes.lessonId, programId: lessons.programId, score: quizAttempts.score, passed: quizAttempts.passed, submittedAt: quizAttempts.submittedAt }).from(quizAttempts).innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId)).innerJoin(lessons, eq(lessons.id, quizzes.lessonId)).where(where).orderBy(desc(quizAttempts.submittedAt), desc(quizAttempts.id)).limit(query.limit).offset(query.offset),
      db.select({ count: count() }).from(quizAttempts).where(where),
    ]);
    return { items, total: totals[0]?.count || 0, page: query.page, limit: query.limit };
  }
  if (method === 'GET' && resourceId === 'active') {
    if (isGuest(session)) throw new ForbiddenError('Masuk untuk melihat kuis yang sedang dikerjakan.');
    const query = parseQueryParams(url, ['lessonId'], []);
    if (query.filters.lessonId && !z.string().uuid().safeParse(query.filters.lessonId).success) throw new HttpError(400, 'lessonId tidak valid.');
    const where = and(eq(quizAttempts.userId, session!.userId), eq(quizAttempts.status, 'in_progress'), eq(programs.status, 'published'), eq(quizzes.isPublished, true), query.filters.lessonId ? eq(quizzes.lessonId, query.filters.lessonId) : undefined);
    const [items, totals] = await Promise.all([
      db.select({ id: quizAttempts.id, quizId: quizzes.id, title: quizzes.title, lessonId: quizzes.lessonId, programId: lessons.programId, startedAt: quizAttempts.startedAt }).from(quizAttempts).innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId)).innerJoin(lessons, eq(lessons.id, quizzes.lessonId)).innerJoin(programs, eq(programs.id, lessons.programId)).where(where).orderBy(desc(quizAttempts.startedAt), desc(quizAttempts.id)).limit(query.limit).offset(query.offset),
      db.select({ count: count() }).from(quizAttempts).innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId)).innerJoin(lessons, eq(lessons.id, quizzes.lessonId)).innerJoin(programs, eq(programs.id, lessons.programId)).where(where),
    ]);
    return { items, total: totals[0]?.count || 0, page: query.page, limit: query.limit };
  }

  // Attempt history contains only this participant's own metadata. Answer keys
  // are returned exclusively by the exhausted-attempt result policy below.
  if (method === 'GET' && resourceId && isAttemptsAction && !attemptId) {
    if (isGuest(session)) throw new ForbiddenError('Masuk untuk melihat riwayat kuis.');
    const items = await db.select().from(quizAttempts)
      .where(and(eq(quizAttempts.quizId, resourceId), eq(quizAttempts.userId, session!.userId)))
      .orderBy(desc(quizAttempts.startedAt));
    return { items, total: items.length };
  }

  // GET /api/quizzes/:id
  if (method === 'GET' && resourceId && !isAttemptsAction) {
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, resourceId)).limit(1);
    const quiz = quizResult[0];

    if (!quiz) {
      return Response.json({ error: { message: 'Quiz not found' } }, { status: 404 });
    }

    const historyView = url.searchParams.get('history') === '1';
    const access = historyView ? await assertQuizHistoryReadable(quiz, session) : await assertQuizReadable(quiz, session);
    if (!quiz.isPublished && !canReadDrafts(session) && !historyView) {
      throw new ForbiddenError('This quiz is not published yet.');
    }

    if (access.snapshot) return { ...publicPublicationQuiz(access.snapshot), canStartAttempt: access.allowNewAttempt };
    // Fetch questions and options
    const qs = await db.select().from(questions).where(eq(questions.quizId, quiz.id));
    const opts = await db.select().from(questionOptions)
      // Note: IN clause would be better but requires extracting IDs, Drizzle query builder works with simple joins too,
      // but let's fetch all options for this quiz via a left join or two separate queries.
      // Easiest is to fetch all options for all questions in this quiz.
      .innerJoin(questions, eq(questionOptions.questionId, questions.id))
      .where(eq(questions.quizId, quiz.id));

    // Determine if we should show explanations/correct answers.
    // If the user has a submitted attempt, we might allow it. For MVP, we NEVER expose `isCorrect` on GET /quizzes/:id.
    // The explanations and correct options will only be fetched in a dedicated /attempts/:id result endpoint.
    
    const formattedQuestions = qs.map(q => {
      const qOpts = opts
        .filter(o => o.question_options.questionId === q.id)
        .map(o => ({
          id: o.question_options.id,
          text: o.question_options.text,
          // EXPLICITLY OMITTING isCorrect
        }));

      return {
        id: q.id,
        type: q.type,
        text: q.text,
        points: q.points,
        options: qOpts,
        // EXPLICITLY OMITTING explanation
      };
    });

    return Response.json({
      data: {
        ...quiz,
        canStartAttempt: access.allowNewAttempt,
        questions: formattedQuestions
      }
    }, { status: 200 });
  }

  // POST /api/quizzes/:id/attempts (Start Attempt)
  if (method === 'POST' && resourceId && isAttemptsAction && !attemptId) {
    if (isGuest(session)) throw new ForbiddenError('Must be logged in to start a quiz.');
    if (session?.isDevelopmentDemo) throw new HttpError(409, 'Gunakan akun peserta nyata untuk menyimpan percobaan dan nilai kuis.');
    const userId = session!.userId;

    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, resourceId)).limit(1);
    const quiz = quizResult[0];
    if (!quiz) return Response.json({ error: { message: 'Quiz not found' } }, { status: 404 });

    const access = await assertQuizReadable(quiz, session, true);
    // Separate statements in one transaction: the second sees commits made by
    // a previous holder of this lock. A single statement snapshot is not enough.
    const [, result] = await db.batch([
      db.execute(quizMutationLockSql(quiz.lessonId)),
      db.execute(sql`with active as (
        select * from quiz_attempts where quiz_id = ${quiz.id}::uuid and user_id = ${userId} and status = 'in_progress' and ${quizMutationScopeSql(quiz.id, userId, true)} order by started_at limit 1
      ), created as (
        insert into quiz_attempts (quiz_id, user_id, status)
        select ${quiz.id}::uuid, ${userId}, 'in_progress'
        where not exists (select 1 from active) and ${access.allowNewAttempt}
        and (select count(*) from quiz_attempts where quiz_id = ${quiz.id}::uuid and user_id = ${userId}) < ${quiz.maxAttempts}
        and ${quizMutationScopeSql(quiz.id, userId, false)}
        returning *
      ) select id, quiz_id as "quizId", user_id as "userId", status, score, passed from active
      union all select id, quiz_id, user_id, status, score, passed from created`),
    ]);
    if (!result.rows[0]) throw new ForbiddenError(`Batas ${quiz.maxAttempts} percobaan tercapai atau kuis tidak lagi tersedia.`);
    return Response.json({ data: result.rows[0] }, { status: 200 });
  }

  // POST /api/quizzes/:id/attempts/:attemptId/submit
  if (method === 'POST' && resourceId && isAttemptsAction && attemptId && isSubmit) {
    if (isGuest(session)) throw new ForbiddenError('Must be logged in to submit a quiz.');
    const userId = session!.userId;

    const data = await validateBody(request, submitSchema);

    const attemptRes = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
    const attempt = attemptRes[0];

    if (!attempt) return Response.json({ error: { message: 'Attempt not found' } }, { status: 404 });
    if (attempt.userId !== userId) throw new ForbiddenError('You can only submit your own attempts.');
    if (attempt.quizId !== resourceId) throw new HttpError(400, 'Percobaan tidak cocok dengan kuis.');
    if (attempt.status === 'submitted') return Response.json({ data: attempt });

    const quizRes = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId)).limit(1);
    const quiz = quizRes[0];
    if (!quiz) throw new HttpError(404, 'Kuis tidak ditemukan');
    const access = await assertQuizReadable(quiz, session, true);

    // Fetch all questions and options to score on server
    const qs = await db.select().from(questions).where(eq(questions.quizId, quiz.id));
    const allOpts = await db.select().from(questionOptions)
      .innerJoin(questions, eq(questionOptions.questionId, questions.id))
      .where(eq(questions.quizId, quiz.id));

    if (!qs.length) throw new HttpError(409, 'Kuis belum memiliki soal.');
    let scoring: ReturnType<typeof scoreQuiz>;
    try { scoring = scoreQuiz(access.snapshot?.questions || qs, access.snapshot ? access.snapshot.questions.flatMap(question => question.options) : allOpts.map(o => o.question_options), data.answers); }
    catch { throw new HttpError(400, 'Jawaban harus berasal dari soal dan kuis yang sama, tanpa duplikat.'); }
    const passed = scoring.score >= quiz.passingScore;
    const [, result] = await db.batch([
      db.execute(quizMutationLockSql(quiz.lessonId)),
      db.execute(sql`with updated as (
        update quiz_attempts set status = 'submitted', score = ${scoring.score}, passed = ${passed}, submitted_at = now()
        where id = ${attempt.id}::uuid and user_id = ${userId} and status = 'in_progress'
        and ${quizMutationScopeSql(quiz.id, userId, true)}
        returning *
      ), saved as (
        insert into quiz_answers (attempt_id, question_id, option_id, is_correct_snapshot)
        select updated.id, a."questionId"::uuid, a."optionId"::uuid, a."isCorrectSnapshot"
        from updated cross join jsonb_to_recordset(${JSON.stringify(scoring.scored)}::jsonb)
        as a("questionId" text, "optionId" text, "isCorrectSnapshot" boolean)
        returning id
      ) select id, status, score, passed from updated`),
    ]);
    const updated = result.rows[0];
    if (!updated) {
      const [current] = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attempt.id)).limit(1);
      if (current?.status === 'submitted') return Response.json({ data: current });
      throw new HttpError(409, 'Kuis berubah atau tidak tersedia. Muat ulang sebelum mencoba lagi.');
    }
    return Response.json({ data: { ...updated, maxScore: scoring.maxScore, rawScore: scoring.rawScore } });
  }
  
  // GET /api/quizzes/:id/attempts/:attemptId (Result view with feedback)
  if (method === 'GET' && resourceId && isAttemptsAction && attemptId && !isSubmit) {
    if (isGuest(session)) throw new ForbiddenError('Must be logged in to view attempt results.');
    const userId = session!.userId;
    
    const attemptRes = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
    const attempt = attemptRes[0];
    
    if (!attempt) return Response.json({ error: { message: 'Attempt not found' } }, { status: 404 });
    if (attempt.userId !== userId) throw new ForbiddenError('You can only view your own attempts.');
    if (attempt.quizId !== resourceId) throw new HttpError(400, 'Percobaan tidak cocok dengan kuis.');
    
    // Only return answers/explanations if submitted
    if (attempt.status !== 'submitted') {
      return Response.json({ data: attempt }, { status: 200 });
    }
    
    const answers = await db.select().from(quizAnswers).where(eq(quizAnswers.attemptId, attempt.id));
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId)).limit(1);
    const attempts = await db.select().from(quizAttempts).where(and(eq(quizAttempts.quizId, attempt.quizId), eq(quizAttempts.userId, userId)));
    const reviewAvailable = Boolean(quiz && attempts.filter(item => item.status === 'submitted').length >= quiz.maxAttempts && !attempts.some(item => item.status === 'in_progress'));
    let review: Array<{ questionId: string; text: string; explanation: string | null; chosenAnswerText: string | null; correctAnswerText: string | null; isCorrect: boolean }> = [];
    if (reviewAvailable) {
      const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, attempt.quizId));
      const options = await db.select().from(questionOptions).innerJoin(questions, eq(questionOptions.questionId, questions.id)).where(eq(questions.quizId, attempt.quizId));
      review = quizQuestions.map(question => {
        const answer = answers.find(item => item.questionId === question.id);
        const choices = options.filter(item => item.question_options.questionId === question.id).map(item => item.question_options);
        return { questionId: question.id, text: question.text, explanation: question.explanation,
          chosenAnswerText: choices.find(option => option.id === answer?.optionId)?.text || null,
          correctAnswerText: choices.find(option => option.isCorrect)?.text || null,
          isCorrect: Boolean(answer?.isCorrectSnapshot) };
      });
    }
    
    // Return attempt with answers
    return Response.json({
      data: {
        ...attempt,
        answers: reviewAvailable ? answers : answers.map(answer => ({ questionId: answer.questionId, optionId: answer.optionId })),
        reviewAvailable,
        review,
        reviewMessage: reviewAvailable ? 'Pembahasan tersedia setelah seluruh percobaan selesai.' : 'Pembahasan dan kunci tersedia setelah seluruh kesempatan percobaan digunakan dan dikirim.'
      }
    }, { status: 200 });
  }

  return Response.json({ error: { message: 'Method or route not allowed' } }, { status: 405 });
};

export default createHandler(quizzesHandler);

export const config: Config = {
  path: ['/api/quizzes', '/api/quizzes/*'],
};
