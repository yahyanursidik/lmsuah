import { describe, expect, it } from 'vitest';
import { ApiResponseError, readJsonResponse } from '../src/lib/api-response';

describe('API response contract', () => {
  it.each(['application/json; charset=utf-8', 'application/problem+json', 'APPLICATION/JSON'])('accepts %s', async (contentType) => {
    const response = new Response('{"data":{"id":"one"}}', { headers: { 'Content-Type': contentType } });
    await expect(readJsonResponse(response, '/api/lessons')).resolves.toEqual({ data: { id: 'one' } });
  });

  it.each(['text/html', 'text/plain', ''])('rejects unexpected content type %s without leaking credentials', async (contentType) => {
    const response = new Response('<!doctype html>private-content', { headers: { 'Content-Type': contentType } });
    await expect(readJsonResponse(response, 'https://user:password@example.com/api/lessons?token=secret')).rejects.toMatchObject({
      name: 'ApiResponseError', statusCode: 502,
      message: 'Respons API /api/lessons bukan JSON. Periksa routing atau deployment server, lalu coba lagi.',
    });
  });

  it('maps malformed JSON to a useful error instead of a parser SyntaxError', async () => {
    await expect(readJsonResponse(new Response('{', { headers: { 'Content-Type': 'application/json' } }), '/api/quizzes')).rejects.toBeInstanceOf(ApiResponseError);
  });

  it.each([401, 403, 500])('preserves HTTP %s on invalid response bodies', async (status) => {
    await expect(readJsonResponse(new Response('<html>', { status, headers: { 'Content-Type': 'application/json' } }), '/api/auth/me')).rejects.toMatchObject({ statusCode: status });
  });
});
