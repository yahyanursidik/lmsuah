import type { Config } from '@netlify/functions';
import { programReadColumns } from "./utils/program-columns.js";
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { lessons, lessonVideos, lessonAttachments, lessonMarkers, quizzes, quizAttempts, questions, questionOptions, programs, chapters, lessonQuizDrafts } from './db/schema/index.js';
import { eq, and, asc, desc, count, sql, inArray } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { z } from 'zod';
import { validateBody, ValidationError } from './utils/validation.js';
import { ForbiddenError } from './middleware/auth.js';
import { canReadDrafts, publicQuizMetadata } from './utils/content-policy.js';
import { HttpError } from './utils/http-error.js';
import { publishedTranscriptMaterials } from './utils/transcript-materials.js';
import { featureRequested } from './utils/advanced-features.js';
import { assertDeletionAllowed, lessonDeletionCleanup, validateDeletionId } from './utils/deletion-policy.js';
import { assertLegacyWorkspaceWritable, getProgramPublication, legacyWorkspaceGuardWrites, publishedSnapshotLesson } from './utils/program-snapshots.js';
import { publicPublicationLesson } from '../../shared/publication-projection.js';
import { readPublishedLessonList } from './utils/publication-readers.js';
import {
  getOptionalAuth,
  parseQueryParams,
  requireContentCreateAccess,
  requireContentUpdateAccess,
  requireContentDeleteAccess,
  logMutationAudit,
  getDatabaseActorId,
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['status', 'title', 'slug', 'programId', 'chapterId'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title', 'sequence', 'date'];

const extractYouTubeId = (url: string) => {
  try {
    const parsed = new URL(url);
    if (!['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(parsed.hostname)) return null;
    const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
};

const materialSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['youtube', 'PDF', 'audio', 'drive', 'DOCX', 'link']),
  url: z.string().url('URL materi tidak valid').refine(value => /^https?:\/\//i.test(value), 'Gunakan URL HTTP atau HTTPS'),
  filename: z.string().max(200).optional(),
  duration: z.string().max(40).optional(),
  markers: z.array(z.object({ timestamp: z.number().int().min(0).max(604800), title: z.string().trim().min(1).max(180), description: z.string().max(1000).optional() })).max(300).optional(),
}).superRefine((material, context) => {
  if (material.type === 'youtube' && !extractYouTubeId(material.url)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'URL YouTube tidak valid' });
  }
});

const quizSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(180),
  description: z.string().max(1000).optional(),
  passingScore: z.number().int().min(0).max(100),
  maxAttempts: z.number().int().min(1).max(20),
  isPublished: z.boolean(),
  questions: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(['single_choice', 'true_false']),
    text: z.string().trim().min(1).max(1000),
    explanation: z.string().max(2000).optional(),
    points: z.number().int().min(1).max(100),
    options: z.array(z.object({
      id: z.string().optional(),
      text: z.string().trim().min(1).max(500),
      isCorrect: z.boolean(),
    })).min(2).refine(
      (options) => options.filter((option) => option.isCorrect).length === 1,
      'Setiap soal harus memiliki tepat satu jawaban benar',
    ),
  }).refine(q => q.type !== 'true_false' || q.options.length === 2, 'Soal benar/salah harus memiliki dua opsi')).min(1, 'Kuis harus memiliki minimal satu soal'),
});

const lessonSchema = z.object({
  programId: z.string().uuid().optional(),
  chapterId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug tidak valid'),
  sequence: z.number().int().min(1),
  date: z.string().refine(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)), 'Tanggal tidak valid').optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  
  materials: z.array(materialSchema).optional(),
  quiz: quizSchema.nullable().optional(),
});

