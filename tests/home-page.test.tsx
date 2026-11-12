import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../src/pages/public/HomePage';
import { ProgramsPage } from '../src/pages/public/ProgramsPage';
import { SchedulesPage } from '../src/pages/public/SchedulesPage';
import { ParticipantSchedulePage } from '../src/pages/participant/ParticipantSchedulePage';
import { VenueDetailPage } from '../src/pages/public/VenueDetailPage';
import { SpeakerProfilePage } from '../src/pages/public/SpeakerProfilePage';
import { getUpcomingAgenda } from '../src/lib/public-home';
import type { ScheduleItem } from '../src/mock/publicData';
import { TARBIYAH_STREAMS_URL } from '../shared/schedule-stream';

const state = vi.hoisted(() => ({
  identity: undefined as { id: string; role: string } | undefined,
  loading: new Set<string>(),
  errors: new Set<string>(),
  refetch: vi.fn(),
  calls: vi.fn(),
  programs: [
    { id: 'fiqih', title: 'Kajian Ibadah', bookTitle: 'Bulughul Maram', category: 'Fiqih', status: 'published' },
    { id: 'tafsir', title: 'Tafsir Pilihan', category: 'Tafsir', status: 'published' },
  ],
  schedules: [
    { id: 'old', title: 'Agenda lewat', date: '2000-01-01', venueId: 'venue' },
    { id: 'cancelled', title: 'Agenda batal', date: '2099-01-01', status: 'Dibatalkan', isLiveStream: true },
    { id: 'rescheduled', title: 'Agenda diundur', date: '2099-01-01', status: 'Diundur', isLiveStream: true },
    { id: 'latest', title: 'Agenda berikutnya', date: '2099-01-03', isLiveStream: true, streamUrl: 'javascript:alert(1)' },
    { id: 'next', title: 'Pertemuan pekanan', programId: 'fiqih', date: '2099-01-02', startTime: '09:00', venueId: 'venue', isLiveStream: true },
  ],
  venues: [{ id: 'venue', name: 'Masjid Uji', city: 'Bandung', status: 'active' }],
}));

vi.mock('@refinedev/core', () => ({
  useGetIdentity: () => ({ data: state.identity }),
  useList: (options: { resource: 'programs' | 'schedules' | 'venues' }) => {
    state.calls(options);
    return {
      result: { data: state.errors.has(options.resource) || state.loading.has(options.resource) ? [] : state[options.resource] || [] },
      query: { isLoading: state.loading.has(options.resource), isError: state.errors.has(options.resource), refetch: state.refetch },
    };
  },
  useOne: () => ({ result: state.venues[0], query: { isLoading: false, isError: false } }),
}));
vi.mock('../src/lib/useLearningData', () => ({ useLearningData: () => ({ enrollments: [], progress: [], loading: false, pending: false, error: '' }) }));
vi.mock('../src/pages/participant/useParticipantPortalData', () => ({
  useParticipantPortalData: () => ({ schedules: state.schedules, programs: state.programs, isSchedulesLoading: false }),
}));

beforeEach(() => {
  state.identity = undefined;
  state.loading.clear();
  state.errors.clear();
  state.calls.mockClear();
  state.refetch.mockClear();
});
afterEach(cleanup);

function renderJourney(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/programs" element={<ProgramsPage />} />
      <Route path="/belajar/katalog" element={<ProgramsPage />} />
      <Route path="/schedules" element={<SchedulesPage />} />
      <Route path="/belajar/jadwal" element={<ParticipantSchedulePage />} />
      <Route path="/venues/:id" element={<VenueDetailPage />} />
      <Route path="/speaker" element={<SpeakerProfilePage />} />
    </Routes>
  </MemoryRouter>);
}

