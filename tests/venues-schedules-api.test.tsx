import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Refine, DataProvider } from '@refinedev/core';
import { SchedulesPage } from '../src/pages/public/SchedulesPage';
import { VenueDetailPage } from '../src/pages/public/VenueDetailPage';
import { AdminVenuesPage } from '../src/pages/admin/AdminVenuesPage';
import { AdminSchedulesPage } from '../src/pages/admin/AdminSchedulesPage';

const mockVenues = [
  {
    id: 'masjid-umar-bin-khattab',
    slug: 'masjid-umar-bin-khattab',
    name: 'Masjid Umar bin Khattab',
    address: 'Jl. Selat Karimata No. 12',
    city: 'Kota Bandung',
    district: 'Ujungberung',
    googleMapsUrl: 'https://maps.google.com/?q=-6.9147,107.6890',
    capacity: '1.500 Jamaah',
    phone: '0811-2233-4455',
    status: 'active',
    facilities: ['Ruang Utama Ber-AC', 'Area Akhwat Terpisah'],
  },
];

const mockSchedules = [
  {
    id: 'sch-1',
    venueId: 'masjid-umar-bin-khattab',
    title: 'Kajian Rutin Syarah Bulughul Maram',
    speaker: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Fiqih',
    type: 'Rutin',
    day: 'Sabtu',
    date: '08 Februari 2026',
    startTime: '09:00',
    endTime: '11:30',
    timezone: 'Asia/Jakarta',
    status: 'Diundur',
    statusReason: 'Ustadz berhalangan hadir pada jam 09:00, diundur ke jam 13:00 WIB',
    isLiveStream: true,
    streamUrl: 'https://youtube.com/@TarbiyahSunnah',
    venueName: 'Masjid Umar bin Khattab',
  },
];

const mockDataProvider = {
  getList: vi.fn().mockImplementation((params) => {
    const resName = typeof params?.resource === 'string' ? params.resource : params?.resource?.name || '';
    if (resName === 'venues') {
      return Promise.resolve({ data: mockVenues, total: 1 });
    }
    if (resName === 'schedules') {
      return Promise.resolve({ data: mockSchedules, total: 1 });
    }
    return Promise.resolve({ data: mockSchedules, total: 1 });
  }),
  getOne: vi.fn().mockImplementation((params) => {
    const resName = typeof params?.resource === 'string' ? params.resource : params?.resource?.name || '';
    if (resName === 'venues') {
      return Promise.resolve({ data: mockVenues[0] });
    }
    return Promise.resolve({ data: mockSchedules[0] });
  }),
  create: vi.fn().mockResolvedValue({ data: { id: 'new-id' } }),
  update: vi.fn().mockResolvedValue({ data: { id: 'sch-1', status: 'Dibatalkan' } }),
  deleteOne: vi.fn().mockResolvedValue({ data: { id: 'sch-1' } }),
  getApiUrl: () => '/api',
};

const safeDataProvider = mockDataProvider as unknown as DataProvider;
const resourcesConfig = [{ name: 'schedules' }, { name: 'venues' }, { name: 'programs' }];

describe('Venues & Schedules UI & Features Integration Tests', () => {
  it('renders Public SchedulesPage with Asia/Jakarta timezone and status change indicators', async () => {
    render(
      <MemoryRouter initialEntries={['/schedules']}>
        <Refine dataProvider={safeDataProvider} resources={resourcesConfig}>
          <Routes>
            <Route path="/schedules" element={<SchedulesPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    expect(screen.getByText(/Jadwal Kajian Pekanan/i)).toBeDefined();
    expect(screen.getByText(/Asia\/Jakarta \(WIB\)/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/⏰ DIUNDUR/)).toBeDefined();
      expect(screen.getByText(/Catatan Pengunduran:/)).toBeDefined();
    });
  });

  it('renders VenueDetailPage with Google Maps link, copy address, and share location buttons', async () => {
    render(
      <MemoryRouter initialEntries={['/venues/masjid-umar-bin-khattab']}>
        <Refine dataProvider={safeDataProvider} resources={resourcesConfig}>
          <Routes>
            <Route path="/venues/:id" element={<VenueDetailPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Masjid Umar bin Khattab/i)).toBeDefined();
    });

    expect(screen.getByText(/Salin Alamat/i)).toBeDefined();
    expect(screen.getByText(/Bagikan Lokasi/i)).toBeDefined();
    expect(screen.getByText(/Buka Google Maps ↗/i)).toBeDefined();
  });

  it('renders AdminVenuesPage CRUD interface', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/venues']}>
        <Refine dataProvider={safeDataProvider} resources={resourcesConfig}>
          <Routes>
            <Route path="/admin/venues" element={<AdminVenuesPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    expect(screen.getByText(/Pengelolaan Lokasi Majelis/i)).toBeDefined();
    expect(screen.getAllByText(/Tambah Lokasi Baru/i).length).toBeGreaterThan(0);
  });

  it('renders AdminSchedulesPage with schedule status management', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/schedules']}>
        <Refine dataProvider={safeDataProvider} resources={resourcesConfig}>
          <Routes>
            <Route path="/admin/schedules" element={<AdminSchedulesPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    expect(screen.getByText(/Pengelolaan Jadwal Kajian/i)).toBeDefined();
    expect(screen.getAllByText(/Tambah Jadwal Baru/i).length).toBeGreaterThan(0);
  });
});
