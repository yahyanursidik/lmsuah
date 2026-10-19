import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { clearPortalQueryCache } from './lib/query-client';

afterEach(async () => { cleanup(); await clearPortalQueryCache(); vi.unstubAllGlobals(); });

describe('App Smoke Test', () => {
  it('renders without crashing', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(String(url).includes('/auth/') ? { data: { user: null, roles: [] } } : { data: { items: [], total: 0, limit: 100 } })));
    await act(async () => { render(<App />); });
    expect(screen.getAllByText(/Kajian Ustadz Abu Haidar/i).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText('Memuat data…')).toBeNull());
  });
});
