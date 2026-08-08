import type { Config } from '@netlify/functions';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { createHandler } from './middleware/handler.js';
import { requireAuth, requirePermission } from './middleware/auth.js';
import { systemSettings } from './db/schema/index.js';
import { db } from './utils/db.js';
import { validateBody } from './utils/validation.js';
import { getDatabaseActorId, logMutationAudit } from './utils/contentHelper.js';

const SETTINGS_ID = 'general';
const defaults = {
  id: SETTINGS_ID,
  siteName: 'Portal Kajian UAH',
  supportEmail: '',
  defaultTimezone: 'Asia/Jakarta',
  allowRegistration: true,
  maintenanceMode: false,
  showPublicSchedule: true,
  allowPdfDownload: true,
};

const settingsSchema = z.object({
  siteName: z.string().trim().min(3).max(80),
  supportEmail: z.union([z.string().trim().email(), z.literal('')]).optional(),
  defaultTimezone: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']),
  allowRegistration: z.boolean(),
  maintenanceMode: z.boolean(),
  showPublicSchedule: z.boolean(),
  allowPdfDownload: z.boolean(),
});

const isMissingSettingsTable = (error: unknown): boolean => {
  const candidate = error as { code?: string; message?: string; cause?: unknown } | null;
  return candidate?.code === '42P01'
    || Boolean(candidate?.message?.includes('system_settings') && candidate.message.includes('does not exist'))
    || (candidate?.cause ? isMissingSettingsTable(candidate.cause) : false);
};

const ensureSettingsTable = async () => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "system_settings" (
      "id" text PRIMARY KEY NOT NULL,
      "site_name" text DEFAULT 'Portal Kajian UAH' NOT NULL,
      "support_email" text,
      "default_timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
      "allow_registration" boolean DEFAULT true NOT NULL,
      "maintenance_mode" boolean DEFAULT false NOT NULL,
      "show_public_schedule" boolean DEFAULT true NOT NULL,
      "allow_pdf_download" boolean DEFAULT true NOT NULL,
      "updated_by" text,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
};

const settingsHandler = async (request: Request) => {
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    try {
      const rows = await db.select().from(systemSettings).where(eq(systemSettings.id, SETTINGS_ID)).limit(1);
      return rows[0] ? { ...rows[0], supportEmail: rows[0].supportEmail || '' } : defaults;
    } catch (error) {
      if (isMissingSettingsTable(error)) return defaults;
      throw error;
    }
  }

  if (method === 'PATCH' || method === 'PUT') {
    const session = await requireAuth(request);
    if (!session.isDevelopmentDemo) await requirePermission(session, 'settings.manage');
    const body = await validateBody(request, settingsSchema);
    const actorId = getDatabaseActorId(session);

    await ensureSettingsTable();

    const [saved] = await db.insert(systemSettings).values({
      id: SETTINGS_ID,
      ...body,
      supportEmail: body.supportEmail || null,
      updatedBy: actorId,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: systemSettings.id,
      set: {
        ...body,
        supportEmail: body.supportEmail || null,
        updatedBy: actorId,
        updatedAt: new Date(),
      },
    }).returning();

    logMutationAudit('UPDATE', 'settings', SETTINGS_ID, session.userId, { changes: body });
    return { ...saved, supportEmail: saved.supportEmail || '' };
  }

  throw new Error(`Method ${method} tidak didukung`);
};

export default createHandler(settingsHandler);

export const config: Config = {
  path: ['/api/settings', '/api/settings/*'],
};
