import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Refine, DataProvider } from '@refinedev/core';
import { ProgramsPage } from '../src/pages/public/ProgramsPage';
import { ProgramDetailPage } from '../src/pages/public/ProgramDetailPage';
import { AdminProgramsPage } from '../src/pages/admin/AdminProgramsPage';

const mockDataProvider = {
  getList: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'bulughul-maram',
        slug: 'bulughul-maram',
        title: 'Syarah Bulughul Maram',
        description: 'Pembahasan Fiqih Ibadah & Muamalah.',
        category: 'Fiqih',
        status: 'published',
        bookTitle: 'Bulughul Maram',
        routineSchedule: 'Sabtu Pekan Ke-1',
        coverImage: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53',
        lessons: [
          { id: 'l1', meetingNumber: 1, date: '01 Jan 2026', title: 'Bab Thaharah', summary: 'Pengenalan Kitab', duration: '90 Menit' }
        ]
      }
    ],
    total: 1,
  }),
  getOne: vi.fn().mockResolvedValue({
    data: {
      id: 'bulughul-maram',
      slug: 'bulughul-maram',
      title: 'Syarah Bulughul Maram',
      description: 'Pembahasan Fiqih Ibadah & Muamalah.',
      category: 'Fiqih',
      status: 'published',
      bookTitle: 'Bulughul Maram',
      routineSchedule: 'Sabtu Pekan Ke-1',
      coverImage: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53',
      lessons: [
        { id: 'l1', meetingNumber: 1, date: '01 Jan 2026', title: 'Bab Thaharah', summary: 'Pengenalan Kitab', duration: '90 Menit' }
      ]
    },
  }),
  create: vi.fn().mockResolvedValue({ data: { id: 'prog-2', title: 'Program Baru' } }),
  update: vi.fn().mockResolvedValue({ data: { id: 'bulughul-maram', status: 'published' } }),
  deleteOne: vi.fn().mockResolvedValue({ data: { id: 'bulughul-maram' } }),
  getApiUrl: () => '/api',
};

const safeDataProvider = mockDataProvider as unknown as DataProvider;

describe('Public Portal & Admin Integration UI Tests', () => {
  it('renders Public ProgramsPage correctly with list of programs', async () => {
    render(
      <MemoryRouter initialEntries={['/programs']}>
        <Refine dataProvider={safeDataProvider}>
          <Routes>
            <Route path="/programs" element={<ProgramsPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    expect(screen.getByText(/Program Kajian Kitab/i)).toBeDefined();
    expect(await screen.findByText(/Syarah Bulughul Maram/i)).toBeDefined();
  });

  it('renders ProgramDetailPage with curriculum and lessons', async () => {
    render(
      <MemoryRouter initialEntries={['/programs/bulughul-maram']}>
        <Refine dataProvider={safeDataProvider}>
          <Routes>
            <Route path="/programs/:id" element={<ProgramDetailPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Syarah Bulughul Maram/i)).toBeDefined();
    expect(screen.getByText(/Bab Thaharah/i)).toBeDefined();
  });

  it('renders AdminProgramsPage CRUD management interface', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/programs']}>
        <Refine dataProvider={safeDataProvider}>
          <Routes>
            <Route path="/admin/programs" element={<AdminProgramsPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    expect(screen.getByText(/Pengelolaan Program Kajian/i)).toBeDefined();
    expect(screen.getAllByText(/Tambah program/i).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Syarah Bulughul Maram/i)).toBeDefined();
    expect(screen.getByText(/Sudah terbit/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Kelola program/i })).toBeDefined();
  });

  it('filters admin programs and can reset an empty result', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/programs']}>
        <Refine dataProvider={safeDataProvider}>
          <Routes>
            <Route path="/admin/programs" element={<AdminProgramsPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Syarah Bulughul Maram/i)).toBeDefined();
    fireEvent.change(screen.getByRole('searchbox', { name: /Cari program/i }), {
      target: { value: 'tidak-ada' },
    });
    expect(screen.getByText(/Program tidak ditemukan/i)).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: /Reset filter/i })[0]);
    expect(screen.getByText(/Syarah Bulughul Maram/i)).toBeDefined();
  });
});
