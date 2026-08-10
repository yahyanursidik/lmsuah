import type { Config, Context } from '@netlify/functions';
import { auth } from './utils/auth.js';
import { createHandler } from './middleware/handler.js';
import { requireAuth } from './middleware/auth.js';
import { db } from './utils/db.js';
import { profiles } from './db/schema/index.js';
import { eq } from 'drizzle-orm';
import registerHandler from './auth-register.js';

const meHandler = createHandler(async (request: Request) => {
  const session = await requireAuth(request);
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, session.userId))
    .limit(1);

  return {
    user: profile,
    roles: session.roles,
  };
});

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);
  if (url.pathname === '/api/auth/me') {
    return meHandler(request, context);
  }

  if (url.pathname === '/api/auth/register') {
    return registerHandler(request, context);
  }

  return auth.handler(request);
}

export const config: Config = {
  path: '/api/auth/*',
};
