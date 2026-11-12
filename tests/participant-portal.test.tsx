import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ParticipantLayout } from '../src/pages/participant/ParticipantLayout';
import { DashboardPage } from '../src/pages/participant/DashboardPage';
import { MyProgramsPage } from '../src/pages/participant/MyProgramsPage';
import { ProfilePage } from '../src/pages/participant/ProfilePage';
import { SavedItemsPage } from '../src/pages/participant/SavedItemsPage';
import { portalQueryClient } from '../src/lib/query-client';

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
  lessons: [
    { id: 'lesson-1', programId: 'program-1', title: 'Pertemuan API Pertama', sequence: 1, status: 'published', materialCount: 2, hasQuiz: true },
    { id: 'lesson-2', programId: 'program-1', title: 'Pertemuan API Kedua', sequence: 2, status: 'published' },
    { id: 'lesson-private', programId: 'program-private', title: 'Pertemuan tak terbit', sequence: 1, status: 'published' },
  ],
  schedules: [
    { id: 'old', title: 'Agenda lama', date: '2000-01-01' },
    { id: 'delayed', title: 'Agenda diundur', date: '2098-01-01', status: 'Diundur' },
    { id: 'schedule-1', programId: 'program-1', title: 'Jadwal API', day: 'Ahad', date: '2099-08-09', startTime: '09:00', status: 'Rutin' },
  ],
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
  beforeEach(() => {
    memoryStorage.clear(); logout.mockClear(); portalQueryClient.clear();
    apiData.enrollments = [];
    apiData.progress = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
      const resource = new URL(url, 'http://localhost').pathname.split('/')[2];
      if (resource === 'enrollments' && options?.method === 'POST') {
        const body = JSON.parse(String(options.body));
        const item = { id: 'enrollment-1', userId: 'participant-1', programId: body.programId, status: body.status, enrolledAt: new Date().toISOString() };
        apiData.enrollments = [item];
        return Response.json({ data: item });
      }
      const items = resource === 'enrollments' || resource === 'progress' ? apiData[resource] : [];
      return Response.json({ data: { items, total: items.length, limit: 100 } });
    }));
  });

  it('menyediakan menu dan submenu peserta dengan tujuan yang valid', async () => {
    renderPortal('/dashboard', <DashboardPage />);
    await waitFor(() => expect(screen.queryByText(/Menyinkronkan pendaftaran/i)).toBeNull());
    expect(screen.getAllByRole('link', { name: /Ringkasan/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Kajian Saya/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Progres Belajar/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Jadwal Kajian/i })[0]?.getAttribute('href')).toBe('/belajar/jadwal');
    expect(screen.getAllByRole('link', { name: /Profil & Preferensi/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /ruang admin/i })).toBeNull();
  });

  it('menampilkan katalog untuk peserta baru dan hanya membuka agenda mendatang yang tepat', async () => {
    renderPortal('/dashboard', <DashboardPage />);
    await waitFor(() => expect(screen.queryByText(/Menyinkronkan pendaftaran/i)).toBeNull());
    expect(screen.getAllByText('Program API Terbaru').length).toBeGreaterThan(0);
    expect(screen.getByText('Jadwal API')).toBeDefined();
    expect(screen.queryByText('Agenda lama')).toBeNull();
    expect(screen.queryByText('Agenda diundur')).toBeNull();
    expect(screen.getByRole('link', { name: 'Detail agenda' }).getAttribute('href')).toBe('/belajar/jadwal?agenda=schedule-1');
    expect(screen.getByRole('link', { name: /Jelajahi katalog/i }).getAttribute('href')).toBe('/belajar/katalog');
    expect(screen.queryByRole('link', { name: /Lanjutkan belajar/i })).toBeNull();
  });

  it('melanjutkan riwayat yang masih tersedia dan belum selesai', async () => {
    apiData.progress = [
      { id: 'a', userId: 'participant-1', lessonId: 'lesson-private', isCompleted: false, lastPositionSeconds: 10, updatedAt: '2026-10-03T10:00:00Z' },
      { id: 'b', userId: 'participant-1', lessonId: 'lesson-2', isCompleted: true, lastPositionSeconds: 130, updatedAt: '2026-10-02T10:00:00Z' },
      { id: 'c', userId: 'participant-1', lessonId: 'lesson-1', isCompleted: false, lastPositionSeconds: 125, updatedAt: '2026-10-01T10:00:00Z' },
    ];
    renderPortal('/dashboard', <DashboardPage />);
    expect((await screen.findByRole('link', { name: /Lanjutkan belajar/i })).getAttribute('href')).toBe('/belajar/lesson/lesson-1');
    expect(screen.getByText('Posisi tersimpan: 2:05')).toBeDefined();
    expect(screen.queryByText('Pertemuan tak terbit')).toBeNull();
  });

  it('membuka tab Catatan dari pintasan dashboard', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/tersimpan" element={<SavedItemsPage />} />
    </Routes></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText(/Menyinkronkan pendaftaran/i)).toBeNull());
    fireEvent.click(screen.getByRole('link', { name: 'Catatan belajar' }));
    expect(screen.getByRole('button', { name: /^Catatan \(/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('kajian tersedia dapat diikuti melalui API dan profil menyimpan preferensi', async () => {
    const { unmount } = renderPortal('/belajar', <MyProgramsPage />);
    await waitFor(() => expect(screen.queryByText(/Menyinkronkan pendaftaran/i)).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /^Tersedia$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ikuti kajian/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Diikuti$/i }));
    expect(await screen.findByRole('button', { name: /Berhenti mengikuti/i })).toBeDefined();
    expect(apiData.enrollments).toMatchObject([{ programId: 'program-1', status: 'active' }]);
    unmount();

    renderPortal('/akun', <ProfilePage />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Pengingat melanjutkan belajar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Simpan preferensi/i }));
    expect(screen.getByRole('status').textContent).toMatch(/tersimpan/i);
    expect(localStorage.getItem('uah_participant_preferences_participant-1')).toContain('progressReminder');
  });
});
