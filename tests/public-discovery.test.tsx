import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TARBIYAH_STREAMS_URL } from '../shared/schedule-stream';
import { agendaRows, venueMapsHref, type DiscoveryVenue } from '../src/lib/public-discovery';
import { ParticipantSchedulePage } from '../src/pages/participant/ParticipantSchedulePage';
import { ProgramDetailPage } from '../src/pages/public/ProgramDetailPage';
import { ProgramsPage } from '../src/pages/public/ProgramsPage';
import { SchedulesPage } from '../src/pages/public/SchedulesPage';
import { SpeakerProfilePage } from '../src/pages/public/SpeakerProfilePage';
import { VenueDetailPage } from '../src/pages/public/VenueDetailPage';
import { VenuesPage } from '../src/pages/public/VenuesPage';

const ids = vi.hoisted(() => ({
  next: '00000000-0000-4000-8000-000000000001',
  hidden: '00000000-0000-4000-8000-000000000002',
  missing: '00000000-0000-4000-8000-000000000003',
}));
const state = vi.hoisted(() => {
  const rows = {
    programs: [
      { id: 'fiqih', title: 'Kajian Thaharah', category: 'Fiqih', status: 'published', bookTitle: 'Kitab Bulughul Maram', instructor: 'Ustaz Abu Haidar As Sundawi' },
      { id: 'tafsir', title: 'Kajian Tafsir', category: 'Tafsir', status: 'published', instructor: 'Pemateri lain' },
      { id: 'tanpa-pemateri', title: 'Bahasa Arab', category: 'Bahasa Arab', status: 'published' },
      { id: 'draft', title: 'Program belum terbit', category: 'Fiqih', status: 'draft', instructor: 'Ustadz Abu Haidar As-Sundawy' },
    ],
    venues: [
      { id: 'a', name: 'Masjid Uji Bandung', address: 'Jalan Contoh', city: 'Bandung', district: 'Cicendo', status: 'active' },
      { id: 'b', name: 'Masjid Uji Cimahi', address: 'Jalan Uji', city: 'Cimahi', status: 'active' },
      { id: 'inactive', name: 'Lokasi nonaktif', status: 'inactive' },
    ],
    schedules: [
      { id: 'old', title: 'Agenda lama', date: '2001-01-01', programId: 'fiqih', venueId: 'a', type: 'Rutin' },
      { id: ids.next, title: 'Pertemuan thaharah', date: '2099-01-02', startTime: '10:00', endTime: '11:00', programId: 'fiqih', venueId: 'a', type: 'Rutin', isLiveStream: true },
      { id: 'other', title: 'Kajian tafsir tematik', date: '2099-01-02', startTime: '08:00', programId: 'tafsir', venueId: 'b', type: 'Tematik' },
      { id: 'cancel', title: 'Agenda batal', date: '2099-01-02', programId: 'fiqih', venueId: 'a', status: 'Dibatalkan', statusReason: 'Penyesuaian jadwal', isLiveStream: true },
      { id: 'moved', title: 'Agenda pindah lokasi', date: '2099-01-04', programId: 'tafsir', venueId: 'a', status: 'Pindah Lokasi' },
      { id: ids.hidden, title: 'Agenda dengan data terbatas', date: '2099-01-05', programId: 'draft', venueId: 'inactive', isLiveStream: true, streamUrl: 'javascript:alert(1)' },
    ],
    lessons: [
      { id: 'lesson', title: 'Bersuci dari hadats', sequence: 1, programId: 'fiqih', status: 'published' },
      { id: 'draft-lesson', title: 'Pertemuan belum terbit', sequence: 2, programId: 'fiqih', status: 'draft' },
    ],
  };
  return {
    rows,
    loading: new Set<string>(),
    errors: new Set<string>(),
    list: vi.fn(),
    one: vi.fn(),
    retry: vi.fn(),
    follow: vi.fn(),
    enrollments: [] as { programId: string; status: string }[],
    progress: [] as { lessonId: string; isCompleted: boolean }[],
  };
});

