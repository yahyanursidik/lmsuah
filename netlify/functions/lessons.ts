import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { lessons, lessonVideos, lessonAttachments, quizzes, questions, questionOptions } from './db/schema/index.js';
import { eq, and, asc, count, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import { ForbiddenError } from './middleware/auth.js';
import {
  getOptionalAuth,
  parseQueryParams,
  requireContentCreateAccess,
  requireContentUpdateAccess,
  requireContentDeleteAccess,
  logMutationAudit,
  isGuest,
  getDatabaseActorId,
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['status', 'title', 'slug', 'programId', 'chapterId'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title', 'sequence', 'date'];

const extractYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const materialSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['youtube', 'PDF', 'audio', 'drive', 'DOCX', 'link']),
  url: z.string().url('URL materi tidak valid'),
  filename: z.string().max(200).optional(),
  duration: z.string().max(40).optional(),
}).superRefine((material, context) => {
  if (material.type === 'youtube' && !extractYouTubeId(material.url)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'URL YouTube tidak valid' });
  }
});

const quizSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(180),
  description: z.string().max(1000).optional(),
  passingScore: z.number().int().min(0).max(100),
  maxAttempts: z.number().int().min(1).max(20),
  isPublished: z.boolean(),
  questions: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(['single_choice', 'true_false']),
    text: z.string().min(1).max(1000),
    explanation: z.string().max(2000).optional(),
    points: z.number().int().min(1).max(100),
    options: z.array(z.object({
      id: z.string().optional(),
      text: z.string().min(1).max(500),
      isCorrect: z.boolean(),
    })).min(2).refine(
      (options) => options.filter((option) => option.isCorrect).length === 1,
      'Setiap soal harus memiliki tepat satu jawaban benar',
    ),
  })).min(1, 'Kuis harus memiliki minimal satu soal'),
});

const lessonSchema = z.object({
  programId: z.string().optional(),
  chapterId: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  sequence: z.number().int(),
  date: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  
  materials: z.array(materialSchema).optional(),
  quiz: quizSchema.nullable().optional(),
});

const lessonUpdateSchema = lessonSchema.partial();
type LessonInput = z.infer<typeof lessonSchema>;
type LessonMaterial = NonNullable<LessonInput['materials']>[number];
type LessonQuiz = NonNullable<LessonInput['quiz']>;

const lessonsHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    const isGuestUser = isGuest(session);

    if (resourceId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      const condition = isUuid ? eq(lessons.id, resourceId) : eq(lessons.slug, resourceId);

      const items = await db.select().from(lessons).where(condition).limit(1);
      const item = items[0];

      if (!item) throw new Error('Lesson tidak ditemukan');
      if (isGuestUser && item.status !== 'published') throw new ForbiddenError('Tamu tidak diizinkan');

      // Fetch materials
      const vids = await db.select().from(lessonVideos).where(eq(lessonVideos.lessonId, item.id));
      const atts = await db.select().from(lessonAttachments).where(eq(lessonAttachments.lessonId, item.id));
      
      const materials = [
        ...vids.map(v => ({ id: v.id, type: 'youtube', url: `https://youtube.com/watch?v=${v.youtubeId}`, duration: v.duration })),
        ...atts.map(a => ({ id: a.id, type: a.type, url: a.url, filename: a.filename }))
      ];

      // Fetch Quiz
      const quizRes = await db.select().from(quizzes).where(eq(quizzes.lessonId, item.id)).limit(1);
      let quiz = null;
      
      if (quizRes.length > 0) {
        const qz = quizRes[0];
        const qs = await db.select().from(questions).where(eq(questions.quizId, qz.id));
        const opts = await db.select().from(questionOptions)
          .innerJoin(questions, eq(questionOptions.questionId, questions.id))
          .where(eq(questions.quizId, qz.id));

        const formattedQuestions = qs.map(q => ({
          ...q,
          options: opts.filter(o => o.question_options.questionId === q.id).map(o => o.question_options)
        }));

        quiz = {
          ...qz,
          questions: formattedQuestions
        };
      }

      return { ...item, materials, quiz };
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);
    const conditions = [];
    if (isGuestUser) conditions.push(eq(lessons.status, 'published'));
    else if (query.filters.status) conditions.push(eq(lessons.status, query.filters.status));

    if (query.filters.slug) conditions.push(eq(lessons.slug, query.filters.slug));
    if (query.filters.programId) conditions.push(eq(lessons.programId, query.filters.programId));
    if (query.filters.chapterId) conditions.push(eq(lessons.chapterId, query.filters.chapterId));
    if (query.filters.title) conditions.push(sql`${lessons.title} ILIKE ${'%' + query.filters.title + '%'}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = asc(lessons.sequence);

    const [data, totalCount] = await Promise.all([
      db.select().from(lessons).where(whereClause).orderBy(orderByClause).limit(query.limit).offset(query.offset),
      db.select({ count: count() }).from(lessons).where(whereClause),
    ]);

    const lessonIds = data.map((item) => item.id);
    const [videos, attachments, lessonQuizzes] = lessonIds.length > 0
      ? await Promise.all([
          db.select({ lessonId: lessonVideos.lessonId }).from(lessonVideos).where(inArray(lessonVideos.lessonId, lessonIds)),
          db.select({ lessonId: lessonAttachments.lessonId }).from(lessonAttachments).where(inArray(lessonAttachments.lessonId, lessonIds)),
          db.select({ lessonId: quizzes.lessonId }).from(quizzes).where(inArray(quizzes.lessonId, lessonIds)),
        ])
      : [[], [], []];

    const enrichedData = data.map((item) => ({
      ...item,
      materialCount:
        videos.filter((video) => video.lessonId === item.id).length +
        attachments.filter((attachment) => attachment.lessonId === item.id).length,
      hasQuiz: lessonQuizzes.some((quiz) => quiz.lessonId === item.id),
    }));

    return {
      items: enrichedData,
      total: totalCount[0]?.count || 0,
      page: query.page,
      limit: query.limit,
    };
  }

  const syncMaterials = async (lessonId: string, bodyMaterials: LessonMaterial[]) => {
    await db.delete(lessonVideos).where(eq(lessonVideos.lessonId, lessonId));
    await db.delete(lessonAttachments).where(eq(lessonAttachments.lessonId, lessonId));

    if (bodyMaterials && bodyMaterials.length > 0) {
      for (const mat of bodyMaterials) {
        if (mat.type === 'youtube') {
          const ytId = extractYouTubeId(mat.url);
          if (ytId) {
            await db.insert(lessonVideos).values({ lessonId, youtubeId: ytId, duration: mat.duration });
          }
        } else {
          await db.insert(lessonAttachments).values({ lessonId, filename: mat.filename || 'Lampiran', url: mat.url, type: mat.type });
        }
      }
    }

  };

  const syncQuiz = async (lessonId: string, bodyQuiz: LessonQuiz | null) => {
    const existingQuizzes = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
    if (existingQuizzes.length > 0) {
       for(const eqz of existingQuizzes) {
          const qs = await db.select().from(questions).where(eq(questions.quizId, eqz.id));
          for (const q of qs) {
            await db.delete(questionOptions).where(eq(questionOptions.questionId, q.id));
          }
          await db.delete(questions).where(eq(questions.quizId, eqz.id));
       }
       await db.delete(quizzes).where(eq(quizzes.lessonId, lessonId));
    }

    if (bodyQuiz) {
       const [newQuiz] = await db.insert(quizzes).values({
          lessonId,
          title: bodyQuiz.title,
          description: bodyQuiz.description,
          passingScore: bodyQuiz.passingScore,
          maxAttempts: bodyQuiz.maxAttempts,
          isPublished: bodyQuiz.isPublished,
       }).returning();

       for (const q of bodyQuiz.questions) {
          const [newQ] = await db.insert(questions).values({
             quizId: newQuiz.id,
             type: q.type,
             text: q.text,
             explanation: q.explanation,
             points: q.points,
          }).returning();

          if (q.options && q.options.length > 0) {
             const opts = q.options.map((o) => ({
                questionId: newQ.id,
                text: o.text,
                isCorrect: o.isCorrect
             }));
             await db.insert(questionOptions).values(opts);
          }
       }
    }
  };

  if (method === 'POST') {
    const body = await validateBody(request, lessonSchema);
    const authSession = requireContentCreateAccess(session, body.status);
    const databaseActorId = getDatabaseActorId(authSession);
    const duplicate = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.slug, body.slug)).limit(1);
    if (duplicate[0]) throw new Error('LESSON_SLUG_EXISTS');

    const [newLesson] = await db.insert(lessons).values({
        slug: body.slug,
        title: body.title,
        programId: body.programId,
        chapterId: body.chapterId,
        sequence: body.sequence,
        date: body.date,
        description: body.description,
        status: body.status,
        createdBy: databaseActorId,
        updatedBy: databaseActorId,
      }).returning();

    await syncMaterials(newLesson.id, body.materials || []);
    await syncQuiz(newLesson.id, body.quiz || null);
    logMutationAudit('CREATE', 'lessons', newLesson.id, authSession.userId, { title: newLesson.title });
    return newLesson;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) throw new Error('ID lesson diperlukan');
    const body = await validateBody(request, lessonUpdateSchema);
    const existing = await db.select().from(lessons).where(eq(lessons.id, resourceId)).limit(1);

    if (!existing[0]) throw new Error('Lesson tidak ditemukan');
    const authSession = requireContentUpdateAccess(session, existing[0].status, body.status);
    const databaseActorId = getDatabaseActorId(authSession);
    if (body.slug && body.slug !== existing[0].slug) {
      const duplicate = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.slug, body.slug)).limit(1);
      if (duplicate[0]) throw new Error('LESSON_SLUG_EXISTS');
    }

    const [updatedLesson] = await db.update(lessons).set({
        ...(body.slug && { slug: body.slug }),
        ...(body.title && { title: body.title }),
        ...(body.programId !== undefined && { programId: body.programId }),
        ...(body.chapterId !== undefined && { chapterId: body.chapterId }),
        ...(body.sequence !== undefined && { sequence: body.sequence }),
        ...(body.date !== undefined && { date: body.date }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
        updatedBy: databaseActorId,
        updatedAt: new Date(),
      }).where(eq(lessons.id, resourceId)).returning();

    // PATCH is deliberately partial: editing meeting information must not erase
    // materials or the quiz, and editing one content type must preserve the other.
    if (body.materials !== undefined) await syncMaterials(resourceId, body.materials);
    if (body.quiz !== undefined) await syncQuiz(resourceId, body.quiz);
    logMutationAudit('UPDATE', 'lessons', resourceId, authSession.userId, { changes: { title: body.title } });
    return updatedLesson;
  }

  if (method === 'DELETE') {
    if (!resourceId) throw new Error('ID lesson diperlukan');
    const authSession = requireContentDeleteAccess(session);
    
    // Simplification: We delete materials, but we'd need to delete quizzes properly too.
    // Assuming cascading or explicit deletion is handled (it deletes quizzes too now).
    await syncMaterials(resourceId, []);
    await syncQuiz(resourceId, null);

    await db.delete(lessons).where(eq(lessons.id, resourceId));
    logMutationAudit('DELETE', 'lessons', resourceId, authSession.userId, { deletedId: resourceId });
    return { message: 'Lesson berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export const handler = createHandler(lessonsHandler);
export default handler;

export const config: Config = {
  path: ['/api/lessons', '/api/lessons/*'],
};
