import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { portalQueryDefaults, portalQueryClient, clearPortalQueryCache } from '../src/lib/query-client';
import { dataProvider, fetchWrapper, getActiveRequestCount } from '../src/providers/dataProvider';
import { authProvider } from '../src/providers/authProvider';
import { DataLoading } from '../src/components/ui/DataLoading';
import { GlobalNetworkIndicator } from '../src/components/ui/GlobalNetworkIndicator';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); portalQueryClient.clear(); });

describe('Navigation and network performance regressions', () => {
  it('reuses fresh menu data and fetches again after invalidation', async () => {
    const client = new QueryClient({ defaultOptions: { queries: portalQueryDefaults } });
    const queryFn = vi.fn().mockResolvedValue([{ id: 'lesson' }]);
    const query = { queryKey: ['lessons'], queryFn };
    await client.fetchQuery(query);
    await client.fetchQuery(query);
    expect(queryFn).toHaveBeenCalledOnce();
    await client.invalidateQueries({ queryKey: ['lessons'] });
    await client.fetchQuery(query);
    expect(queryFn).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('clears protected data at an account boundary', async () => {
    portalQueryClient.setQueryData(['private-lessons'], [{ title: 'Admin only' }]);
    await clearPortalQueryCache();
    expect(portalQueryClient.getQueryData(['private-lessons'])).toBeUndefined();
  });

  it('does not retry validation, permission, timeout, or invalid JSON failures', () => {
    for (const statusCode of [400, 401, 403, 404, 408, 409, 422]) {
      expect(portalQueryDefaults.retry(0, { statusCode })).toBe(false);
    }
    expect(portalQueryDefaults.retry(0, { statusCode: 502, name: 'ApiResponseError' })).toBe(false);
    expect(portalQueryDefaults.retry(0, { statusCode: 503 })).toBe(true);
    expect(portalQueryDefaults.retry(1, { statusCode: 503 })).toBe(false);
  });

  it('coalesces account identity and permission requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: {
      user: { id: 'one', name: 'Admin' }, roles: ['administrator'],
    } }));
    vi.stubGlobal('fetch', fetchMock);
    const [identity, role] = await Promise.all([authProvider.getIdentity?.(), authProvider.getPermissions?.()]);
    expect(identity).toMatchObject({ id: 'one', role: 'administrator' });
    expect(role).toBe('administrator');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(getActiveRequestCount()).toBe(0);
  });

  it('keeps loading active while the body is still arriving', async () => {
    let finish!: () => void;
    const stream = new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"data":'));
      finish = () => { controller.enqueue(new TextEncoder().encode('[]}')); controller.close(); };
    } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, { headers: { 'Content-Type': 'application/json' } })));
    const request = fetchWrapper('/api/lessons');
    await Promise.resolve();
    expect(getActiveRequestCount()).toBe(1);
    finish();
    await expect((await request).json()).resolves.toEqual({ data: [] });
    expect(getActiveRequestCount()).toBe(0);
  });

  it('does not cache a failed permissions request as a participant role', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { message: 'Layanan akun sementara terganggu.' } }, { status: 503 })));
    await expect(authProvider.getPermissions?.()).rejects.toMatchObject({ statusCode: 503 });
  });

  it('bounds a stalled read and shows an actionable timeout error', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const assertion = expect(fetchWrapper('/api/lessons')).rejects.toMatchObject({ statusCode: 408, message: expect.stringContaining('Coba Lagi') });
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
    expect(getActiveRequestCount()).toBe(0);
  });

  it('never automatically repeats a timed-out write', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const assertion = expect(fetchWrapper('/api/schedules', { method: 'POST', body: '{}' })).rejects.toMatchObject({ statusCode: 408, message: expect.stringContaining('mungkin sudah tersimpan') });
    await vi.advanceTimersByTimeAsync(45_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(getActiveRequestCount()).toBe(0);
  });

  it('preserves all pages in order while loading later pages concurrently', async () => {
    let active = 0; let maximum = 0;
    const fetchMock = vi.fn(async (url: string) => {
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      const page = Number(new URL(url).searchParams.get('_page'));
      return Response.json({ data: { items: [{ id: page }], total: 4, limit: 1 } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await dataProvider().getList({ resource: 'lessons', pagination: { mode: 'off' } });
    expect(result.data.map(item => item.id)).toEqual([1, 2, 3, 4]);
    expect(maximum).toBe(3);
  });

  it('explains slow loading and removes its timer when unmounted', async () => {
    vi.useFakeTimers();
    const view = render(<DataLoading label="Memuat modul dan pertemuan…" />);
    expect(screen.getByRole('status').textContent).toContain('Memuat modul');
    await act(() => vi.advanceTimersByTimeAsync(8_000));
    expect(screen.getByText(/Koneksi membutuhkan waktu lebih lama/)).toBeDefined();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows global loading for auth queries even outside the data fetch wrapper', async () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><GlobalNetworkIndicator /></QueryClientProvider>);
    let finish!: () => void;
    let request!: Promise<unknown>;
    await act(async () => {
      request = client.fetchQuery({ queryKey: ['auth'], queryFn: () => new Promise(resolve => { finish = () => resolve(true); }) });
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(screen.getByRole('status').textContent).toContain('Memuat data');
    await act(async () => { finish(); await request; await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(screen.queryByRole('status')).toBeNull();
    client.clear();
  });
});
