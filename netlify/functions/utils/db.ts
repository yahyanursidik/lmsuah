import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema/index.js';

// Kredensial tidak pernah diekspos ke frontend, 
// hanya berjalan di environment Netlify Functions.
const dbUrl = process.env.DATABASE_URL || 'postgres://dummy:dummy@localhost:5432/dummy';
const sql = neon(dbUrl);
export const db = drizzle(sql, { schema });
