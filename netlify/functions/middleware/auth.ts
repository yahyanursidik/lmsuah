import { auth } from '../utils/auth.js';
import { db } from '../utils/db.js';
import { userRoles } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { getUserPermissions } from '../utils/permissions.js';

export interface UserSession {
  userId: string;
  roles: string[];
  isDevelopmentDemo?: boolean;
}

export function getDevelopmentDemoSession(
  request: Request,
  environment = process.env.NODE_ENV
): UserSession | null {
  if (environment === 'production') return null;

  const demoUserId = request.headers.get('x-lms-demo-user');
  if (demoUserId !== 'demo-admin-1') return null;

  return {
    userId: demoUserId,
    roles: ['super_administrator'],
    isDevelopmentDemo: true,
  };
}

/**
 * Memverifikasi sesi dari cookie request menggunakan Better Auth,
 * lalu mengambil role pengguna dari tabel user_roles.
 */
export async function requireAuth(request: Request): Promise<UserSession> {
  const developmentDemoSession = getDevelopmentDemoSession(request);
  if (developmentDemoSession) return developmentDemoSession;

  const sessionData = await auth.api.getSession({
    headers: request.headers,
  });
  
  if (!sessionData?.session) {
    throw new AuthError('Sesi tidak valid atau telah kedaluwarsa');
  }
  
  // Mengambil roles dari user_roles
  const userRolesData = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, sessionData.user.id));

  const roles = userRolesData.map((ur) => ur.roleId);

  // Default fallback if no roles
  if (roles.length === 0) {
    roles.push('guest');
  }

  return { userId: sessionData.user.id, roles };
}

/**
 * Mengecek role dari sesi yang telah diverifikasi
 */
export function requireRole(session: UserSession, allowedRoles: string[]) {
  const hasRole = session.roles.some((role) => allowedRoles.includes(role));
  if (!hasRole) {
    throw new ForbiddenError('Akses tidak diizinkan untuk role ini');
  }
}

/**
 * Memverifikasi bahwa user memiliki permission tertentu
 */
export async function requirePermission(session: UserSession, requiredPermission: string) {
  const userPermissions = await getUserPermissions(session.userId);
  if (!userPermissions.includes(requiredPermission)) {
    throw new ForbiddenError(`Akses ditolak. Membutuhkan izin: ${requiredPermission}`);
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
