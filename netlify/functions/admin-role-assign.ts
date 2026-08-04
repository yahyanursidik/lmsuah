import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { requireAuth, requirePermission, ForbiddenError } from './middleware/auth.js';
import { db } from './utils/db.js';
import { userRoles } from './db/schema/index.js';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';

const assignRoleSchema = z.object({
  targetUserId: z.string().min(1),
  roleId: z.string().min(1),
});

const adminRoleAssignHandler = async (request: Request) => {
  const session = await requireAuth(request);
  await requirePermission(session, 'role.assign');

  const body = await validateBody(request, assignRoleSchema);

  // Mencegah penetapan role untuk diri sendiri (Self Privilege Escalation)
  if (body.targetUserId === session.userId) {
    throw new ForbiddenError('Pengguna tidak dapat menetapkan atau menguatkan role untuk dirinya sendiri');
  }

  // Insert atau ignore jika role sudah diberikan
  await db
    .insert(userRoles)
    .values({
      userId: body.targetUserId,
      roleId: body.roleId,
      assignedBy: session.userId, // Audit log penetapan oleh siapa
      assignedAt: new Date(),
    })
    .onConflictDoNothing();

  return {
    message: `Role ${body.roleId} berhasil diberikan kepada user ${body.targetUserId}`,
    audit: {
      targetUserId: body.targetUserId,
      roleId: body.roleId,
      assignedBy: session.userId,
    },
  };
};

export default createHandler(adminRoleAssignHandler);

export const config: Config = {
  path: '/api/admin/roles/assign',
};
