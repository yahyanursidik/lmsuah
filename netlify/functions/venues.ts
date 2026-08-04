import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { venues } from './db/schema/index.js';
import { eq, and, asc, desc, count, sql } from 'drizzle-orm';
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
} from './utils/contentHelper.js';

const ALLOWED_FILTERS = ['status', 'name', 'slug', 'city'];
const ALLOWED_SORTS = ['createdAt', 'updatedAt', 'name', 'city'];

const venueSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  district: z.string().optional(),
  city: z.string().min(1),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  description: z.string().optional(),
  capacity: z.string().optional(),
  phone: z.string().optional(),
  image: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

const venueUpdateSchema = venueSchema.partial();

const venuesHandler = async (request: Request) => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const session = await getOptionalAuth(request);

  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length > 2 ? pathParts[2] : null;

  if (method === 'GET') {
    const isGuestUser = isGuest(session);

    if (resourceId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      const condition = isUuid ? eq(venues.id, resourceId) : eq(venues.slug, resourceId);

      const items = await db.select().from(venues).where(condition).limit(1);
      const item = items[0];

      if (!item) {
        throw new Error('Lokasi tidak ditemukan');
      }

      if (isGuestUser && item.status !== 'active') {
        throw new ForbiddenError('Tamu hanya diizinkan melihat lokasi majelis yang aktif');
      }

      return item;
    }

    const query = parseQueryParams(url, ALLOWED_FILTERS, ALLOWED_SORTS);

    const conditions = [];
    if (isGuestUser) {
      conditions.push(eq(venues.status, 'active'));
    } else if (query.filters.status) {
      conditions.push(eq(venues.status, query.filters.status));
    }

    if (query.filters.slug) {
      conditions.push(eq(venues.slug, query.filters.slug));
    }
    if (query.filters.city) {
      conditions.push(sql`${venues.city} ILIKE ${'%' + query.filters.city + '%'}`);
    }
    if (query.filters.name) {
      conditions.push(sql`${venues.name} ILIKE ${'%' + query.filters.name + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause = asc(venues.name);
    if (query.sortField === 'city') {
      orderByClause = query.sortOrder === 'asc' ? asc(venues.city) : desc(venues.city);
    } else if (query.sortField === 'updatedAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(venues.updatedAt) : desc(venues.updatedAt);
    } else if (query.sortField === 'createdAt') {
      orderByClause = query.sortOrder === 'asc' ? asc(venues.createdAt) : desc(venues.createdAt);
    }

    const [data, totalCount] = await Promise.all([
      db
        .select()
        .from(venues)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(query.limit)
        .offset(query.offset),
      db
        .select({ count: count() })
        .from(venues)
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
    const body = await validateBody(request, venueSchema);
    const authSession = requireContentCreateAccess(session);

    const [newVenue] = await db
      .insert(venues)
      .values({
        slug: body.slug,
        name: body.name,
        address: body.address,
        district: body.district,
        city: body.city,
        province: body.province,
        postalCode: body.postalCode,
        latitude: body.latitude,
        longitude: body.longitude,
        googleMapsUrl: body.googleMapsUrl,
        description: body.description,
        capacity: body.capacity,
        phone: body.phone,
        image: body.image,
        status: body.status,
        createdBy: authSession.userId,
        updatedBy: authSession.userId,
      })
      .returning();

    logMutationAudit('CREATE', 'venues', newVenue.id, authSession.userId, {
      name: newVenue.name,
      city: newVenue.city,
    });

    return newVenue;
  }

  if (method === 'PATCH' || method === 'PUT') {
    if (!resourceId) {
      throw new Error('ID lokasi diperlukan untuk memperbarui');
    }

    const body = await validateBody(request, venueUpdateSchema);
    const existing = await db.select().from(venues).where(eq(venues.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Lokasi tidak ditemukan');
    }

    const authSession = requireContentUpdateAccess(session);

    const [updatedVenue] = await db
      .update(venues)
      .set({
        ...(body.slug && { slug: body.slug }),
        ...(body.name && { name: body.name }),
        ...(body.address && { address: body.address }),
        ...(body.district !== undefined && { district: body.district }),
        ...(body.city && { city: body.city }),
        ...(body.province !== undefined && { province: body.province }),
        ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.googleMapsUrl !== undefined && { googleMapsUrl: body.googleMapsUrl }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.capacity !== undefined && { capacity: body.capacity }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.image !== undefined && { image: body.image }),
        ...(body.status && { status: body.status }),
        updatedBy: authSession.userId,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, resourceId))
      .returning();

    logMutationAudit('UPDATE', 'venues', resourceId, authSession.userId, {
      changes: body,
    });

    return updatedVenue;
  }

  if (method === 'DELETE') {
    if (!resourceId) {
      throw new Error('ID lokasi diperlukan untuk menghapus');
    }

    const authSession = requireContentDeleteAccess(session);
    const existing = await db.select().from(venues).where(eq(venues.id, resourceId)).limit(1);

    if (!existing[0]) {
      throw new Error('Lokasi tidak ditemukan');
    }

    await db.delete(venues).where(eq(venues.id, resourceId));

    logMutationAudit('DELETE', 'venues', resourceId, authSession.userId, {
      deletedName: existing[0].name,
    });

    return { message: 'Lokasi berhasil dihapus', id: resourceId };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(venuesHandler);

export const config: Config = {
  path: ['/api/venues', '/api/venues/*'],
};