const lessonUpdateSchema = lessonSchema.partial().extend({ expectedUpdatedAt: z.string().datetime().optional() });
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
    const isGuestUser = !canReadDrafts(session);
    const readerAudience = isGuestUser || url.searchParams.get('audience') === 'public';
    if (readerAudience && featureRequested('programRevisions')) {
      if (resourceId) {
        const snapshot = await publishedSnapshotLesson(resourceId, !isGuestUser);
        if (snapshot) return publicPublicationLesson(snapshot, !session);
      } else if (isGuestUser) {
        const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);
        for (const field of ['programId', 'chapterId']) if (query.filters[field] && !z.string().uuid().safeParse(query.filters[field]).success) throw new ValidationError(`${field} harus berupa UUID`);
        return readPublishedLessonList(query);
      }
    }

    if (resourceId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      const condition = isUuid ? eq(lessons.id, resourceId) : eq(lessons.slug, resourceId);

      const items = await db.select().from(lessons).where(condition).limit(1);
      const item = items[0];

      if (!item) throw new HttpError(404, 'Pertemuan tidak ditemukan');
      if (isGuestUser && item.programId && await getProgramPublication(item.programId, true)) throw new HttpError(404, 'Pertemuan tidak tersedia pada versi publik saat ini.');
      if (isGuestUser && item.status !== 'published') throw new ForbiddenError('Tamu tidak diizinkan');
      if (isGuestUser) {
        const parent = item.programId ? await db.select(programReadColumns()).from(programs).where(eq(programs.id, item.programId)).limit(1) : [];
        if (parent[0]?.status !== 'published') throw new ForbiddenError('Program belum dipublikasikan');
      }

      // Independent reads share one network wait, after the access checks above.
      const readQuiz = async () => {
        const [pointer] = featureRequested('programRevisions') ? await db.select().from(lessonQuizDrafts).where(eq(lessonQuizDrafts.lessonId, item.id)).limit(1) : [];
        return db.select().from(quizzes).where(pointer ? pointer.quizId ? eq(quizzes.id, pointer.quizId) : sql`false` : eq(quizzes.lessonId, item.id)).orderBy(desc(quizzes.createdAt), desc(quizzes.id)).limit(1);
      };
      const readVideos = async () => {
        const videos = await db.select().from(lessonVideos).where(eq(lessonVideos.lessonId, item.id));
        const markers = videos.length ? await db.select().from(lessonMarkers).where(inArray(lessonMarkers.videoId, videos.map(video => video.id))).orderBy(asc(lessonMarkers.timestamp)) : [];
        return { videos, markers };
      };
      const [{ videos: vids, markers }, atts, quizRes, transcripts] = await Promise.all([
        readVideos(),
        db.select().from(lessonAttachments).where(eq(lessonAttachments.lessonId, item.id)),
        readQuiz(),
        publishedTranscriptMaterials([item.id], !session),
      ]);
      
      const materialItems = [
        ...vids.map(v => ({ id: v.id, type: 'youtube', url: `https://youtube.com/watch?v=${v.youtubeId}`, duration: v.duration })),
        ...atts.map(a => ({ id: a.id, type: a.type, url: a.url, filename: a.filename }))
      ];
      const materials = materialItems.map(material => ({ ...material, ...(material.type === 'youtube' ? { markers: markers.filter(marker => vids.find(video => video.id === material.id)?.id === marker.videoId) } : {}) }));

      // Fetch Quiz
      let quiz = null;
      
      if (quizRes.length > 0 && !readerAudience) {
        const qz = quizRes[0];
        const [qs, opts, attempts] = await Promise.all([
          db.select().from(questions).where(eq(questions.quizId, qz.id)),
          db.select().from(questionOptions)
            .innerJoin(questions, eq(questionOptions.questionId, questions.id))
            .where(eq(questions.quizId, qz.id)),
          db.select({ id: quizAttempts.id }).from(quizAttempts).where(eq(quizAttempts.quizId, qz.id)).limit(1),
        ]);

        const formattedQuestions = qs.map(q => ({
          ...q,
          options: opts.filter(o => o.question_options.questionId === q.id).map(o => o.question_options)
        }));

        quiz = {
          ...qz,
          questions: formattedQuestions,
          hasAttempts: attempts.length > 0,
        };
      }

      return { ...item, materials: readerAudience ? [...materials, ...transcripts] : materials, transcripts: readerAudience ? undefined : transcripts, markers, quiz: readerAudience ? publicQuizMetadata(quizRes[0]) : quiz };
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);
    const conditions = [];
    if (isGuestUser) conditions.push(eq(lessons.status, 'published'), sql`exists (select 1 from ${programs} where ${programs.id} = ${lessons.programId} and ${programs.status} = 'published')`);
    else if (query.filters.status) conditions.push(eq(lessons.status, query.filters.status));

    if (query.filters.slug) conditions.push(eq(lessons.slug, query.filters.slug));
    for (const field of ['programId', 'chapterId']) if (query.filters[field] && !z.string().uuid().safeParse(query.filters[field]).success) throw new ValidationError(`${field} harus berupa UUID`);
    if (query.filters.programId) conditions.push(eq(lessons.programId, query.filters.programId));
    if (query.filters.chapterId) conditions.push(eq(lessons.chapterId, query.filters.chapterId));
    if (query.filters.title) conditions.push(sql`${lessons.title} ILIKE ${'%' + query.filters.title + '%'}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = query.sortField === 'title' ? lessons.title : query.sortField === 'date' ? lessons.date : query.sortField === 'updatedAt' ? lessons.updatedAt : query.sortField === 'createdAt' ? lessons.createdAt : lessons.sequence;
    const orderByClause = query.sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

    const [data, totalCount] = await Promise.all([
      db.select().from(lessons).where(whereClause).orderBy(orderByClause, asc(lessons.id)).limit(query.limit).offset(query.offset),
      db.select({ count: count() }).from(lessons).where(whereClause),
    ]);

    const lessonIds = data.map((item) => item.id);
    const quizPointers = featureRequested('programRevisions') && lessonIds.length ? await db.select().from(lessonQuizDrafts).where(inArray(lessonQuizDrafts.lessonId, lessonIds)) : [];
    const transcriptMaterials = await publishedTranscriptMaterials(lessonIds);
    const [videos, attachments, lessonQuizzes] = lessonIds.length > 0
      ? await Promise.all([
          db.select({ lessonId: lessonVideos.lessonId }).from(lessonVideos).where(inArray(lessonVideos.lessonId, lessonIds)),
          db.select({ lessonId: lessonAttachments.lessonId }).from(lessonAttachments).where(inArray(lessonAttachments.lessonId, lessonIds)),
           db.select({ lessonId: quizzes.lessonId }).from(quizzes).where(and(inArray(quizzes.lessonId, lessonIds), isGuestUser ? eq(quizzes.isPublished, true) : undefined)),
        ])
      : [[], [], []];

    const enrichedData = data.map((item) => ({
      ...item,
      materialCount:
        videos.filter((video) => video.lessonId === item.id).length +
        attachments.filter((attachment) => attachment.lessonId === item.id).length + transcriptMaterials.filter(material => material.lessonId === item.id).length,
      hasQuiz: quizPointers.some(pointer => pointer.lessonId === item.id) ? Boolean(quizPointers.find(pointer => pointer.lessonId === item.id)?.quizId) : lessonQuizzes.some((quiz) => quiz.lessonId === item.id),
    }));

    return {
      items: enrichedData,
      total: totalCount[0]?.count || 0,
      page: query.page,
      limit: query.limit,
    };
  }

  const writes: BatchItem<'pg'>[] = [];
  const syncMaterials = async (lessonId: string, materials: LessonMaterial[]) => {
    const [videos, attachments] = await Promise.all([
      db.select().from(lessonVideos).where(eq(lessonVideos.lessonId, lessonId)),
      db.select().from(lessonAttachments).where(eq(lessonAttachments.lessonId, lessonId)),
    ]);
    const keptVideos = new Set(materials.filter(material => material.type === 'youtube').map(material => material.id));
    const keptAttachments = new Set(materials.filter(material => material.type !== 'youtube').map(material => material.id));
    for (const video of videos) if (!keptVideos.has(video.id)) {
      writes.push(db.delete(lessonMarkers).where(eq(lessonMarkers.videoId, video.id)));
      writes.push(db.delete(lessonVideos).where(eq(lessonVideos.id, video.id)));
    }
    for (const attachment of attachments) if (!keptAttachments.has(attachment.id)) writes.push(db.delete(lessonAttachments).where(eq(lessonAttachments.id, attachment.id)));
    for (const material of materials) {
      if (material.type === 'youtube') {
        const values = { lessonId, youtubeId: extractYouTubeId(material.url)!, duration: material.duration };
        const videoId = material.id && videos.some(v => v.id === material.id) ? material.id : crypto.randomUUID();
        if (videos.some(video => video.id === videoId)) writes.push(db.update(lessonVideos).set(values).where(eq(lessonVideos.id, videoId)));
        else writes.push(db.insert(lessonVideos).values({ ...values, id: videoId }));
        if (material.markers !== undefined) {
          writes.push(db.delete(lessonMarkers).where(eq(lessonMarkers.videoId, videoId)));
          if (material.markers.length) writes.push(db.insert(lessonMarkers).values(material.markers.map(marker => ({ ...marker, videoId }))));
        }
      } else {
        const values = { lessonId, filename: material.filename || 'Lampiran', url: material.url, type: material.type };
        if (material.id && attachments.some(a => a.id === material.id)) writes.push(db.update(lessonAttachments).set(values).where(eq(lessonAttachments.id, material.id)));
        else writes.push(db.insert(lessonAttachments).values(values));
      }
    }
  };

  const syncQuiz = async (lessonId: string, quiz: LessonQuiz | null) => {
    const existing = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
    if (!quiz) {
      // Nonaktifkan means hide, never destroy an assessment or its history.
      writes.push(db.update(quizzes).set({ isPublished: false }).where(eq(quizzes.lessonId, lessonId)));
      return;
    }
    if (quiz.isPublished) requireContentCreateAccess(session, 'published');
    const quizId = existing[0]?.id || crypto.randomUUID();
    if (existing[0]) {
      const attempts = await db.select({ id: quizAttempts.id }).from(quizAttempts).where(eq(quizAttempts.quizId, quizId)).limit(1);
      if (attempts.length) {
        const storedQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId));
        const storedOptions = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, storedQuestions.map(question => question.id)));
        const same = existing[0].title === quiz.title && (existing[0].description || '') === (quiz.description || '') && existing[0].passingScore === quiz.passingScore && existing[0].maxAttempts === quiz.maxAttempts &&
          storedQuestions.length === quiz.questions.length && storedQuestions.every(question => quiz.questions.some(candidate => candidate.id === question.id && candidate.text === question.text && candidate.type === question.type && (candidate.explanation || '') === (question.explanation || '') && candidate.points === question.points && candidate.options.length === storedOptions.filter(option => option.questionId === question.id).length && candidate.options.every(option => storedOptions.some(stored => stored.id === option.id && stored.questionId === question.id && stored.text === option.text && stored.isCorrect === option.isCorrect))));
        if (!same) throw new HttpError(409, 'Kuis sudah memiliki percobaan. Soal dan aturan dikunci untuk menjaga riwayat. Anda masih dapat mengubah status publikasinya.', 'QUIZ_HAS_HISTORY');
        writes.push(db.update(quizzes).set({ isPublished: quiz.isPublished, updatedAt: new Date() }).where(eq(quizzes.id, quizId)));
        return;
      }
    }
    // The same lesson lock is used when starting/submitting attempts. Recheck
    // history after acquiring it so a concurrent attempt cannot be overwritten.
    writes.push(db.execute(sql`select 1 / case when exists (
      select 1 from ${quizAttempts} where ${quizAttempts.quizId} = ${quizId}::uuid
    ) then 0 else 1 end as history_guard`));
    const values = { lessonId, title: quiz.title, description: quiz.description, passingScore: quiz.passingScore, maxAttempts: quiz.maxAttempts, isPublished: quiz.isPublished };
    if (existing[0]) {
      writes.push(db.delete(questionOptions).where(inArray(questionOptions.questionId, db.select({ id: questions.id }).from(questions).where(eq(questions.quizId, quizId)))));
      writes.push(db.delete(questions).where(eq(questions.quizId, quizId)));
      writes.push(db.update(quizzes).set({ ...values, updatedAt: new Date() }).where(eq(quizzes.id, quizId)));
    } else writes.push(db.insert(quizzes).values({ ...values, id: quizId }));
    for (const question of quiz.questions) {
      const questionId = crypto.randomUUID();
      writes.push(db.insert(questions).values({ id: questionId, quizId, type: question.type, text: question.text, explanation: question.explanation, points: question.points }));
      writes.push(db.insert(questionOptions).values(question.options.map(option => ({ questionId, text: option.text, isCorrect: option.isCorrect }))));
    }
  };

  const validateParent = async (programId?: string | null, chapterId?: string | null) => {
    if (!programId) throw new ValidationError('Pilih program untuk pertemuan ini.');
    const parent = await db.select({ id: programs.id }).from(programs).where(eq(programs.id, programId)).limit(1);
    if (!parent[0]) throw new ValidationError('Program tidak ditemukan.');
    if (chapterId) {
      const chapter = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
      if (chapter[0]?.programId !== programId) throw new ValidationError('Modul harus berada dalam program yang sama.');
    }
  };
  const commit = async (lessonId: string, parentIds: Array<string | null | undefined> = []) => {
    const locks = [...new Set(parentIds.filter((id): id is string => Boolean(id)))].sort().map(id => db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${id}`}, 0))`));
    await db.batch([db.execute(sql`select 1`), ...locks, ...legacyWorkspaceGuardWrites(parentIds), db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`lesson:${lessonId}`}, 0))`), ...writes]);
  };

  if (method === 'POST') {
    const body = await validateBody(request, lessonSchema);
    const authSession = requireContentCreateAccess(session, body.status);
    const databaseActorId = getDatabaseActorId(authSession);
    await validateParent(body.programId, body.chapterId);
    await assertLegacyWorkspaceWritable(body.programId);
    const duplicate = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.slug, body.slug)).limit(1);
    if (duplicate[0]) throw new Error('LESSON_SLUG_EXISTS');

    const lessonId = crypto.randomUUID();
    writes.push(db.execute(sql`select 1 / case when exists (select 1 from ${lessons} where ${lessons.programId} = ${body.programId}::uuid and ${lessons.sequence} = ${body.sequence}) then 0 else 1 end as sequence_guard`));
    writes.push(db.insert(lessons).values({
         id: lessonId,
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
       }));

    if (body.status === 'published' && !body.materials?.length) throw new HttpError(409, 'Tambahkan materi sebelum menerbitkan pertemuan.');
    await syncMaterials(lessonId, body.materials || []);
    if (body.quiz) await syncQuiz(lessonId, body.quiz);
    await commit(lessonId, [body.programId]);
    logMutationAudit('CREATE', 'lessons', lessonId, authSession.userId, { title: body.title });
    return { ...body, id: lessonId };
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) throw new Error('ID lesson diperlukan');
    const body = await validateBody(request, lessonUpdateSchema);
    const existing = await db.select().from(lessons).where(eq(lessons.id, resourceId)).limit(1);

    if (!existing[0]) throw new HttpError(404, 'Pertemuan tidak ditemukan');
    const authSession = requireContentUpdateAccess(session, existing[0].status, body.status);
    await assertLegacyWorkspaceWritable(existing[0].programId);
    if (body.programId) await assertLegacyWorkspaceWritable(body.programId);
    const databaseActorId = getDatabaseActorId(authSession);
    if (body.expectedUpdatedAt) writes.push(db.execute(sql`select 1 / case when exists (
      select 1 from ${lessons} where ${lessons.id} = ${resourceId}::uuid and floor(extract(epoch from ${lessons.updatedAt}) * 1000) = ${Date.parse(body.expectedUpdatedAt)}
    ) then 1 else 0 end as revision_guard`));
    if (body.sequence !== undefined || body.programId !== undefined) writes.push(db.execute(sql`select 1 / case when exists (
      select 1 from ${lessons} where ${lessons.programId} = ${body.programId ?? existing[0].programId}::uuid and ${lessons.sequence} = ${body.sequence ?? existing[0].sequence} and ${lessons.id} <> ${resourceId}::uuid
    ) then 0 else 1 end as sequence_guard`));
    await validateParent(body.programId ?? existing[0].programId, body.chapterId === undefined ? existing[0].chapterId : body.chapterId);
    if ((body.status ?? existing[0].status) === 'published') {
      const videos = await db.select({ id: lessonVideos.id }).from(lessonVideos).where(eq(lessonVideos.lessonId, resourceId));
      const attachments = await db.select({ id: lessonAttachments.id }).from(lessonAttachments).where(eq(lessonAttachments.lessonId, resourceId));
      const transcriptMaterials = await publishedTranscriptMaterials([resourceId]);
      if (!((body.materials?.length ?? (videos.length + attachments.length)) + transcriptMaterials.length)) throw new HttpError(409, 'Pertemuan terbit harus memiliki materi. Jadikan draft sebelum menghapus seluruh materi.');
    }
    if (body.slug && body.slug !== existing[0].slug) {
      const duplicate = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.slug, body.slug)).limit(1);
      if (duplicate[0]) throw new Error('LESSON_SLUG_EXISTS');
    }

    writes.push(db.update(lessons).set({
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
       }).where(eq(lessons.id, resourceId)));

    // PATCH is deliberately partial: editing meeting information must not erase
    // materials or the quiz, and editing one content type must preserve the other.
    if (body.materials !== undefined) await syncMaterials(resourceId, body.materials);
    if (body.quiz !== undefined) await syncQuiz(resourceId, body.quiz);
    await commit(resourceId, [existing[0].programId, body.programId]);
    logMutationAudit('UPDATE', 'lessons', resourceId, authSession.userId, { changes: { title: body.title } });
    return { ...existing[0], ...body, id: resourceId };
  }

  if (method === 'DELETE') {
    if (!resourceId) throw new Error('ID lesson diperlukan');
    const authSession = requireContentDeleteAccess(session);
    validateDeletionId(resourceId);
    const [existing] = await db.select().from(lessons).where(eq(lessons.id, resourceId)).limit(1);
    if (!existing) throw new HttpError(404, 'Pertemuan tidak ditemukan');
    await assertLegacyWorkspaceWritable(existing.programId);
    await assertDeletionAllowed('lessons', resourceId);
    writes.push(...await lessonDeletionCleanup(resourceId));
    writes.push(db.execute(sql`delete from bookmarks where resource_type = 'lesson' and resource_id = ${resourceId}`));
    
    const quizIds = db.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.lessonId, resourceId));
    const questionIds = db.select({ id: questions.id }).from(questions).where(inArray(questions.quizId, quizIds));
    writes.push(db.delete(questionOptions).where(inArray(questionOptions.questionId, questionIds)));
    writes.push(db.delete(questions).where(inArray(questions.quizId, quizIds)));
    writes.push(db.delete(quizzes).where(eq(quizzes.lessonId, resourceId)));
    await syncMaterials(resourceId, []);
    writes.push(db.delete(lessons).where(eq(lessons.id, resourceId)));
    await commit(resourceId, [existing.programId]);
    logMutationAudit('DELETE', 'lessons', resourceId, authSession.userId, { deletedId: resourceId });
    return { message: 'Lesson berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(lessonsHandler);

export const config: Config = {
  path: ['/api/lessons', '/api/lessons/*'],
};