vi.mock('@refinedev/core', () => ({
  useGetIdentity: () => ({ data: { id: 'fixture-member' } }),
  useList: (options: { resource: keyof typeof state.rows; queryOptions?: { enabled?: boolean } }) => {
    state.list(options);
    const { resource } = options;
    const isLoading = state.loading.has(resource);
    const isError = state.errors.has(resource);
    // Return raw rows to verify defense in depth for draft and inactive items.
    const data = isLoading || isError || options.queryOptions?.enabled === false ? [] : state.rows[resource] || [];
    return { result: { data }, query: { isLoading, isError, refetch: state.retry } };
  },
  useOne: (options: { resource: keyof typeof state.rows; id: string; queryOptions?: { enabled?: boolean } }) => {
    state.one(options);
    const result = state.rows[options.resource]?.find(row => row.id === options.id);
    const missing = !!options.id && !result && options.queryOptions?.enabled !== false;
    return { result, query: { isLoading: false, isError: missing, error: missing ? { statusCode: 404 } : undefined, refetch: state.retry } };
  },
}));
vi.mock('../src/lib/useLearningData', () => ({
  useLearningData: () => ({
    enrollments: state.enrollments, progress: state.progress, loading: false, pending: false, error: '',
    refresh: state.retry, follow: state.follow,
  }),
}));

function RouteProbe() {
  const { pathname, search } = useLocation();
  return <div hidden data-testid="route">{pathname + search}</div>;
}

function show(path: string) {
  return render(<MemoryRouter initialEntries={[path]}>
    <RouteProbe />
    <Routes>
      <Route path="/programs" element={<ProgramsPage />} />
      <Route path="/programs/:id" element={<ProgramDetailPage />} />
      <Route path="/schedules" element={<SchedulesPage />} />
      <Route path="/venues" element={<VenuesPage />} />
      <Route path="/venues/:id" element={<VenueDetailPage />} />
      <Route path="/speaker" element={<SpeakerProfilePage />} />
      <Route path="/belajar/katalog" element={<ProgramsPage />} />
      <Route path="/belajar/katalog/:id" element={<ProgramDetailPage />} />
      <Route path="/belajar/lokasi" element={<VenuesPage />} />
      <Route path="/belajar/lokasi/:id" element={<VenueDetailPage />} />
      <Route path="/belajar/jadwal" element={<ParticipantSchedulePage />} />
    </Routes>
  </MemoryRouter>);
}

const href = (name: string | RegExp) => screen.getByRole('link', { name }).getAttribute('href');
const clickLink = (name: string | RegExp) => fireEvent.click(screen.getByRole('link', { name }));

beforeEach(() => {
  vi.clearAllMocks();
  state.loading.clear();
  state.errors.clear();
  state.enrollments = [];
  state.progress = [];
});
afterEach(cleanup);

