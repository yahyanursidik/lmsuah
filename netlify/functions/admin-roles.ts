import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { requireAuth, requirePermission } from './middleware/auth.js';
import { db } from './utils/db.js';
import { roles } from './db/schema/index.js';
import { sql } from 'drizzle-orm';

const adminRolesHandler = async (request: Request) => {
  const session = await requireAuth(request);
  await requirePermission(session, 'role.assign');

  // Ambil semua master roles
  const allRoles = await db.select().from(roles);

  // Query pengguna beserta detailnya dalam 1 query cepat
  const result = await db.execute(sql`
    SELECT 
      u.id AS "userId",
      COALESCE(p.name, u.name) AS "name",
      u.email AS "email",
      p.phone AS "phone",
      u.created_at AS "createdAt",
      (
        SELECT MAX(s.created_at) 
        FROM session s 
        WHERE s.user_id = u.id
      ) AS "lastLoginAt",
      (
        SELECT COUNT(*)::int 
        FROM enrollments e 
        WHERE e.user_id = u.id
      ) AS "enrollmentCount",
      COALESCE(
        json_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL),
        '[]'::json
      ) AS "roles"
    FROM "user" u
    LEFT JOIN profiles p ON p.auth_user_id = u.id
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    GROUP BY u.id, p.name, u.name, u.email, p.phone, u.created_at
    ORDER BY u.created_at DESC;
  `);

  const userRolesData = Array.isArray(result) ? result : (result as any).rows || [];

  return {
    roles: allRoles,
    userRoles: userRolesData,
  };
};

export default createHandler(adminRolesHandler);

export const config: Config = {
  path: '/api/admin/roles',
};
