import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { quizzes, questions, questionOptions, quizAttempts, quizAnswers } from './db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import { ForbiddenError } from './middleware/auth.js';
import { getOptionalAuth, isGuest } from './utils/contentHelper.js';

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

  // GET /api/quizzes/:id
  if (method === 'GET' && resourceId && !isAttemptsAction) {
    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, resourceId)).limit(1);
    const quiz = quizResult[0];

    if (!quiz) {
      return new Response(JSON.stringify({ error: { message: 'Quiz not found' } }), { status: 404 });
    }

    if (!quiz.isPublished && isGuest(session)) {
      throw new ForbiddenError('This quiz is not published yet.');
    }

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

    return new Response(JSON.stringify({
      data: {
        ...quiz,
        questions: formattedQuestions
      }
    }), { status: 200 });
  }

  // POST /api/quizzes/:id/attempts (Start Attempt)
  if (method === 'POST' && resourceId && isAttemptsAction && !attemptId) {
    if (isGuest(session)) throw new ForbiddenError('Must be logged in to start a quiz.');
    const userId = session!.userId;

    const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, resourceId)).limit(1);
    const quiz = quizResult[0];
    if (!quiz) return new Response(JSON.stringify({ error: { message: 'Quiz not found' } }), { status: 404 });

    // Check max attempts
    const previousAttempts = await db.select().from(quizAttempts)
      .where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, userId)));
    
    if (previousAttempts.length >= quiz.maxAttempts) {
      throw new ForbiddenError(`You have reached the maximum number of attempts (${quiz.maxAttempts}) for this quiz.`);
    }

    // Check if there is an existing in-progress attempt
    const inProgress = previousAttempts.find(a => a.status === 'in_progress');
    if (inProgress) {
      return new Response(JSON.stringify({ data: inProgress }), { status: 200 }); // Return existing
    }

    const newAttempt = await db.insert(quizAttempts).values({
      quizId: quiz.id,
      userId,
      status: 'in_progress'
    }).returning();

    return new Response(JSON.stringify({ data: newAttempt[0] }), { status: 201 });
  }

  // POST /api/quizzes/:id/attempts/:attemptId/submit
  if (method === 'POST' && resourceId && isAttemptsAction && attemptId && isSubmit) {
    if (isGuest(session)) throw new ForbiddenError('Must be logged in to submit a quiz.');
    const userId = session!.userId;

    const data: any = await validateBody(request, submitSchema);

    const attemptRes = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
    const attempt = attemptRes[0];

    if (!attempt) return new Response(JSON.stringify({ error: { message: 'Attempt not found' } }), { status: 404 });
    if (attempt.userId !== userId) throw new ForbiddenError('You can only submit your own attempts.');
    if (attempt.status === 'submitted') throw new ForbiddenError('This attempt has already been submitted.');

    const quizRes = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId)).limit(1);
    const quiz = quizRes[0];

    // Fetch all questions and options to score on server
    const qs = await db.select().from(questions).where(eq(questions.quizId, quiz.id));
    const allOpts = await db.select().from(questionOptions)
      .innerJoin(questions, eq(questionOptions.questionId, questions.id))
      .where(eq(questions.quizId, quiz.id));

    let totalScore = 0;
    const maxScore = qs.reduce((sum, q) => sum + q.points, 0);

    const answerInserts = [];

    for (const q of qs) {
      const userAnswer = data.answers.find((a: any) => a.questionId === q.id);
      let isCorrect = false;

      if (userAnswer) {
        const option = allOpts.find(o => o.question_options.id === userAnswer.optionId);
        if (option && option.question_options.isCorrect) {
          isCorrect = true;
          totalScore += q.points;
        }
        answerInserts.push({
          attemptId: attempt.id,
          questionId: q.id,
          optionId: userAnswer.optionId,
          isCorrectSnapshot: isCorrect
        });
      } else {
        answerInserts.push({
          attemptId: attempt.id,
          questionId: q.id,
          optionId: null, // unanswered
          isCorrectSnapshot: false
        });
      }
    }

    // Insert answers
    if (answerInserts.length > 0) {
      await db.insert(quizAnswers).values(answerInserts);
    }

    // Calculate percentage and passing status
    const percentageScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentageScore >= quiz.passingScore;

    const updatedAttempt = await db.update(quizAttempts)
      .set({
        status: 'submitted',
        score: percentageScore,
        passed,
        submittedAt: new Date()
      })
      .where(eq(quizAttempts.id, attempt.id))
      .returning();

    return new Response(JSON.stringify({
      data: {
        ...updatedAttempt[0],
        maxScore,
        rawScore: totalScore
      }
    }), { status: 200 });
  }
  
  // GET /api/quizzes/:id/attempts/:attemptId (Result view with feedback)
  if (method === 'GET' && resourceId && isAttemptsAction && attemptId && !isSubmit) {
    if (isGuest(session)) throw new ForbiddenError('Must be logged in to view attempt results.');
    const userId = session!.userId;
    
    const attemptRes = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
    const attempt = attemptRes[0];
    
    if (!attempt) return new Response(JSON.stringify({ error: { message: 'Attempt not found' } }), { status: 404 });
    if (attempt.userId !== userId) throw new ForbiddenError('You can only view your own attempts.');
    
    // Only return answers/explanations if submitted
    if (attempt.status !== 'submitted') {
      return new Response(JSON.stringify({ data: attempt }), { status: 200 });
    }
    
    const answers = await db.select().from(quizAnswers).where(eq(quizAnswers.attemptId, attempt.id));
    
    // Return attempt with answers
    return new Response(JSON.stringify({
      data: {
        ...attempt,
        answers
      }
    }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: { message: 'Method or route not allowed' } }), { status: 405 });
};

export const handler = createHandler(quizzesHandler);

export const config: Config = {
  path: ['/api/quizzes', '/api/quizzes/*'],
};
