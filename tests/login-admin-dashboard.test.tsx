import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AuthProvider, DataProvider, Refine } from '@refinedev/core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AdminDashboardPage } from '../src/pages/admin/AdminDashboardPage';
import { LoginPage } from '../src/pages/public/LoginPage';

const dataByResource: Record<string, Array<Record<string, unknown>>> = {
  programs: [
    { id: 'p-1', title: 'Program Terbit', status: 'published' },
    { id: 'p-2', title: 'Program Draft', status: 'draft' },
  ],
  lessons: [
    { id: 'l-1', title: 'Materi Terbit', status: 'published' },
    { id: 'l-2', title: 'Materi Draft', status: 'draft', programId: 'p-2' },
    { id: 'l-3', title: 'Materi Kedua', status: 'published' },
  ],
  venues: [{ id: 'v-1', name: 'Masjid UAH', status: 'active' }, { id: 'v-2', name: 'Masjid lama', status: 'inactive' }],
  schedules: [{ id: 's-1', title: 'Kajian Pekanan' }],
};

const dashboardProvider = {
  getList: vi.fn(async ({ resource, pagination, filters }: Parameters<DataProvider['getList']>[0]) => {
    const status = filters?.find(filter => 'field' in filter && filter.field === 'status')?.value;
    const items = (dataByResource[resource] ?? []).filter(item => !status || item.status === status);
    return { data: items.slice(0, pagination?.pageSize), total: items.length };
  }),
  getOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteOne: vi.fn(),
  getApiUrl: () => '/api',
} as unknown as DataProvider;

const login = vi.fn().mockResolvedValue({ success: true, redirectTo: '/admin' });
const loginAuthProvider = {
  login,
  logout: vi.fn().mockResolvedValue({ success: true }),
  check: vi.fn().mockResolvedValue({ authenticated: false }),
  getPermissions: vi.fn().mockResolvedValue(null),
  getIdentity: vi.fn().mockResolvedValue(null),
  onError: vi.fn().mockResolvedValue({}),
} as AuthProvider;

describe('Login and admin dashboard experience', () => {
  it('provides accessible login controls and demo admin access', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Refine dataProvider={dashboardProvider} authProvider={loginAuthProvider}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<div>Admin test route</div>} />
          </Routes>
        </Refine>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Masuk ke akun/i })).toBeDefined();
    expect(screen.getByRole('textbox', { name: /Email/i })).toBeDefined();
    expect(screen.getByLabelText('Password', { selector: 'input' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Tampilkan password/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Demo admin/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Demo admin/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith(expect.objectContaining({ email: 'admin@abutaidar.id' })));
  });

  it('shows an authentication failure returned by the auth provider', async () => {
    login.mockResolvedValueOnce({
      success: false,
      error: { name: 'LoginError', message: 'Email atau password tidak valid.' },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Refine dataProvider={dashboardProvider} authProvider={loginAuthProvider}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /Email/i }), {
      target: { value: 'admin@abuhaidar.my.id' },
    });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), {
      target: { value: 'password-yang-salah' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Masuk ke portal/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('Email atau password tidak valid.');
  });

  it('shows live content totals and genuine draft attention items', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Refine dataProvider={dashboardProvider}>
          <Routes><Route path="/admin" element={<AdminDashboardPage />} /></Routes>
        </Refine>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Program Draft')).toBeDefined();
    expect(screen.getByText('Materi Draft')).toBeDefined();
    const metrics = within(screen.getByRole('region', { name: 'Ringkasan pengelolaan' }));
    expect(metrics.getByRole('link', { name: '2 Program kajian' })).toBeDefined();
    expect(metrics.getByRole('link', { name: '1 Lokasi aktif' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Materi Draft' }).getAttribute('href')).toBe('/admin/programs/p-2/curriculum?lesson=l-2');
    expect(screen.getByRole('link', { name: 'Semua program draft' }).getAttribute('href')).toBe('/admin/programs?status=draft');
    expect(vi.mocked(dashboardProvider.getList).mock.calls.every(([options]) => options.pagination?.mode === 'server' && (options.pagination?.pageSize ?? 0) <= 3)).toBe(true);
    expect(screen.getByRole('link', { name: /Kelola program/i }).getAttribute('href')).toBe('/admin/programs');
    expect(screen.queryByText(/1,240 Jamaah/i)).toBeNull();
  });
});
