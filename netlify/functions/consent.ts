import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { requireAuth } from './middleware/auth.js';
import { db } from './utils/db.js';
import { privacyConsents } from './db/schema/index.js';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';

const consentSchema = z.object({
  consentType: z.enum(['TOS', 'PRIVACY_POLICY']),
  version: z.string().min(1),
});

const consentHandler = async (request: Request) => {
  const session = await requireAuth(request);
  const body = await validateBody(request, consentSchema);

  const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  const [consent] = await db
    .insert(privacyConsents)
    .values({
      userId: session.userId,
      consentType: body.consentType,
      version: body.version,
      ipAddress,
      userAgent,
      consentedAt: new Date(),
    })
    .returning();

  return {
    message: 'Persetujuan privasi berhasil dicatat',
    consent,
  };
};

export default createHandler(consentHandler);

export const config: Config = {
  path: '/api/privacy/consent',
};
