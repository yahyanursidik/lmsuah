import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { requireAuth, requirePermission } from './middleware/auth.js';
import { db } from './utils/db.js';
import { user, profiles, userRoles, account, enrollments } from './db/schema/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import { hashCredentialPassword } from './utils/password.js';

const addParticipantSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional().default(''),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const importParticipantsSchema = z.object({
  action: z.literal('import'),
  participants: z.array(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional().default(''),
      password: z.string().min(6).optional().default('12345678'),
    })
  ).min(1, 'Daftar peserta tidak boleh kosong'),
});

const resetPasswordSchema = z.object({
  action: z.literal('reset-password'),
  userId: z.string().min(1, 'User ID wajib diisi'),
  newPassword: z.string().min(6, 'Password minimal 6 karakter'),
});

const updateParticipantSchema = z.object({
  action: z.literal('update'),
  userId: z.string().min(1, 'User ID wajib diisi'),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

type ActionBody = {
  action?: string;
};

const adminParticipantsHandler = async (request: Request) => {
  const session = await requireAuth(request);
  await requirePermission(session, 'role.assign');

  const url = new URL(request.url);
  const targetId = url.searchParams.get('id');
  const searchQuery = url.searchParams.get('q') || '';

  // GET: Fetch Participants or Detail
  if (request.method === 'GET') {
    if (targetId) {
      // Detailed view for single participant
      const [userProfile] = await db
        .select({
          id: profiles.authUserId,
          name: profiles.name,
          email: profiles.email,
          phone: profiles.phone,
          avatarUrl: profiles.avatarUrl,
          createdAt: profiles.createdAt,
        })
        .from(profiles)
        .where(eq(profiles.authUserId, targetId))
        .limit(1);

      if (!userProfile) {
        return new Response(JSON.stringify({ error: 'Peserta tidak ditemukan' }), { status: 404 });
      }

      const userEnrollmentsList = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.userId, targetId));

      return {
        participant: userProfile,
        enrollments: userEnrollmentsList,
      };
    }

    // List all participants
    const allProfiles = await db
      .select({
        id: profiles.authUserId,
        name: profiles.name,
        email: profiles.email,
        phone: profiles.phone,
        avatarUrl: profiles.avatarUrl,
        createdAt: profiles.createdAt,
        roleId: userRoles.roleId,
      })
      .from(profiles)
      .leftJoin(userRoles, eq(profiles.authUserId, userRoles.userId));

    let filtered = allProfiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = allProfiles.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q))
      );
    }

    return {
      participants: filtered,
      total: filtered.length,
    };
  }

  // POST: Add Manual or Batch Import
  if (request.method === 'POST') {
    const rawBody = await request.clone().json();
    const action = (rawBody as ActionBody)?.action;

    if (action === 'create') {
      const body = await validateBody(request, addParticipantSchema);
      const normalizedEmail = body.email.trim().toLowerCase();

      const existing = await db
        .select()
        .from(user)
        .where(eq(user.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        return new Response(
          JSON.stringify({ error: { message: 'Email sudah terdaftar dalam sistem.' } }),
          { status: 400 }
        );
      }

      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const passwordHash = await hashCredentialPassword(body.password);

      const assignedBy = session.isDevelopmentDemo ? null : session.userId;
      await db.insert(user).values({ id: userId, name: body.name, email: normalizedEmail, emailVerified: false, createdAt: now, updatedAt: now });
      await db.insert(account).values({ id: `acc_${userId}`, accountId: userId, providerId: 'credential', userId, password: passwordHash, createdAt: now, updatedAt: now });
      await db.insert(profiles).values({ authUserId: userId, name: body.name, email: normalizedEmail, phone: body.phone || null, createdAt: now, updatedAt: now });
      await db.insert(userRoles).values({ userId, roleId: 'participant', assignedBy, assignedAt: now });

      return {
        success: true,
        message: 'Peserta berhasil ditambahkan secara manual.',
        participant: { id: userId, name: body.name, email: normalizedEmail, phone: body.phone },
      };
    }

    if (action === 'import') {
      const body = await validateBody(request, importParticipantsSchema);
      const results = { inserted: 0, failed: 0, errors: [] as Array<{ email: string; reason: string }> };

      for (const p of body.participants) {
        const normalizedEmail = p.email.trim().toLowerCase();
        const existing = await db
          .select()
          .from(user)
          .where(eq(user.email, normalizedEmail))
          .limit(1);

        if (existing.length > 0) {
          results.failed++;
          results.errors.push({ email: normalizedEmail, reason: 'Email sudah terdaftar' });
          continue;
        }

        const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date();

        try {
          const assignedBy = session.isDevelopmentDemo ? null : session.userId;
          const passwordHash = await hashCredentialPassword(p.password || '12345678');
          await db.insert(user).values({ id: userId, name: p.name, email: normalizedEmail, emailVerified: false, createdAt: now, updatedAt: now });
          await db.insert(account).values({ id: `acc_${userId}`, accountId: userId, providerId: 'credential', userId, password: passwordHash, createdAt: now, updatedAt: now });
          await db.insert(profiles).values({ authUserId: userId, name: p.name, email: normalizedEmail, phone: p.phone || null, createdAt: now, updatedAt: now });
          await db.insert(userRoles).values({ userId, roleId: 'participant', assignedBy, assignedAt: now });
          results.inserted++;
        } catch (err: unknown) {
          results.failed++;
          results.errors.push({ email: normalizedEmail, reason: err instanceof Error ? err.message : 'Gagal menyimpan ke database' });
        }
      }

      return {
        success: true,
        message: `Proses import selesai. ${results.inserted} berhasil, ${results.failed} gagal.`,
        summary: results,
      };
    }
  }

  // PUT: Password Reset or Profile Update
  if (request.method === 'PUT') {
    const rawBody = await request.clone().json();
    const action = (rawBody as ActionBody)?.action;

    if (action === 'reset-password') {
      const body = await validateBody(request, resetPasswordSchema);
      const passwordHash = await hashCredentialPassword(body.newPassword);

      await db
        .update(account)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(eq(account.userId, body.userId));

      return {
        success: true,
        message: 'Password peserta berhasil diperbarui.',
      };
    }

    if (action === 'update') {
      const body = await validateBody(request, updateParticipantSchema);

      if (body.name || body.phone !== undefined) {
        await db
          .update(profiles)
          .set({
            ...(body.name ? { name: body.name } : {}),
            ...(body.phone !== undefined ? { phone: body.phone } : {}),
            updatedAt: new Date(),
          })
          .where(eq(profiles.authUserId, body.userId));
      }

      return {
        success: true,
        message: 'Data peserta berhasil diperbarui.',
      };
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
};

export default createHandler(adminParticipantsHandler);

export const config: Config = {
  path: '/api/admin/participants',
};
