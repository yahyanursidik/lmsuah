import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { compare as verifyBcryptPassword } from 'bcryptjs';
import { db } from './db.js';
import * as schema from '../db/schema/index.js';

export async function verifyCompatiblePassword({ hash, password }: { hash: string; password: string }) {
  if (/^\$2[aby]\$/.test(hash)) {
    return verifyBcryptPassword(password, hash);
  }

  return verifyPassword({ hash, password });
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  advanced: {
    cookiePrefix: 'lms_kajian',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  emailAndPassword: {
    enabled: true,
    password: {
      // Keep Better Auth's current hash format for new passwords while allowing
      // legacy bcrypt credentials to keep working during migration.
      hash: hashPassword,
      verify: verifyCompatiblePassword,
    },
  },
  // Turnstile / custom validation for registration will be handled in hooks if necessary
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Buat profil otomatis saat user mendaftar
          await db.insert(schema.profiles).values({
            authUserId: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.image,
          });

          // Otomatis beri role 'participant'
          await db.insert(schema.userRoles).values({
            userId: user.id,
            roleId: 'participant',
            assignedBy: null, // Null artinya system
          });
        }
      }
    }
  }
});
