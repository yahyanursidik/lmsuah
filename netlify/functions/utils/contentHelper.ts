import { requireAuth, type UserSession, AuthError } from '../middleware/auth.js';
import { logger } from './logger.js';
import { ForbiddenError } from '../middleware/auth.js';

export async function getOptionalAuth(request: Request): Promise<UserSession | null> {
  try {
    return await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return null;
    }
    throw err;
  }
}

export function isGuest(session: UserSession | null): boolean {
  if (!session) return true;
  return session.roles.includes('guest') && session.roles.length === 1;
}

export function isPublisher(session: UserSession | null): boolean {
  if (!session) return false;
  return session.roles.includes('publisher') || session.roles.includes('admin');
}

export function isContributor(session: UserSession | null): boolean {
  if (!session) return false;
  return session.roles.includes('contributor') || isPublisher(session);
}

export function requireContentReadAccess(session: UserSession | null): { isGuestAccess: boolean } {
  return { isGuestAccess: isGuest(session) };
}

export function requireContentCreateAccess(session: UserSession | null, targetStatus: string = 'draft'): UserSession {
  if (!session || !isContributor(session)) {
    throw new ForbiddenError('Hanya Contributor, Publisher, atau Admin yang dapat membuat konten');
  }

  if (targetStatus === 'published' && !isPublisher(session)) {
    throw new ForbiddenError('Hanya Publisher atau Admin yang dapat memublikasikan konten');
  }

  return session;
}

export function requireContentUpdateAccess(
  session: UserSession | null,
  _currentStatus?: string,
  targetStatus?: string
): UserSession {
  if (!session || !isContributor(session)) {
    throw new ForbiddenError('Hanya Contributor, Publisher, atau Admin yang dapat mengubah konten');
  }

  if (targetStatus === 'published' && !isPublisher(session)) {
    throw new ForbiddenError('Hanya Publisher atau Admin yang dapat memublikasikan konten');
  }

  return session;
}

export function requireContentDeleteAccess(session: UserSession | null): UserSession {
  if (!session || !isPublisher(session)) {
    throw new ForbiddenError('Hanya Publisher atau Admin yang dapat menghapus konten');
  }
  return session;
}

export interface ParsedQuery {
  page: number;
  limit: number;
  offset: number;
  sortField?: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, string>;
}

export function parseQueryParams(
  url: URL,
  allowedFilterFields: string[],
  allowedSortFields: string[]
): ParsedQuery {
  const params = url.searchParams;

  let page = parseInt(params.get('_page') || params.get('page') || '1', 10);
  let limit = parseInt(params.get('_limit') || params.get('limit') || '10', 10);

  const startParam = params.get('_start');
  const endParam = params.get('_end');
  if (startParam !== null && endParam !== null) {
    const start = parseInt(startParam, 10);
    const end = parseInt(endParam, 10);
    limit = Math.max(1, end - start);
    page = Math.floor(start / limit) + 1;
  }

  page = isNaN(page) || page < 1 ? 1 : page;
  limit = isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 100);
  const offset = (page - 1) * limit;

  const sortParam = params.get('_sort') || params.get('sort');
  const orderParam = (params.get('_order') || params.get('order') || 'asc').toLowerCase();

  let sortField: string | undefined = undefined;
  if (sortParam && allowedSortFields.includes(sortParam)) {
    sortField = sortParam;
  }

  const sortOrder: 'asc' | 'desc' = orderParam === 'desc' ? 'desc' : 'asc';

  const filters: Record<string, string> = {};
  params.forEach((val, key) => {
    if (['_page', 'page', '_limit', 'limit', '_start', '_end', '_sort', 'sort', '_order', 'order'].includes(key)) {
      return;
    }
    if (allowedFilterFields.includes(key) && val.trim() !== '') {
      filters[key] = val.trim();
    }
  });

  return { page, limit, offset, sortField, sortOrder, filters };
}

export function logMutationAudit(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityName: string,
  entityId: string,
  userId: string,
  details: Record<string, unknown>
) {
  logger.info('MUTATION_AUDIT', {
    action,
    entityName,
    entityId,
    userId,
    details,
    timestamp: new Date().toISOString(),
  });
}
