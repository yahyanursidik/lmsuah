import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { filterPortalNavigation, getPortalTrail, isPortalItemActive, portalNavigation } from '../src/lib/portal-navigation';
import { PortalBreadcrumbs, PortalSidebar } from '../src/components/ui/PortalNavigation';

describe('Portal navigation', () => {
  it('finds curriculum features under programs, without a duplicate material menu', () => {
    expect(filterPortalNavigation('admin', 'materi').flatMap(group => group.items).map(item => item.href)).toEqual(['/admin/programs']);
    expect(filterPortalNavigation('participant', 'JADWAL').flatMap(group => group.items).map(item => item.href)).toEqual(['/belajar/jadwal']);
    expect(filterPortalNavigation('admin', 'tidakada')).toEqual([]);
  });
  it('provides stable parents for program curriculum and lesson routes', () => {
    expect(getPortalTrail('admin', '/admin/programs/p-1/curriculum').map(item => item.href)).toEqual(['/admin', '/admin/programs', '/admin/programs/p-1', '/admin/programs/p-1/curriculum']);
    expect(getPortalTrail('participant', '/belajar/lesson/l-1').map(item => item.label)).toEqual(['Ringkasan', 'Kajian Saya', 'Pertemuan']);
  });
  it('highlights only the closest participant section', () => {
    const items = portalNavigation.participant.flatMap(group => group.items);
    expect(items.filter(item => isPortalItemActive('participant', item, '/belajar/katalog/p-1')).map(item => item.label)).toEqual(['Katalog Kajian']);
    expect(items.filter(item => isPortalItemActive('participant', item, '/belajar/progres')).map(item => item.label)).toEqual(['Progres Belajar']);
  });
  it('searches menus and offers a reset when there are no matches', () => {
    render(<MemoryRouter><PortalSidebar portal="admin" onNavigate={vi.fn()} onLogout={vi.fn()} isLoggingOut={false} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cari menu admin' }), { target: { value: 'kuis' } });
    expect(screen.getByRole('link', { name: 'Program Kajian' }).getAttribute('href')).toBe('/admin/programs');
    expect(screen.queryByRole('link', { name: 'Pengaturan Sistem' })).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzz' } });
    expect(screen.getByText('Tidak ada menu yang cocok.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan semua' }));
    expect(screen.getByRole('link', { name: 'Pengaturan Sistem' })).toBeDefined();
  });
  it('shows breadcrumb links without exposing opaque database IDs', () => {
    render(<MemoryRouter initialEntries={['/admin/programs/opaque-id/curriculum']}><PortalBreadcrumbs portal="admin" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Detail program' }).getAttribute('href')).toBe('/admin/programs/opaque-id');
    expect(screen.getByText('Kurikulum').getAttribute('aria-current')).toBe('page');
    expect(screen.queryByText('opaque-id')).toBeNull();
  });
});
