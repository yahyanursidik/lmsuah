import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { systemSettings } from '../db/schema/index.js';

export async function isSelfRegistrationAllowed(): Promise<boolean> {
  try {
    const [settings] = await db.select({ allowRegistration: systemSettings.allowRegistration })
      .from(systemSettings).where(eq(systemSettings.id, 'general')).limit(1);
    return settings?.allowRegistration ?? true;
  } catch (error) {
    const isMissingTable = (cause: unknown): boolean => {
      const entry = cause as { code?: string; cause?: unknown } | null;
      return entry?.code === '42P01' || Boolean(entry?.cause && isMissingTable(entry.cause));
    };
    if (isMissingTable(error)) return true;
    throw error;
  }
}
