import { db } from './db.js';
import { userRoles, rolePermissions } from '../db/schema/index.js';
import { eq, inArray } from 'drizzle-orm';

/**
 * Mengambil seluruh daftar permission unik milik seorang pengguna berdasarkan role-nya.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  // 1. Ambil daftar role pengguna
  const userRolesData = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  const roleIds = userRolesData.map((r) => r.roleId);

  if (roleIds.length === 0) {
    return [];
  }

  // 2. Ambil seluruh permission dari role-role tersebut
  const permissionsData = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(inArray(rolePermissions.roleId, roleIds));

  // 3. Deduplikasi permission IDs
  const uniquePermissions = Array.from(
    new Set(permissionsData.map((p) => p.permissionId))
  );

  return uniquePermissions;
}
