export interface SuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> {
  return {
    data,
    ...(meta && { meta }),
  };
}

export function createErrorResponse(code: string, message: string, requestId: string): ErrorResponse {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}
