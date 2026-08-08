import { Context } from '@netlify/functions';
import { createErrorResponse, createSuccessResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { handleCors } from './cors.js';
import { ValidationError } from './validation.js';
import { AuthError, ForbiddenError } from './auth.js';

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
      
      logger.info('REQUEST_COMPLETED', { requestId, status: 200 });

      // 5. Return formatted success
      return new Response(
        JSON.stringify(createSuccessResponse(result)),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
        }
      );
    } catch (error) {
      // 6. Handle errors and map to standardized format
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      let errorMessage = 'Terjadi kesalahan pada server';

      if (error instanceof ValidationError) {
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
      }

      logger.error('REQUEST_FAILED', error, { requestId, statusCode, errorCode });

      return new Response(
        JSON.stringify(createErrorResponse(errorCode, errorMessage, requestId)),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
        }
      );
    }
  };
}
