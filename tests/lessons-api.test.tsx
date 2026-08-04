import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Refine, DataProvider, useOne, useList } from '@refinedev/core';
import { LessonDetailPage } from '../src/pages/public/LessonDetailPage';
import { AdminLessonsPage } from '../src/pages/admin/AdminLessonsPage';



// ── Mock Refine hooks ────────────────────────────────────────────────────────
vi.mock('@refinedev/core', async () => {
  const actual = await vi.importActual<typeof import('@refinedev/core')>('@refinedev/core');
  return {
    ...actual,
    useOne: vi.fn(),
    useList: vi.fn(),
    useDelete: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
    useCreate: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
    useUpdate: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  };
});

// ── Test Data ────────────────────────────────────────────────────────────────
const mockLesson = {
  id: 'lesson-1',
  title: 'Bab 1: Pengenalan Kitab Bulughul Maram',
  slug: 'bab-1-pengenalan',
  sequence: 1,
  date: '2026-01-10',
  description: 'Pembahasan pembukaan kitab dan biografi pengarang.',
  status: 'published',
  programId: 'program-1',
  video: {
    id: 'video-1',
    youtubeId: 'dQw4w9WgXcQ',
    duration: '01:45:00',
    status: 'active',
  },
  markers: [
    { id: 'mark-1', timestamp: 0, title: 'Pembukaan & Doa', description: 'Muqaddimah kajian' },
    { id: 'mark-2', timestamp: 305, title: 'Biografi Ibn Hajar', description: 'Riwayat hidup pengarang' },
    { id: 'mark-3', timestamp: 1820, title: 'Metode Penulisan Kitab', description: 'Sistematika hadits hukum' },
  ],
  attachments: [],
};

const mockLessonNoVideo = {
  ...mockLesson,
  id: 'lesson-2',
  title: 'Bab 2: Bab Thaharah',
  slug: 'bab-2-thaharah',
  sequence: 2,
  video: null,
  markers: [],
};

const mockSiblings = [mockLesson, mockLessonNoVideo];

// ── Dummy DataProvider (required by Refine wrapper) ──────────────────────────
const dummyDataProvider = {
  getList: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getOne: vi.fn().mockResolvedValue({ data: {} }),
  create: vi.fn().mockResolvedValue({ data: {} }),
  update: vi.fn().mockResolvedValue({ data: {} }),
  deleteOne: vi.fn().mockResolvedValue({ data: {} }),
  getApiUrl: () => '/api',
} as unknown as DataProvider;

const resourcesConfig = [{ name: 'lessons' }, { name: 'programs' }];

const mockedUseOne = vi.mocked(useOne);
const mockedUseList = vi.mocked(useList);

// ── Wrapper Component ────────────────────────────────────────────────────────
function TestWrapper({ path, element }: { path: string; element: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Refine dataProvider={dummyDataProvider} resources={resourcesConfig}>
        <Routes>
          <Route path={path.replace(/\/[^/]+$/, '/:id')} element={element} />
        </Routes>
      </Refine>
    </MemoryRouter>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Lessons Feature Integration Tests', () => {

  beforeEach(() => {
    // Default: useOne returns lesson with video & markers, useList returns siblings
    mockedUseOne.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: mockLesson,
    } as any);

    mockedUseList.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: { data: mockSiblings, total: 2 },
    } as any);
  });

  it('renders LessonDetailPage with video player, title, and sequence number', () => {
    render(<TestWrapper path="/lessons/bab-1-pengenalan" element={<LessonDetailPage />} />);

    // title may appear in both h1 and sidebar navigation
    expect(screen.getAllByText(/Bab 1: Pengenalan Kitab Bulughul Maram/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pertemuan #1/i)).toBeDefined();
    expect(screen.getByTitle(/Bab 1: Pengenalan Kitab Bulughul Maram/i)).toBeDefined();
  });

  it('renders clickable timestamp markers (daftar isi video)', () => {
    render(<TestWrapper path="/lessons/bab-1-pengenalan" element={<LessonDetailPage />} />);

    // Markers rendered (desktop sidebar)
    expect(screen.getAllByText(/Pembukaan & Doa/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Biografi Ibn Hajar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Metode Penulisan Kitab/i).length).toBeGreaterThan(0);
    // Timestamps in 0:00, 5:05, 30:20 format
    expect(screen.getAllByText('0:00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5:05').length).toBeGreaterThan(0);
  });

  it('renders Fallback "Video Belum Tersedia" when lesson has no video', () => {
    mockedUseOne.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: mockLessonNoVideo,
    } as any);

    render(<TestWrapper path="/lessons/bab-2-thaharah" element={<LessonDetailPage />} />);

    expect(screen.getByText(/Video Belum Tersedia/i)).toBeDefined();
    // Player should NOT render
    expect(screen.queryByTitle(/Bab 2: Bab Thaharah/i)).toBeNull();
  });

  it('shows prev/next lesson navigation', () => {
    render(<TestWrapper path="/lessons/bab-1-pengenalan" element={<LessonDetailPage />} />);

    // lesson-1 is first, so "Berikutnya" (next) should appear
    expect(screen.getByText(/Berikutnya/i)).toBeDefined();
    // lesson-1 is first, so "Sebelumnya" should NOT have a lesson
    // (there's a div placeholder but no "Sebelumnya" text when there's no prev)
  });

  it('shows "Materi Tidak Ditemukan" when lesson is not found', () => {
    mockedUseOne.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: undefined,
    } as any);
    mockedUseList.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: { data: [], total: 0 },
    } as any);

    render(<TestWrapper path="/lessons/tidak-ada" element={<LessonDetailPage />} />);

    expect(screen.getByText(/Materi Tidak Ditemukan/i)).toBeDefined();
  });

  it('renders AdminLessonsPage with CRUD table and add button', async () => {
    // Provide admin-specific mock for useList (already set in beforeEach as mockSiblings)
    mockedUseList.mockReturnValue({
      data: { data: [mockLesson, mockLessonNoVideo], total: 2 } as any,
      isLoading: false,
      isError: false,
    } as any);

    const dummyProvider = {
      getList: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      getOne: vi.fn().mockResolvedValue({ data: {} }),
      create: vi.fn().mockResolvedValue({ data: {} }),
      update: vi.fn().mockResolvedValue({ data: {} }),
      deleteOne: vi.fn().mockResolvedValue({ data: {} }),
      getApiUrl: () => '/api',
    } as unknown as DataProvider;

    render(
      <MemoryRouter initialEntries={['/admin/lessons']}>
        <Refine dataProvider={dummyProvider} resources={resourcesConfig}>
          <Routes>
            <Route path="/admin/lessons" element={<AdminLessonsPage />} />
          </Routes>
        </Refine>
      </MemoryRouter>
    );

    expect(screen.getByText(/Pengelolaan Materi \(Lessons\)/i)).toBeDefined();
    expect(screen.getAllByText(/Tambah Materi Baru/i).length).toBeGreaterThan(0);
  });

});
