import { Context } from '@netlify/functions';
import { createErrorResponse, createSuccessResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { handleCors } from './cors.js';
import { ValidationError } from './validation.js';
import { AuthError, ForbiddenError } from './auth.js';
import { HttpError } from '../utils/http-error.js';

export type RouteHandler = (
  request: Request,
  context: Context,
  requestId: string
) => Promise<unknown> | unknown;

export function createHandler(handler: RouteHandler) {
  return async (request: Request, context: Context) => {
    // 1. Handle CORS preflight
    const corsResponse = handleCors(request.method);
    if (corsResponse) return corsResponse;

    // 2. Generate Request ID
    const requestId = crypto.randomUUID();

    // 3. Log incoming request
    const url = new URL(request.url);
    logger.info('REQUEST_STARTED', { 
      requestId, 
      method: request.method, 
      path: url.pathname 
    });

    try {
      // 4. Execute handler
      const result = await handler(request, context, requestId);

      // Modern functions may already provide a response, including non-200 statuses.
      // Preserve its body and headers instead of serializing Response into { data: {} }.
      if (result instanceof Response) {
        logger.info('REQUEST_COMPLETED', { requestId, status: result.status });
        const headers = new Headers(result.headers);
        headers.set('x-request-id', requestId);
        if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'private, no-store');
        return new Response(result.body, {
          status: result.status,
          statusText: result.statusText,
          headers,
        });
      }
      
      logger.info('REQUEST_COMPLETED', { requestId, status: 200 });

      // 5. Return formatted success
      return new Response(
        JSON.stringify(createSuccessResponse(result)),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-store',
            'x-request-id': requestId,
          },
        }
      );
    } catch (error) {
      // 6. Handle errors and map to standardized format
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      let errorMessage = 'Terjadi kesalahan pada server';
      let databaseCode = '';
      let cause: unknown = error;
      for (let depth = 0; depth < 5 && cause && typeof cause === 'object'; depth += 1) {
        if ('code' in cause) databaseCode = String(cause.code);
        cause = 'cause' in cause ? cause.cause : null;
      }

      if (error instanceof HttpError) {
        statusCode = error.statusCode;
        errorCode = error.code;
        errorMessage = error.message;
      } else if (error instanceof ValidationError) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        errorMessage = error.message;
      } else if (error instanceof AuthError) {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        errorMessage = error.message;
      } else if (error instanceof ForbiddenError) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
        errorMessage = error.message;
      } else if (error instanceof Error && error.message === 'PROGRAM_SLUG_EXISTS') {
        statusCode = 409;
        errorCode = 'CONFLICT';
        errorMessage = 'Slug program sudah digunakan. Pilih alamat program lain.';
      } else if (error instanceof Error && error.message === 'LESSON_SLUG_EXISTS') {
        statusCode = 409;
        errorCode = 'CONFLICT';
        errorMessage = 'Slug pertemuan sudah digunakan. Pilih alamat pertemuan lain.';
      } else if (['23503', '22012', '23505'].includes(databaseCode)) {
        statusCode = 409;
        errorCode = 'DEPENDENCY_CONFLICT';
        errorMessage = 'Data berubah, urutan sudah digunakan, atau masih memiliki riwayat terkait. Muat ulang; gunakan pengurutan, arsip, atau nonaktifkan konten untuk menjaga riwayat.';
      } else if (['42P01', '42703'].includes(databaseCode)) {
        statusCode = 503;
        errorCode = 'MIGRATION_REQUIRED';
        errorMessage = 'Struktur database untuk fitur ini belum tersedia. Terapkan migrasi yang telah disetujui; tidak ada perubahan struktur otomatis dari request ini.';
      }

      logger.error('REQUEST_FAILED', error, { requestId, statusCode, errorCode });

      return new Response(
        JSON.stringify(createErrorResponse(errorCode, errorMessage, requestId)),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-store',
            'x-request-id': requestId,
          },
        }
      );
    }
  };
}
