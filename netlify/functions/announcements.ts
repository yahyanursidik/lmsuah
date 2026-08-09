import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { announcements } from './db/schema/index.js';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';

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

  switch (request.method) {
    case 'GET': {
      if (id) {
        const item = await db
          .select()
          .from(announcements)
          .where(eq(announcements.id, id))
          .limit(1);
          
        if (item.length === 0) {
          throw new Error('Not found');
        }
        return item[0];
      }

      // Check for query params
      const status = url.searchParams.get('status');
      
      const allAnnouncements = await db
        .select()
        .from(announcements)
        .where(status ? eq(announcements.status, status) : undefined)
        .orderBy(desc(announcements.createdAt));
      
      return allAnnouncements;
    }

    case 'POST': {
      const body = await validateBody(request, announcementSchema);
      // @ts-ignore
      const session = request.userSession; // asumsi ada session handler
      
      const newItem = await db.insert(announcements).values({
        title: body.title,
        content: body.content,
        linkUrl: body.linkUrl || null,
        imageUrl: body.imageUrl || null,
        status: body.status,
        createdBy: session?.userId || null, // Sebaiknya diambil dari session
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return newItem[0];
    }

    case 'PUT':
    case 'PATCH': {
      if (!id) {
        throw new Error('ID is required');
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
        throw new Error('Not found');
      }
      
      return updatedItem[0];
    }

    case 'DELETE': {
      if (!id) {
        throw new Error('ID is required');
      }
      
      await db.delete(announcements).where(eq(announcements.id, id));
      return { success: true };
    }

    default:
      throw new Error('Method not allowed');
  }
};

export default createHandler(announcementsHandler);

export const config: Config = {
  path: ['/api/announcements', '/api/announcements/:id'],
};
