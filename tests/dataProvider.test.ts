import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataProvider, fetchWrapper } from '../src/providers/dataProvider.js';
import { HttpError } from '@refinedev/core';

// Buat mock global.fetch
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

describe('Custom Refine REST Data Provider', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
    fetchMock.mockReset();
    window.localStorage.clear();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234');
  });

  describe('fetchWrapper', () => {
    it('Harus menyertakan credentials: "include" dan X-Request-ID', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      });

      await fetchWrapper('/api/test');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.any(Headers),
        })
      );
      
      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('X-Request-ID')).toBe('test-uuid-1234');
    });

    it('Harus melemparkan HttpError yang sesuai ketika response tidak ok (Error Mapping)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: { message: 'Akses tidak diizinkan', code: 'FORBIDDEN' }
        }),
      });

      try {
        await fetchWrapper('/api/test');
        expect.fail('Seharusnya melemparkan error');
      } catch (err: unknown) {
        expect((err as HttpError).statusCode).toBe(403);
        expect((err as HttpError).message).toBe('Akses tidak diizinkan');
      }
    });

    it('mengirim identitas demo admin pada localhost agar API lokal mengenali sesi', async () => {
      window.localStorage.setItem('lms_demo_user', JSON.stringify({ id: 'demo-admin-1', role: 'admin' }));
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: 'success' }) });

      await fetchWrapper('/api/test');

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get('X-LMS-Demo-User')).toBe('demo-admin-1');
    });

    it('mengirim identitas demo peserta agar akses pertemuan lokal tidak dianggap guest', async () => {
      window.localStorage.setItem('lms_demo_user', JSON.stringify({ id: 'demo-peserta-1', role: 'participant' }));
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: 'success' }) });

      await fetchWrapper('/api/lessons/lesson-1');

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get('X-LMS-Demo-User')).toBe('demo-peserta-1');
    });
  });

  describe('dataProvider', () => {
    const provider = dataProvider();

    it('getList - Harus merangkai query parameter dengan benar', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1, title: 'Item 1' }],
          meta: { total: 100 },
        }),
      });

      await provider.getList({
        resource: 'posts',
        pagination: { current: 2, pageSize: 20, mode: 'server' },
        sorters: [{ field: 'createdAt', order: 'desc' }],
        filters: [{ field: 'status', operator: 'eq', value: 'published' }],
      });

      const callArgs = fetchMock.mock.calls[0];
      const url = new URL(callArgs[0]);
      
      expect(url.pathname).toBe('/api/posts');
      expect(url.searchParams.get('_page')).toBe('2');
      expect(url.searchParams.get('_limit')).toBe('20');
      expect(url.searchParams.get('_sort')).toBe('createdAt');
      expect(url.searchParams.get('_order')).toBe('desc');
      expect(url.searchParams.get('status')).toBe('published');
    });

    it('create - Harus mengirimkan metode POST dan body JSON', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1, title: 'Baru' } }),
      });

      const result = await provider.create({
        resource: 'posts',
        variables: { title: 'Baru' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/posts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Baru' }),
        })
      );
      expect(result.data).toEqual({ id: 1, title: 'Baru' });
    });
    
    // Pastikan database logic tidak terekspos dalam body melainkan menggunakan format RESTful
  });
});
