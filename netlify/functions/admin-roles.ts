import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { requireAuth, requirePermission } from './middleware/auth.js';
import { db } from './utils/db.js';
import { roles, userRoles, profiles } from './db/schema/index.js';
import { eq } from 'drizzle-orm';

const adminRolesHandler = async (request: Request) => {
  const session = await requireAuth(request);
  await requirePermission(session, 'role.assign');

  // Ambil semua master roles
  const allRoles = await db.select().from(roles);

  // Ambil semua daftar pengguna beserta rolenya
  const allUserRoles = await db
    .select({
      userId: profiles.authUserId,
      name: profiles.name,
      email: profiles.email,
      roleId: userRoles.roleId,
      assignedBy: userRoles.assignedBy,
      assignedAt: userRoles.assignedAt,
    })
    .from(profiles)
    .leftJoin(userRoles, eq(profiles.authUserId, userRoles.userId));

  return {
    roles: allRoles,
    userRoles: allUserRoles,
  };
};

export default createHandler(adminRolesHandler);

export const config: Config = {
  path: '/api/admin/roles',
};
