import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Muat .env untuk local development
dotenv.config();

export default defineConfig({
  schema: './netlify/functions/db/schema/*',
  out: './netlify/functions/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
