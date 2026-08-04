import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { db } from './utils/db.js';
import { sql } from 'drizzle-orm';

const healthHandler = async () => {
  let dbStatus = 'disconnected';
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    console.error('DB Health Check Error:', error);
  }

  return {
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    message: 'LMS Kajian YTS API is running',
  };
};

export default createHandler(healthHandler);

// Konfigurasi endpoint
export const config: Config = {
  path: '/api/health',
};
