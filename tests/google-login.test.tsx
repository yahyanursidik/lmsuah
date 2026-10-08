import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { startGoogleLogin } from '../src/lib/google-auth';
import { getOAuthConfig } from '../netlify/functions/utils/oauth-config';
import { AuthCompletePage } from '../src/pages/public/AuthCompletePage';

const mocks = vi.hoisted(() => ({ social: vi.fn(), getSession: vi.fn() }));
vi.mock('../src/lib/auth-client', () => ({
  signIn: { social: mocks.social }, signOut: vi.fn(), authClient: { getSession: mocks.getSession },
}));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Google login', () => {
  it('does not start OAuth when credentials are unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ google: false })));
    await expect(startGoogleLogin()).rejects.toThrow('belum tersedia');
    expect(mocks.social).not.toHaveBeenCalled();
    expect(getOAuthConfig({ GOOGLE_CLIENT_ID: 'client' }).googleEnabled).toBe(false);
  });
  it('reports provider errors rather than treating them as successful login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ google: true })));
    mocks.social.mockResolvedValue({ error: { message: 'provider unavailable' } });
    await expect(startGoogleLogin()).rejects.toThrow('belum berhasil dimulai');
    expect(mocks.social).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'google', callbackURL: expect.stringContaining('/auth/complete'),
      errorCallbackURL: expect.stringContaining('/login'), disableRedirect: true,
    }), expect.objectContaining({ timeout: 15000 }));
  });
  it('rejects redirects to unexpected hosts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ google: true })));
    mocks.social.mockResolvedValue({ data: { url: 'https://untrusted.example/oauth' } });
    await expect(startGoogleLogin()).rejects.toThrow('tidak valid');
  });
  it.each([
    ['super_administrator', 'Dashboard admin'],
    ['administrator', 'Dashboard admin'],
    ['participant', 'Dashboard peserta'],
  ])('opens the appropriate portal for %s after Google callback', async (role, destination) => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: 'u1' } } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { user: { id: 'u1' }, roles: [role] } })));
    render(<MemoryRouter initialEntries={['/auth/complete']}><Routes>
      <Route path="/auth/complete" element={<AuthCompletePage />} />
      <Route path="/admin" element={<h1>Dashboard admin</h1>} />
      <Route path="/dashboard" element={<h1>Dashboard peserta</h1>} />
    </Routes></MemoryRouter>);
    expect(await screen.findByText(destination)).toBeDefined();
  });
  it('stays on callback and allows retry when the account cannot be loaded', async () => {
    mocks.getSession.mockResolvedValue({ data: { user: { id: 'u1' } } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 500 })).mockResolvedValueOnce(Response.json({ data: { user: { id: 'u1' }, roles: ['administrator'] } })));
    render(<MemoryRouter initialEntries={['/auth/complete']}><Routes>
      <Route path="/auth/complete" element={<AuthCompletePage />} />
      <Route path="/admin" element={<h1>Dashboard admin</h1>} />
    </Routes></MemoryRouter>);
    expect(await screen.findByRole('alert')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Dashboard admin')).toBeDefined();
  });
});
