import type { Config } from '@netlify/functions';
import { programReadColumns } from "./utils/program-columns.js";
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { programs, lessons, lessonVideos, lessonAttachments, schedules, venues, series, seriesBooks, books, transcriptDocuments, transcriptVersions, programPublications, programRevisions } from './db/schema/index.js';
import { featureRequested } from './utils/advanced-features.js';
import { assertLegacyWorkspaceWritable, legacyWorkspaceGuardWrites } from './utils/program-snapshots.js';
import type { PublicationProgram } from '../../shared/program-publication.js';
import { canReadDrafts } from './utils/content-policy.js';
import { HttpError } from './utils/http-error.js';
import { programReadiness } from '../../shared/program-readiness.js';
import { eq, and, asc, desc, count, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import { imageSourceSchema } from './utils/image-validation.js';
import { ForbiddenError } from './middleware/auth.js';
import {
  getOptionalAuth,
  parseQueryParams,
  requireContentCreateAccess,
  requireContentUpdateAccess,
  requireContentDeleteAccess,
  logMutationAudit,
  getDatabaseActorId,
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['status', 'title', 'slug'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'title'];

const programSchema = z.object({
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya huruf kecil, angka, dan tanda hubung'),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional(),
  coverImage: imageSourceSchema.nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
});

const programUpdateSchema = programSchema.partial().extend({ expectedUpdatedAt: z.string().datetime().optional() });

async function withProgramMetadata(items: Array<typeof programs.$inferSelect>, editor: boolean) {
  if (!items.length) return [];
  const ids = items.map(item => item.id);
  const [agendas, references] = await Promise.all([
    db.select({ programId: schedules.programId, category: schedules.category, instructor: schedules.speaker, day: schedules.day, startTime: schedules.startTime, venueName: venues.name })
      .from(schedules).innerJoin(venues, eq(venues.id, schedules.venueId))
      .where(and(inArray(schedules.programId, ids), eq(schedules.status, 'Rutin'))).orderBy(desc(schedules.date), asc(schedules.id)),
    db.select({ programId: series.programId, title: books.title, author: books.author }).from(series)
      .innerJoin(seriesBooks, eq(seriesBooks.seriesId, series.id)).innerJoin(books, eq(books.id, seriesBooks.bookId))
      .where(and(inArray(series.programId, ids), editor ? undefined : and(eq(series.status, 'published'), eq(books.status, 'published')))).orderBy(asc(series.sequence), asc(seriesBooks.sequence)),
  ]);
  const publications = featureRequested('programRevisions') ? await db.select({ programId: programPublications.programId, header: sql<PublicationProgram>`${programPublications.snapshot}->'program'`, version: programRevisions.version }).from(programPublications).innerJoin(programRevisions, eq(programRevisions.id, programPublications.revisionId)).where(inArray(programPublications.programId, ids)) : [];
  return items.map(item => {
    const agenda = agendas.find(schedule => schedule.programId === item.id);
    const reference = references.filter(book => book.programId === item.id);
    const publication = publications.find(candidate => candidate.programId === item.id);
    return { ...item, ...(publication?.header || {}), status: item.status, coverImage: publication ? publication.header.coverImage || null : item.coverImage, category: agenda?.category || undefined, instructor: agenda?.instructor || undefined, venueName: agenda?.venueName || undefined,
      routineSchedule: agenda ? [agenda.day, agenda.startTime].filter(Boolean).join(' · ') : undefined,
      bookTitle: publication ? publication.header.bookTitle : [...new Set(reference.map(book => book.title))].join(', ') || undefined,
      author: publication ? publication.header.author : [...new Set(reference.map(book => book.author).filter(Boolean))].join(', ') || undefined,
      hasImmutablePublication: Boolean(publication), publishedVersion: publication?.version };
  });
}

const programsHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  // Parsing path ID dari URL jika ada (e.g. /api/programs/123 atau /api/programs/slug-program)
  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    const isGuestUser = !canReadDrafts(session);

    if (resourceId) {
      // Single Item Fetch
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      const condition = isUuid ? eq(programs.id, resourceId) : eq(programs.slug, resourceId);

      const items = await db.select(programReadColumns()).from(programs).where(condition).limit(1);
      const item = items[0];

      if (!item) {
        throw new HttpError(404, 'Program tidak ditemukan');
      }

      if (isGuestUser && item.status !== 'published') {
        throw new ForbiddenError('Tamu hanya diizinkan melihat program yang sudah dipublikasikan');
      }

      return (await withProgramMetadata([item], !isGuestUser))[0];
    }

    // List Fetch dengan Allowlist & Pagination
    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];
    if (isGuestUser) {
      conditions.push(eq(programs.status, 'published'));
    } else if (query.filters.status) {
      conditions.push(eq(programs.status, query.filters.status));
    }

    if (query.filters.slug) {
      conditions.push(eq(programs.slug, query.filters.slug));
    }
    if (query.filters.title) {
      conditions.push(sql`${programs.title} ILIKE ${'%' + query.filters.title + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    let orderByClause = desc(programs.createdAt);
    if (query.sortField === 'title') {
      orderByClause = query.sortOrder === 'asc' ? asc(programs.title) : desc(programs.title);
    } else if (query.sortField === 'updatedAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(programs.updatedAt) : desc(programs.updatedAt);
    } else if (query.sortField === 'createdAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(programs.createdAt) : desc(programs.createdAt);
    }

    const [data, totalCount] = await Promise.all([
      db
        .select(programReadColumns())
        .from(programs)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(query.limit)
        .offset(query.offset),
      db
        .select({ count: count() })
        .from(programs)
        .where(whereClause),
    ]);

    const total = totalCount[0]?.count || 0;

    return {
      items: await withProgramMetadata(data, !isGuestUser),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  if (method === 'POST') {
    const body = await validateBody(request, programSchema);
    const authSession = requireContentCreateAccess(session, body.status);
    if (body.status !== 'draft') throw new HttpError(400, 'Buat program sebagai draft, lengkapi pertemuan dan materi sebelum menerbitkan.');
    const databaseActorId = getDatabaseActorId(authSession);
    const duplicate = await db.select({ id: programs.id }).from(programs).where(eq(programs.slug, body.slug)).limit(1);
    if (duplicate[0]) throw new Error('PROGRAM_SLUG_EXISTS');

    const [newProgram] = await db
      .insert(programs)
      .values({
        slug: body.slug,
        title: body.title,
        description: body.description,
        ...(body.coverImage ? { coverImage: body.coverImage } : {}),
        status: body.status,
        createdBy: databaseActorId,
        updatedBy: databaseActorId,
      })
      .returning(programReadColumns());

    logMutationAudit('CREATE', 'programs', newProgram.id, authSession.userId, {
      title: newProgram.title,
      status: newProgram.status,
    });

    return newProgram;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) {
      throw new Error('ID program diperlukan untuk memperbarui');
    }

    const body = await validateBody(request, programUpdateSchema);
    const existing = await db.select(programReadColumns()).from(programs).where(eq(programs.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new HttpError(404, 'Program tidak ditemukan');
    }

    const authSession = requireContentUpdateAccess(session, existing[0].status, body.status);
    if (featureRequested('programRevisions')) {
      if (body.status === 'published') throw new HttpError(409, 'Terbitkan atau tampilkan kembali versi melalui Review & Revisi agar snapshot yang disetujui tetap terlindungi.');
      if (body.title !== undefined || body.slug !== undefined || body.description !== undefined || body.coverImage !== undefined) await assertLegacyWorkspaceWritable(resourceId);
    }
    if (body.status === 'published') {
      const items = await db.select({ status: lessons.status, materialCount: sql<number>`(
        select count(*) from ${lessonVideos} where ${lessonVideos.lessonId} = ${lessons.id}
      ) + (select count(*) from ${lessonAttachments} where ${lessonAttachments.lessonId} = ${lessons.id})
      + ${featureRequested('privatePdf') ? sql`(select count(*) from ${transcriptVersions} inner join ${transcriptDocuments} on ${transcriptVersions.documentId} = ${transcriptDocuments.id} where ${transcriptDocuments.lessonId} = ${lessons.id} and ${transcriptVersions.status} = 'published')` : sql`0`}` })
        .from(lessons).where(eq(lessons.programId, resourceId));
      const failed = programReadiness({ ...existing[0], ...body }, items).filter(check => !check.ready);
      if (failed.length) throw new HttpError(409, `Program belum siap: ${failed.map(check => check.label).join('; ')}.`, 'PROGRAM_NOT_READY');
    }
    const databaseActorId = getDatabaseActorId(authSession);
    if (body.slug && body.slug !== existing[0].slug) {
      const duplicate = await db.select({ id: programs.id }).from(programs).where(eq(programs.slug, body.slug)).limit(1);
      if (duplicate[0]) throw new Error('PROGRAM_SLUG_EXISTS');
    }

    const updateQuery = db
      .update(programs)
      .set({
        ...(body.slug && { slug: body.slug }),
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.coverImage !== undefined && (body.coverImage || null) !== (existing[0].coverImage || null) && { coverImage: body.coverImage || null }),
        ...(body.status && { status: body.status }),
        updatedBy: databaseActorId,
        updatedAt: new Date(),
      })
      .where(and(eq(programs.id, resourceId), body.expectedUpdatedAt ? sql`floor(extract(epoch from ${programs.updatedAt}) * 1000) = ${Date.parse(body.expectedUpdatedAt)}` : undefined))
      .returning(programReadColumns());
    let updatedRows: Array<typeof programs.$inferSelect>;
    if (featureRequested('programRevisions')) {
      const results = await db.batch([db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`program:${resourceId}`}, 0))`),
        ...(body.title !== undefined || body.slug !== undefined || body.description !== undefined || body.coverImage !== undefined ? legacyWorkspaceGuardWrites([resourceId]) : []), updateQuery]);
      updatedRows = results[results.length - 1] as Array<typeof programs.$inferSelect>;
    } else updatedRows = await updateQuery;
    const updatedProgram = updatedRows[0];

    if (!updatedProgram) throw new HttpError(409, 'Program sudah berubah. Muat ulang sebelum menyimpan.', 'REVISION_CONFLICT');

    logMutationAudit('UPDATE', 'programs', resourceId, authSession.userId, {
      previousStatus: existing[0].status,
      newStatus: updatedProgram.status,
      changes: body,
    });

    return updatedProgram;
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new Error('ID program diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    const existing = await db.select(programReadColumns()).from(programs).where(eq(programs.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Program tidak ditemukan');
    }

    await db.delete(programs).where(eq(programs.id, resourceId));

    logMutationAudit('DELETE', 'programs', resourceId, authSession.userId, {
      deletedTitle: existing[0].title,
    });

    return { message: 'Program berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(programsHandler);

export const config: Config = {
  path: ['/api/programs', '/api/programs/*'],
};