describe('Homepage discovery and learning journeys', () => {
  it('requests bounded published programs, never loading the lesson archive', () => {
    renderJourney();
    expect(state.calls).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'programs', pagination: { currentPage: 1, pageSize: 4, mode: 'server' },
      filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    }));
    expect(state.calls.mock.calls.some(([options]) => options.resource === 'lessons')).toBe(false);
    expect(screen.getByRole('link', { name: /Lihat kurikulum/ }).getAttribute('href')).toBe('/programs/fiqih');
    expect(screen.getByRole('link', { name: /Daftar sebagai peserta/ }).getAttribute('href')).toBe('/register');
  });

  it('opens search results from the homepage and clears an empty result', () => {
    renderJourney();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Bulughul Maram' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(screen.getByRole('heading', { name: 'Kajian Ibadah' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Tafsir Pilihan' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tafsir' })).toBeDefined();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Tidak ada' } });
    expect(screen.getByRole('heading', { name: 'Program tidak ditemukan' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus filter' }));
    expect(screen.getByRole('heading', { name: 'Tafsir Pilihan' })).toBeDefined();
  });

  it('shows independent loading and retry without mock results', () => {
    state.loading.add('schedules');
    state.errors.add('programs');
    renderJourney();
    expect(screen.getByRole('status').textContent).toContain('Memuat agenda');
    expect(screen.getByRole('alert').textContent).toContain('Program kajian belum dapat dimuat');
    expect(screen.queryByRole('link', { name: /Lihat kurikulum/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Masjid Uji/ })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });

  it('keeps the speaker profile available without inventing programs when the API fails', () => {
    state.errors.add('programs');
    renderJourney('/speaker');
    expect(screen.getByRole('heading', { name: 'Ustadz Abu Haidar As-Sundawy' })).toBeDefined();
    expect(screen.getByRole('alert').textContent).toContain('Program kajian belum dapat dimuat');
    expect(screen.queryByRole('link', { name: /Lihat Program & Kurikulum/ })).toBeNull();
    expect(state.calls.mock.calls.some(([options]) => options.resource === 'lessons')).toBe(false);
  });

  it.each([false, true])('opens the exact agenda and can return to all schedules (participant: %s)', participant => {
    if (participant) state.identity = { id: 'member', role: 'participant' };
    renderJourney();
    const section = within(screen.getByRole('region', { name: 'Agenda terdekat' }));
    expect(section.queryByText('Agenda lewat')).toBeNull();
    expect(section.queryByText('Agenda batal')).toBeNull();
    expect(section.queryByText('Agenda diundur')).toBeNull();
    expect(section.getByRole('link', { name: 'Buka siaran' }).getAttribute('href')).toBe(TARBIYAH_STREAMS_URL);
    const agenda = section.getByRole('link', { name: 'Pertemuan pekanan' });
    expect(agenda.getAttribute('href')).toBe(participant ? '/belajar/jadwal?agenda=next' : '/schedules?agenda=next');
    fireEvent.click(agenda);
    expect(screen.getByRole('heading', { name: 'Pertemuan pekanan' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Agenda berikutnya' })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Lihat semua agenda' }));
    expect(screen.getByRole('heading', { name: 'Agenda berikutnya' })).toBeDefined();
  });

  it('connects an actual location back to the schedule detail', () => {
    renderJourney('/venues/venue');
    const links = screen.getAllByRole('link', { name: 'Detail agenda' });
    const next = links.find(link => link.getAttribute('href') === '/schedules?agenda=next');
    expect(next).toBeDefined();
    fireEvent.click(next!);
    expect(screen.getByRole('heading', { name: 'Pertemuan pekanan' })).toBeDefined();
    expect(screen.getByRole('link', { name: /Detail lokasi/i }).getAttribute('href')).toBe('/venues/venue');
  });

  it('offers direct progress and saved content for a participant; admin gets the admin portal', () => {
    state.identity = { id: 'member', role: 'participant' };
    const participant = renderJourney();
    expect(screen.getByRole('link', { name: 'Lanjut belajar' }).getAttribute('href')).toBe('/dashboard');
    expect(screen.getByRole('link', { name: /Materi & catatan tersimpan/ }).getAttribute('href')).toBe('/tersimpan');
    expect(screen.getByRole('link', { name: /Progres & hasil kuis/ }).getAttribute('href')).toBe('/belajar/progres');
    participant.unmount();
    state.identity = { id: 'operator', role: 'super_administrator' };
    renderJourney();
    expect(screen.getByRole('link', { name: 'Buka portal admin' }).getAttribute('href')).toBe('/admin');
    expect(screen.queryByRole('link', { name: /Daftar sebagai peserta/ })).toBeNull();
  });
});

it('uses the WIB date boundary and excludes ended or invalid agenda dates', () => {
  const agenda = (id: string, date: string, startTime?: string, endTime?: string): ScheduleItem => ({
    id, date, startTime, endTime, title: id, speaker: '', category: '', type: 'Rutin', day: '', venueId: '', isLiveStream: false,
  });
  const list = [
    agenda('tomorrow', '2026-11-13'), agenda('invalid', '2026-11-31'), agenda('previous', '2026-11-11'),
    agenda('ended', '2026-11-12', '00:00', '00:30'), agenda('later', '2026-11-12', '17:00', '18:00'),
    agenda('soon', '2026-11-12', '06:00', '07:00'),
  ];
  expect(getUpcomingAgenda(list, new Date('2026-11-11T17:30:00Z')).map(item => item.id)).toEqual(['soon', 'later', 'tomorrow']);
});
