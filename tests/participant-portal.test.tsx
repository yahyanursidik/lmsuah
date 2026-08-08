import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ParticipantLayout } from '../src/pages/participant/ParticipantLayout';
import { DashboardPage } from '../src/pages/participant/DashboardPage';
import { MyProgramsPage } from '../src/pages/participant/MyProgramsPage';
import { ProfilePage } from '../src/pages/participant/ProfilePage';

const logout = vi.fn();
let storage: Record<string, string> = {};
const memoryStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = String(value); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { storage = {}; },
};
Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true });
const apiData: Record<string, unknown[]> = {
  programs: [{ id: 'program-1', slug: 'program-satu', title: 'Program API Terbaru', description: 'Konten terbaru dari admin.', status: 'published' }],
  lessons: [{ id: 'lesson-1', programId: 'program-1', title: 'Pertemuan API Pertama', sequence: 1, status: 'published', materialCount: 2, hasQuiz: true }],
  schedules: [{ id: 'schedule-1', programId: 'program-1', title: 'Jadwal API', day: 'Ahad', date: '9 Agustus 2026', startTime: '09:00', status: 'Rutin' }],
};

vi.mock('@refinedev/core', async () => {
  const actual = await vi.importActual<typeof import('@refinedev/core')>('@refinedev/core');
  return {
    ...actual,
    useGetIdentity: vi.fn(() => ({ data: { id: 'participant-1', name: 'Ahmad Peserta', email: 'ahmad@example.test', role: 'participant' } })),
    usePermissions: vi.fn(() => ({ data: 'participant' })),
    useLogout: vi.fn(() => ({ mutate: logout, isPending: false })),
    useList: vi.fn(({ resource }: { resource: string }) => ({
      result: { data: apiData[resource] || [], total: (apiData[resource] || []).length },
      query: { isLoading: false, isError: false, refetch: vi.fn().mockResolvedValue(undefined) },
    })),
  };
});

function renderPortal(path: string, element: React.ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<ParticipantLayout />}><Route path={path} element={element} /></Route></Routes></MemoryRouter>);
}

describe('Participant portal experience', () => {
  beforeEach(() => { memoryStorage.clear(); logout.mockClear(); });

  it('menyediakan menu dan submenu peserta dengan tujuan yang valid', () => {
    renderPortal('/dashboard', <DashboardPage />);
    expect(screen.getAllByRole('link', { name: /Ringkasan/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Kajian Saya/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Progres Belajar/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Jadwal Kajian/i })[0]?.getAttribute('href')).toBe('/belajar/jadwal');
    expect(screen.getAllByRole('link', { name: /Profil & Preferensi/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /ruang admin/i })).toBeNull();
  });

  it('dashboard menggunakan program, pertemuan, dan jadwal terbaru dari API', () => {
    renderPortal('/dashboard', <DashboardPage />);
    expect(screen.getAllByText('Program API Terbaru').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pertemuan API Pertama/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Jadwal API')).toBeDefined();
    expect(screen.getByRole('link', { name: /Lanjutkan belajar/i }).getAttribute('href')).toBe('/lesson/lesson-1');
  });

  it('kajian tersedia dapat diikuti dan profil menyimpan preferensi', () => {
    const { unmount } = renderPortal('/belajar', <MyProgramsPage />);
    fireEvent.click(screen.getByRole('button', { name: /^Tersedia$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ikuti kajian/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Diikuti$/i }));
    expect(screen.getByRole('button', { name: /Berhenti mengikuti/i })).toBeDefined();
    unmount();

    renderPortal('/akun', <ProfilePage />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Pengingat melanjutkan belajar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Simpan preferensi/i }));
    expect(screen.getByRole('status').textContent).toMatch(/tersimpan/i);
    expect(localStorage.getItem('uah_participant_preferences_participant-1')).toContain('progressReminder');
  });
});
