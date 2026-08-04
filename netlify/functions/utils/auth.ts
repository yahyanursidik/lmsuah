import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db.js';
import * as schema from '../db/schema/index.js';

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
