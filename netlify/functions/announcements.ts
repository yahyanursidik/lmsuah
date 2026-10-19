import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { announcements } from './db/schema/index.js';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { getDatabaseActorId, getOptionalAuth } from './utils/contentHelper.js';
import { HttpError } from './utils/http-error.js';

const ADMIN_ROLES = ['admin', 'administrator', 'super_administrator'];

const announcementSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  content: z.string().min(1, 'Konten wajib diisi'),
  linkUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published']).default('published'),
});

const announcementsHandler = async (request: Request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Format: /api/announcements/:id
  const id = pathParts.length > 2 ? pathParts[2] : null;
  const session = request.method === 'GET' ? await getOptionalAuth(request) : await requireAuth(request);
  const canManage = session?.roles.some(role => ADMIN_ROLES.includes(role));
  if (request.method !== 'GET') requireRole(session!, ADMIN_ROLES);

  switch (request.method) {
    case 'GET': {
      if (id) {
        const item = await db
          .select()
          .from(announcements)
          .where(and(eq(announcements.id, id), canManage ? undefined : eq(announcements.status, 'published')))
          .limit(1);
          
        if (item.length === 0) {
          throw new HttpError(404, 'Pengumuman tidak ditemukan.');
        }
        return item[0];
      }

      // Check for query params
      const status = canManage ? url.searchParams.get('status') : 'published';
      
      const allAnnouncements = await db
        .select()
        .from(announcements)
        .where(status ? eq(announcements.status, status) : undefined)
        .orderBy(desc(announcements.createdAt));
      
      return allAnnouncements;
    }

    case 'POST': {
      const body = await validateBody(request, announcementSchema);
      
      const newItem = await db.insert(announcements).values({
        title: body.title,
        content: body.content,
        linkUrl: body.linkUrl || null,
        imageUrl: body.imageUrl || null,
        status: body.status,
        createdBy: getDatabaseActorId(session!),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return newItem[0];
    }

    case 'PUT':
    case 'PATCH': {
      if (!id) {
        throw new HttpError(400, 'ID pengumuman diperlukan.');
      }
      
      const body = await validateBody(request, announcementSchema);
      
      const updatedItem = await db.update(announcements).set({
        title: body.title,
        content: body.content,
        linkUrl: body.linkUrl || null,
        imageUrl: body.imageUrl || null,
        status: body.status,
        updatedAt: new Date(),
      }).where(eq(announcements.id, id)).returning();
      
      if (updatedItem.length === 0) {
        throw new HttpError(404, 'Pengumuman tidak ditemukan.');
      }
      
      return updatedItem[0];
    }

    case 'DELETE': {
      if (!id) {
        throw new HttpError(400, 'ID pengumuman diperlukan.');
      }
      
      await db.delete(announcements).where(eq(announcements.id, id));
      return { success: true };
    }

    default:
      throw new HttpError(405, 'Metode tidak didukung.');
  }
};

export default createHandler(announcementsHandler);

export const config: Config = {
  path: ['/api/announcements', '/api/announcements/:id'],
};
