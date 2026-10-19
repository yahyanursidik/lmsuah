import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@netlify/functions';
import * as lessons from '../netlify/functions/lessons';
import * as enrollments from '../netlify/functions/enrollments';
import * as quizzes from '../netlify/functions/quizzes';
import { createHandler } from '../netlify/functions/middleware/handler';
import { AuthError, ForbiddenError } from '../netlify/functions/middleware/auth';

const mocks = vi.hoisted(() => ({ select: vi.fn(), getSession: vi.fn(), logInfo: vi.fn(), logError: vi.fn() }));
vi.mock('../netlify/functions/utils/db.js', () => ({ db: { select: mocks.select } }));
vi.mock('../netlify/functions/utils/auth.js', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('../netlify/functions/utils/logger.js', () => ({ logger: { info: mocks.logInfo, error: mocks.logError, warn: vi.fn() } }));

const context = {} as Context;
const request = (path = '/api/quizzes/quiz-1', method = 'GET') => new Request(`https://example.com${path}`, { method });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue(null);
  mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
});

describe('Modern Netlify function exports', () => {
  it.each([
    ['lessons', lessons], ['enrollments', enrollments], ['quizzes', quizzes],
  ] as const)('%s uses only the default handler and custom API paths', async (resource, module) => {
    expect(typeof module.default).toBe('function');
    // A named handler makes Netlify classify the module as a legacy Lambda function.
    expect('handler' in module).toBe(false);
    expect(module.config.path).toEqual([`/api/${resource}`, `/api/${resource}/*`]);
    const response = await module.default(request(`/api/${resource}`, 'OPTIONS'), context);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(204);
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('returns a real JSON 404 for a missing quiz instead of { data: {} }', async () => {
    const response = await quizzes.default(request(), context);
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('x-request-id')).toBeTruthy();
    await expect(response.json()).resolves.toEqual({ error: { message: 'Quiz not found' } });
  });

  it('does not make unpublished quizzes available to guests', async () => {
    mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 'quiz-1', isPublished: false }] }) }) });
    const response = await quizzes.default(request(), context);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('keeps enrollments private when no session exists', async () => {
    const response = await enrollments.default(request('/api/enrollments'), context);
    expect(response.status).toBe(403);
    expect(mocks.select).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it.each([
    ['quizzes', quizzes.default], ['enrollments', enrollments.default],
  ] as const)('%s preserves JSON 405 for unsupported methods', async (resource, handler) => {
    const response = await handler(request(`/api/${resource}`, 'PUT'), context);
    expect(response.status).toBe(405);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({ error: { message: expect.any(String) } });
  });
});

describe('Shared response middleware', () => {
  it.each([200, 201, 400, 403, 404, 405])('preserves an existing Response with status %s and headers', async (status) => {
    const body = status < 400 ? { data: { id: 'attempt-1' } } : { error: { message: 'Request failed' } };
    const response = await createHandler(() => Response.json(body, { status, headers: { 'x-test': 'kept' } }))(request(), context);
    expect(response.status).toBe(status);
    expect(response.headers.get('x-test')).toBe('kept');
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(mocks.logInfo).toHaveBeenLastCalledWith('REQUEST_COMPLETED', expect.objectContaining({ status }));
    await expect(response.json()).resolves.toEqual(body);
  });

  it('does not impose a JSON body on an empty response', async () => {
    const response = await createHandler(() => new Response(null, { status: 204 }))(request(), context);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('keeps the existing data envelope for plain handler results', async () => {
    const response = await createHandler(() => ({ items: [], total: 0 }))(request(), context);
    await expect(response.json()).resolves.toEqual({ data: { items: [], total: 0 } });
  });

  it.each([
    [new AuthError('Session expired'), 401, 'UNAUTHORIZED'],
    [new ForbiddenError('Access denied'), 403, 'FORBIDDEN'],
  ] as const)('preserves authentication error mapping', async (error, status, code) => {
    const response = await createHandler(() => { throw error; })(request(), context);
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: { code, message: error.message } });
  });
});
