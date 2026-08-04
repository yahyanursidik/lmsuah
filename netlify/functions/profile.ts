import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { requireAuth } from './middleware/auth.js';
import { db } from './utils/db.js';
import { profiles } from './db/schema/index.js';
import { getUserPermissions } from './utils/permissions.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const profileHandler = async (request: Request) => {
  const session = await requireAuth(request);

  if (request.method === 'GET') {
    // Ambil profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.authUserId, session.userId))
      .limit(1);

    const permissions = await getUserPermissions(session.userId);

    return {
      profile,
      roles: session.roles,
      permissions,
    };
  }

  if (request.method === 'PUT') {
    const body = await validateBody(request, profileUpdateSchema);

    // Update profil milik user yang sedang login saja (mencegah IDOR)
    const [updatedProfile] = await db
      .update(profiles)
      .set({
        ...(body.name ? { name: body.name } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.authUserId, session.userId))
      .returning();

    return {
      message: 'Profil berhasil diperbarui',
      profile: updatedProfile,
    };
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
};

export default createHandler(profileHandler);

export const config: Config = {
  path: '/api/profile/me',
};
