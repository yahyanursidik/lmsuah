import type { Config } from '@netlify/functions';
import { auth } from './utils/auth.js';

export default async function handler(request: Request) {
  return auth.handler(request);
}

export const config: Config = {
  path: '/api/auth/*',
};
