import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { schedules } from './db/schema/index.js';
import { eq, and, asc, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import {
  getOptionalAuth,
  parseQueryParams,
  requireContentCreateAccess,
  requireContentUpdateAccess,
  requireContentDeleteAccess,
  logMutationAudit,
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['venueId', 'programId', 'status', 'category', 'type', 'day', 'date'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'date', 'startTime', 'title'];

const scheduleSchema = z.object({
  programId: z.string().uuid().optional(),
  venueId: z.string().uuid(),
  title: z.string().min(1),
  speaker: z.string().min(1),
  category: z.string().optional(),
  type: z.enum(['Rutin', 'Tematik', 'Special']).optional().default('Rutin'),
  day: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional().default('Asia/Jakarta'),
  status: z.enum(['Rutin', 'Dibatalkan', 'Diundur', 'Pindah Lokasi']).optional().default('Rutin'),
  statusReason: z.string().optional(),
  isLiveStream: z.boolean().optional().default(false),
  streamUrl: z.string().optional(),
});

const scheduleUpdateSchema = scheduleSchema.partial();

const schedulesHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    if (resourceId) {
      const items = await db.select().from(schedules).where(eq(schedules.id, resourceId)).limit(1);
      const item = items[0];

      if (!item) {
        throw new Error('Jadwal tidak ditemukan');
      }

      return item;
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];
    if (query.filters.venueId) {
      conditions.push(eq(schedules.venueId, query.filters.venueId));
    }
    if (query.filters.programId) {
      conditions.push(eq(schedules.programId, query.filters.programId));
    }
    if (query.filters.status) {
      conditions.push(eq(schedules.status, query.filters.status));
    }
    if (query.filters.category) {
      conditions.push(eq(schedules.category, query.filters.category));
    }
    if (query.filters.type) {
      conditions.push(eq(schedules.type, query.filters.type));
    }
    if (query.filters.day) {
      conditions.push(eq(schedules.day, query.filters.day));
    }
    if (query.filters.date) {
      conditions.push(sql`${schedules.date} ILIKE ${'%' + query.filters.date + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause = asc(schedules.date);
    if (query.sortField === 'title') {
      orderByClause = query.sortOrder === 'asc' ? asc(schedules.title) : desc(schedules.title);
    } else if (query.sortField === 'startTime') {
      orderByClause = query.sortOrder === 'asc' ? asc(schedules.startTime) : desc(schedules.startTime);
    } else if (query.sortField === 'updatedAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(schedules.updatedAt) : desc(schedules.updatedAt);
    } else if (query.sortField === 'createdAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(schedules.createdAt) : desc(schedules.createdAt);
    }

    const [data, totalCount] = await Promise.all([
      db
        .select()
        .from(schedules)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(query.limit)
        .offset(query.offset),
      db
        .select({ count: count() })
        .from(schedules)
        .where(whereClause),
    ]);

    const total = totalCount[0]?.count || 0;

    return {
      items: data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  if (method === 'POST') {
    const body = await validateBody(request, scheduleSchema);
    const authSession = requireContentCreateAccess(session);

    const [newSchedule] = await db
      .insert(schedules)
      .values({
        programId: body.programId,
        venueId: body.venueId,
        title: body.title,
        speaker: body.speaker,
        category: body.category,
        type: body.type,
        day: body.day,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        timezone: body.timezone || 'Asia/Jakarta',
        status: body.status,
        statusReason: body.statusReason,
        isLiveStream: body.isLiveStream,
        streamUrl: body.streamUrl,
        createdBy: authSession.userId,
        updatedBy: authSession.userId,
      })
      .returning();

    logMutationAudit('CREATE', 'schedules', newSchedule.id, authSession.userId, {
      title: newSchedule.title,
      status: newSchedule.status,
    });

    return newSchedule;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) {
      throw new Error('ID jadwal diperlukan untuk memperbarui');
    }

    const body = await validateBody(request, scheduleUpdateSchema);
    const existing = await db.select().from(schedules).where(eq(schedules.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Jadwal tidak ditemukan');
    }

    const authSession = requireContentUpdateAccess(session);

    const [updatedSchedule] = await db
      .update(schedules)
      .set({
        ...(body.programId !== undefined && { programId: body.programId }),
        ...(body.venueId && { venueId: body.venueId }),
        ...(body.title && { title: body.title }),
        ...(body.speaker && { speaker: body.speaker }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.type && { type: body.type }),
        ...(body.day && { day: body.day }),
        ...(body.date && { date: body.date }),
        ...(body.startTime !== undefined && { startTime: body.startTime }),
        ...(body.endTime !== undefined && { endTime: body.endTime }),
        ...(body.timezone && { timezone: body.timezone }),
        ...(body.status && { status: body.status }),
        ...(body.statusReason !== undefined && { statusReason: body.statusReason }),
        ...(body.isLiveStream !== undefined && { isLiveStream: body.isLiveStream }),
        ...(body.streamUrl !== undefined && { streamUrl: body.streamUrl }),
        updatedBy: authSession.userId,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, resourceId))
      .returning();

    logMutationAudit('UPDATE', 'schedules', resourceId, authSession.userId, {
      previousStatus: existing[0].status,
      newStatus: updatedSchedule.status,
      changes: body,
    });

    return updatedSchedule;
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new Error('ID jadwal diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    const existing = await db.select().from(schedules).where(eq(schedules.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Jadwal tidak ditemukan');
    }

    await db.delete(schedules).where(eq(schedules.id, resourceId));

    logMutationAudit('DELETE', 'schedules', resourceId, authSession.userId, {
      deletedTitle: existing[0].title,
    });

    return { message: 'Jadwal berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(schedulesHandler);

export const config: Config = {
  path: ['/api/schedules', '/api/schedules/*'],
};
