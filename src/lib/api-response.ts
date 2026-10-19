export class ApiResponseError extends Error {
  readonly statusCode: number;

  constructor(message: string, response: Response) {
    super(message);
    this.name = 'ApiResponseError';
    // A successful HTTP response containing HTML is a server contract error,
    // not an expired session. Preserve genuine HTTP errors, particularly 401/403.
    this.statusCode = response.ok ? 502 : response.status;
  }
}

function endpointPath(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return '/api';
  }
}

export function assertJsonResponse(response: Response, url: string): void {
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== 'application/json' && !contentType?.endsWith('+json')) {
    // Never include HTML bodies, query parameters, or credentials in diagnostics.
    throw new ApiResponseError(
      `Respons API ${endpointPath(url)} bukan JSON. Periksa routing atau deployment server, lalu coba lagi.`,
      response,
    );
  }
}

export async function readJsonResponse(response: Response, url: string) {
  assertJsonResponse(response, url);
  try {
    return await response.json();
  } catch {
    throw new ApiResponseError(
      `Respons JSON API ${endpointPath(url)} tidak valid. Silakan coba lagi atau hubungi pengelola.`,
      response,
    );
  }
}
