import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db.js';
import * as schema from '../db/schema/index.js';
import { hashCredentialPassword, verifyCompatiblePassword } from './password.js';
import { getOAuthConfig } from './oauth-config.js';
import { APIError } from 'better-auth/api';
import { isSelfRegistrationAllowed } from './registration-policy.js';

export { verifyCompatiblePassword } from './password.js';

const oauth = getOAuthConfig();

export const auth = betterAuth({
  appName: 'Portal Kajian UAH',
  baseURL: oauth.baseURL,
  basePath: '/api/auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: oauth.googleEnabled ? {
    google: {
      clientId: oauth.clientId!,
      clientSecret: oauth.clientSecret!,
      prompt: 'select_account',
    },
  } : {},
  account: {
    accountLinking: { enabled: true, allowDifferentEmails: false },
  },
  advanced: {
    cookiePrefix: 'lms_kajian',
    useSecureCookies: process.env.NODE_ENV === 'production' || oauth.baseURL?.startsWith('https://') === true,
  },
  emailAndPassword: {
    enabled: true,
    password: {
      // Keep Better Auth's current hash format for new passwords while allowing
      // legacy bcrypt credentials to keep working during migration.
      hash: hashCredentialPassword,
      verify: verifyCompatiblePassword,
    },
  },
  // Turnstile / custom validation for registration will be handled in hooks if necessary
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          if (!await isSelfRegistrationAllowed()) {
            throw new APIError('FORBIDDEN', { message: 'Pendaftaran peserta baru sedang ditutup. Akun yang sudah terdaftar tetap dapat masuk.' });
          }
        },
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
