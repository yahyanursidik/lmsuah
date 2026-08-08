import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../src/pages/admin/AdminLayout';
import { AdminSettingsPage } from '../src/pages/admin/AdminSettingsPage';

const { update, settings } = vi.hoisted(() => {
  const settings = {
    id: 'general', siteName: 'Portal Kajian UAH', supportEmail: 'admin@example.com', defaultTimezone: 'Asia/Jakarta',
    allowRegistration: true, maintenanceMode: false, showPublicSchedule: true, allowPdfDownload: true,
  };
  return { settings, update: vi.fn((_args: unknown, options?: { onSuccess?: (value: { data: typeof settings }) => void }) => options?.onSuccess?.({ data: settings })) };
});

vi.mock('@refinedev/core', async () => {
  const actual = await vi.importActual<typeof import('@refinedev/core')>('@refinedev/core');
  return {
    ...actual,
    useGetIdentity: vi.fn(() => ({ data: { id: 'admin-1', name: 'Admin UAH', role: 'administrator' } })),
    useLogout: vi.fn(() => ({ mutate: vi.fn() })),
    useOne: vi.fn(() => ({ query: { isLoading: false, isError: false, refetch: vi.fn() }, result: settings })),
    useUpdate: vi.fn(() => ({ mutate: update, mutation: { isPending: false } })),
  };
});

describe('Admin system settings and navigation', () => {
  it('menghapus menu placeholder dan menyediakan Pengaturan Sistem aktif', () => {
    render(<MemoryRouter initialEntries={['/admin/settings']}><Routes><Route element={<AdminLayout />}><Route path="/admin/settings" element={<div>Isi pengaturan</div>} /></Route></Routes></MemoryRouter>);

    expect(screen.getAllByRole('link', { name: /Pengaturan Sistem/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Transkrip PDF')).toBeNull();
    expect(screen.queryByText('Bank Kuis')).toBeNull();
    expect(screen.queryByText('Pengguna & Peran')).toBeNull();
    expect(screen.queryByText('Dalam pengembangan')).toBeNull();
  });

  it('menyimpan konfigurasi portal dan kebijakan PDF', () => {
    render(<MemoryRouter><AdminSettingsPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/Nama portal/i), { target: { value: 'Kajian UAH Digital' } });
    fireEvent.click(screen.getByLabelText(/Izinkan unduh PDF/i));
    fireEvent.click(screen.getByRole('button', { name: /Simpan pengaturan/i }));

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'settings',
      id: 'general',
      values: expect.objectContaining({ siteName: 'Kajian UAH Digital', allowPdfDownload: false }),
    }), expect.any(Object));
    expect(screen.getByText(/Pengaturan sistem berhasil disimpan/i)).toBeDefined();
  });
});
