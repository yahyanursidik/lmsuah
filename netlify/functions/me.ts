import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { requireAuth } from './middleware/auth.js';
import { db } from './utils/db.js';
import { profiles } from './db/schema/index.js';
import { eq } from 'drizzle-orm';

const meHandler = async (request: Request) => {
  // Verifikasi sesi
  const session = await requireAuth(request);

  // Ambil data profil lengkap
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, session.userId))
    .limit(1);

  return {
    user: profile,
    roles: session.roles,
  };
};

export default createHandler(meHandler);

export const config: Config = {
  path: '/api/auth/me',
};