describe('Public and participant discovery', () => {
  it('shares keyword and category filters, and restores them when returning from the curriculum', () => {
    show('/programs');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'thaharah kitāb' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fiqih' }));
    const catalog = screen.getByTestId('route').textContent;
    expect(catalog).toContain('kategori=Fiqih');
    expect(screen.queryByRole('heading', { name: 'Program belum terbit' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Kajian Tafsir' })).toBeNull();
    clickLink('Lihat kurikulum: Kajian Thaharah');
    expect(screen.getByRole('heading', { name: 'Kurikulum & pertemuan' })).toBeDefined();
    expect(href('Buka pertemuan')).toBe('/lesson/lesson');
    expect(screen.queryByRole('heading', { name: 'Pertemuan belum terbit' })).toBeNull();
    expect(href('Lihat jadwal program')).toBe('/schedules?programId=fiqih');
    expect(href('Kembali ke katalog')).toBe(catalog);
    clickLink('Kembali ke katalog');
    expect(screen.getByRole('searchbox')).toHaveProperty('value', 'thaharah kitāb');
    expect(screen.getByRole('button', { name: 'Fiqih' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows upcoming first, filters by type and text, and retains past/changed agenda', () => {
    show('/schedules');
    expect(screen.getAllByRole('heading', { level: 2 })[0]?.textContent).toBe('Kajian tafsir tematik');
    expect(screen.queryByRole('heading', { name: 'Agenda lama' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Agenda batal' })).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'Jenis agenda' }), { target: { value: 'siaran' } });
    expect(screen.getByRole('heading', { name: 'Pertemuan thaharah' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Agenda dengan data terbatas' })).toBeNull();
    expect(href(/Buka siaran/)).toBe(TARBIYAH_STREAMS_URL);
    fireEvent.change(screen.getByRole('combobox', { name: 'Jenis agenda' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Perubahan' }));
    expect(screen.getByRole('heading', { name: 'Agenda batal' })).toBeDefined();
    expect(screen.getByText('Penyesuaian jadwal', { exact: false })).toBeDefined();
    expect(screen.queryByRole('link', { name: /Buka siaran/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Semua' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'agenda lama bandung' } });
    expect(screen.getByRole('heading', { name: 'Agenda lama' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Pertemuan thaharah' })).toBeNull();
  });

  it('loads a shared agenda without fetching the archive and links to both details', () => {
    show('/schedules?agenda=' + ids.next);
    expect(state.one).toHaveBeenCalledWith(expect.objectContaining({ resource: 'schedules', id: ids.next }));
    expect(state.list.mock.calls.filter(([call]) => call.resource === 'schedules').every(([call]) => call.queryOptions.enabled === false)).toBe(true);
    expect(href('Lihat kurikulum: Kajian Thaharah')).toBe('/programs/fiqih');
    expect(href('Detail lokasi: Masjid Uji Bandung')).toBe('/venues/a');
    expect(screen.queryByRole('heading', { name: 'Kajian tafsir tematik' })).toBeNull();
    clickLink('Lihat kurikulum: Kajian Thaharah');
    clickLink('Lihat jadwal program');
    expect(screen.getByTestId('route').textContent).toBe('/schedules?programId=fiqih');
    expect(screen.queryByRole('heading', { name: 'Kajian tafsir tematik' })).toBeNull();
    clickLink('Pertemuan thaharah');
    expect(screen.getByTestId('route').textContent).toBe('/schedules?programId=fiqih&agenda=' + ids.next);
    expect(href('Kembali ke daftar agenda')).toBe('/schedules?programId=fiqih');
  });

  it('recovers from a missing agenda and never links unpublished or inactive references', () => {
    const view = show('/schedules?agenda=' + ids.missing);
    expect(screen.getByRole('heading', { name: 'Agenda tidak ditemukan' })).toBeDefined();
    expect(href('Lihat semua agenda')).toBe('/schedules');
    view.unmount();
    show('/schedules?agenda=' + ids.hidden);
    expect(screen.queryByRole('link', { name: /Lihat kurikulum|Detail lokasi|Buka siaran/ })).toBeNull();
  });

  it('filters venues by city, restores the directory and offers only valid map destinations', () => {
    show('/venues');
    fireEvent.change(screen.getByRole('combobox', { name: 'Kota atau kabupaten' }), { target: { value: 'Bandung' } });
    expect(screen.queryByRole('heading', { name: 'Masjid Uji Cimahi' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Lokasi nonaktif' })).toBeNull();
    const url = new URL(href(/Peta: Masjid Uji Bandung/)!);
    expect(url.hostname).toBe('www.google.com');
    expect(url.searchParams.get('query')).toBe('Masjid Uji Bandung, Jalan Contoh, Bandung');
    clickLink('Detail lokasi: Masjid Uji Bandung');
    expect(href('Kembali ke lokasi')).toBe('/venues?kota=Bandung');
    expect(href('Semua agenda di sini')).toBe('/schedules?venueId=a&view=semua');
    expect(href('Detail agenda: Pertemuan thaharah')).toBe('/schedules?agenda=' + ids.next);
  });

  it('keeps agenda, venue and curriculum navigation in the participant portal', () => {
    state.enrollments = [{ programId: 'fiqih', status: 'active' }];
    show('/belajar/lokasi?kota=Bandung');
    clickLink('Jadwal di Masjid Uji Bandung');
    expect(screen.getByTestId('route').textContent).toBe('/belajar/jadwal?venueId=a');
    const next = within(screen.getByRole('heading', { name: 'Pertemuan thaharah' }).closest('article')!);
    expect(next.getByRole('link', { name: 'Detail lokasi: Masjid Uji Bandung' }).getAttribute('href')).toBe('/belajar/lokasi/a');
    expect(href('Lihat kurikulum: Kajian Thaharah')).toBe('/belajar/katalog/fiqih');
    expect(state.list.mock.calls.some(([call]) => call.resource === 'lessons')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus filter lokasi/program' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kajian saya' }));
    expect(screen.getByRole('heading', { name: 'Agenda lama' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Kajian tafsir tematik' })).toBeNull();
    const agenda = within(screen.getByRole('heading', { name: 'Pertemuan thaharah' }).closest('article')!);
    fireEvent.click(agenda.getByRole('link', { name: 'Lihat kurikulum: Kajian Thaharah' }));
    expect(href('Lanjut belajar')).toBe('/belajar/lesson/lesson');
    expect(href('Lihat jadwal program')).toBe('/belajar/jadwal?programId=fiqih');
  });

  it('shows attribution only when the published program names the speaker', () => {
    show('/speaker');
    const section = within(screen.getByRole('region', { name: 'Program yang diampu' }));
    expect(section.getByRole('heading', { name: 'Kajian Thaharah' })).toBeDefined();
    expect(section.queryByRole('heading', { name: /Bahasa Arab|Kajian Tafsir|Program belum terbit/ })).toBeNull();
    expect(href('Buka katalog')).toBe('/programs');
    expect(href('Jadwal kajian')).toBe('/schedules');
    expect(href(/Tarbiyah Sunnah Channel/)).toBe(TARBIYAH_STREAMS_URL);
  });

  it('labels the general catalog separately when no published program names the speaker', () => {
    const original = state.rows.programs[0].instructor;
    state.rows.programs[0].instructor = '';
    try {
      show('/speaker');
      expect(screen.queryByRole('region', { name: 'Program yang diampu' })).toBeNull();
      expect(within(screen.getByRole('region', { name: 'Program kajian di portal' }))
        .getByRole('heading', { name: 'Kajian Thaharah' })).toBeDefined();
    } finally {
      state.rows.programs[0].instructor = original;
    }
  });

  it('announces loading and offers a working retry action after a failed list request', () => {
    state.loading.add('schedules');
    const view = show('/schedules');
    expect(screen.getByRole('status').textContent).toContain('Memuat agenda kajian');
    view.unmount();
    state.loading.clear();
    state.errors.add('schedules');
    show('/schedules');
    expect(screen.getByRole('alert').textContent).toContain('Jadwal kajian belum dapat dimuat');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(state.retry).toHaveBeenCalledOnce();
  });

  it('provides a visible fallback when the address cannot be copied', async () => {
    show('/venues/a');
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Salin alamat' }));
      await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/salin teks alamat secara manual/i));
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });
});

it('uses the WIB day boundary and keeps legacy dates out of the upcoming view', () => {
  const items = [
    { id: 'ended', date: '2026-11-12', endTime: '00:30' },
    { id: 'late', date: '2026-11-12', startTime: '15:00' },
    { id: 'invalid', date: '2026-11-31' },
    { id: 'future-cancelled', date: '2026-11-13', status: 'Dibatalkan' as const },
  ];
  const now = new Date('2026-11-11T17:31:00Z');
  expect(agendaRows(items, 'mendatang', now).map(item => item.id)).toEqual(['late']);
  expect(agendaRows(items, 'perubahan', now).map(item => item.id)).toEqual(['future-cancelled']);
  expect(agendaRows(items, 'semua', now).map(item => item.id)).toEqual(['late', 'future-cancelled', 'ended', 'invalid']);
});

it('rejects script URLs and blank coordinates; derives an address or valid coordinate search', () => {
  const base = { name: 'Masjid Uji', googleMapsUrl: 'javascript:alert(1)', latitude: ' ', longitude: '' } as DiscoveryVenue;
  expect(venueMapsHref(base)).toBeUndefined();
  const url = new URL(venueMapsHref({ ...base, latitude: '-6.91', longitude: '107.61' })!);
  expect(url.searchParams.get('query')).toBe('-6.91,107.61');
  const directions = new URL(venueMapsHref({ ...base, latitude: '-6.91', longitude: '107.61' }, 'directions')!);
  expect(directions.pathname).toBe('/maps/dir/');
  expect(directions.searchParams.get('destination')).toBe('-6.91,107.61');
  expect(venueMapsHref({ ...base, latitude: '91', longitude: '0' })).toBeUndefined();
});
