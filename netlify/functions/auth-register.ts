import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { user, profiles, userRoles, account } from './db/schema/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './utils/validation.js';
import { hashCredentialPassword } from './utils/password.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional().default(''),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const registerHandler = async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await validateBody(request, registerSchema);
  const normalizedEmail = body.email.trim().toLowerCase();

  // Periksa apakah email sudah terdaftar
  const existingUsers = await db
    .select()
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1);

  if (existingUsers.length > 0) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email sudah terdaftar dalam sistem. Silakan masuk atau gunakan email lain.',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const passwordHash = await hashCredentialPassword(body.password);

  // 1. Simpan user utama
  await db.insert(user).values({
    id: userId,
    name: body.name,
    email: normalizedEmail,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Simpan kredensial password
  await db.insert(account).values({
    id: `acc_${userId}`,
    accountId: userId,
    providerId: 'credential',
    userId: userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Simpan profil tambahan (termasuk nomor HP/WA)
  await db.insert(profiles).values({
    authUserId: userId,
    name: body.name,
    email: normalizedEmail,
    phone: body.phone || null,
    createdAt: now,
    updatedAt: now,
  });

  // 4. Tetapkan role peserta
  await db.insert(userRoles).values({
    userId: userId,
    roleId: 'participant',
    assignedBy: null,
    assignedAt: now,
  });

  return {
    success: true,
    message: 'Pendaftaran berhasil. Silakan masuk dengan akun baru Anda.',
    user: {
      id: userId,
      name: body.name,
      email: normalizedEmail,
      role: 'participant',
    },
  };
};

export default createHandler(registerHandler);

export const config: Config = {
  path: '/api/auth/register',
};
