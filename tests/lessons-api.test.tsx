import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Refine, DataProvider, useOne, useList } from '@refinedev/core';
import { LessonDetailPage } from '../src/pages/public/LessonDetailPage';
import { AdminLessonsPage } from '../src/pages/admin/AdminLessonsPage';
import { AdminLessonForm } from '../src/pages/admin/AdminLessonForm';
import { AdminMaterialDialog } from '../src/pages/admin/AdminMaterialDialog';
import { AdminQuizDialog } from '../src/pages/admin/AdminQuizDialog';



// ── Mock Refine hooks ────────────────────────────────────────────────────────
vi.mock('@refinedev/core', async () => {
  const actual = await vi.importActual<typeof import('@refinedev/core')>('@refinedev/core');
  return {
    ...actual,
    useOne: vi.fn(),
    useList: vi.fn(),
    useDelete: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
    useCreate: vi.fn(() => ({ mutate: vi.fn(), mutation: { isPending: false } })),
    useUpdate: vi.fn(() => ({ mutate: vi.fn(), mutation: { isPending: false } })),
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
  materials: [{
    id: 'video-1',
    type: 'youtube',
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '01:45:00',
  }],
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
  materials: [],
  markers: [],
};

const mockLessonWithPdf = {
  ...mockLesson,
  materials: [
    ...mockLesson.materials,
    { id: 'pdf-1', type: 'PDF', url: 'https://example.com/modul.pdf', filename: 'Modul Thaharah' },
  ],
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
    } as never);

    mockedUseList.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: { data: mockSiblings, total: 2 },
    } as never);
  });

  it('renders LessonDetailPage with video player, title, and sequence number', () => {
    render(<TestWrapper path="/lessons/bab-1-pengenalan" element={<LessonDetailPage />} />);

    // title may appear in both h1 and sidebar navigation
    expect(screen.getAllByText(/Bab 1: Pengenalan Kitab Bulughul Maram/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pertemuan #1/i)).toBeDefined();
    expect(screen.getByTitle(/Video YouTube/i)).toBeDefined();
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

  it('membuka PDF langsung di pembaca materi peserta', () => {
    mockedUseOne.mockImplementation(((args: { resource?: string }) => ({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: args.resource === 'settings' ? { id: 'general', allowPdfDownload: true } : mockLessonWithPdf,
    })) as never);

    render(<TestWrapper path="/lessons/bab-1-pengenalan" element={<LessonDetailPage />} />);
    fireEvent.click(screen.getByRole('button', { name: /Semua Materi/i }));
    fireEvent.click(screen.getByRole('button', { name: /Baca di sini/i }));

    expect(screen.getByTitle(/Pratinjau PDF Modul Thaharah/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Perbesar pratinjau PDF/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Unduh PDF/i })).toBeDefined();
  });

  it('renders Fallback "Video Belum Tersedia" when lesson has no video', () => {
    mockedUseOne.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: mockLessonNoVideo,
    } as never);

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
    } as never);
    mockedUseList.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: { data: [], total: 0 },
    } as never);

    render(<TestWrapper path="/lessons/tidak-ada" element={<LessonDetailPage />} />);

    expect(screen.getByText(/Materi Tidak Ditemukan/i)).toBeDefined();
  });

  it('renders AdminLessonsPage with CRUD table and add button', async () => {
    // Provide admin-specific mock for useList (already set in beforeEach as mockSiblings)
    mockedUseList.mockReturnValue({
      data: { data: [mockLesson, mockLessonNoVideo], total: 2 },
      isLoading: false,
      isError: false,
    } as never);

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

  it('memisahkan editor data pertemuan dari materi dan kuis', () => {
    mockedUseOne.mockReturnValue({
      query: { isLoading: false, isError: false, refetch: vi.fn() },
      result: undefined,
    } as never);

    render(
      <MemoryRouter>
        <Refine dataProvider={dummyDataProvider} resources={resourcesConfig}>
          <AdminLessonForm lessonId={null} programId="program-1" onClose={vi.fn()} />
        </Refine>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Tambah pertemuan/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Simpan pertemuan/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Tambah materi/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Tambah soal/i })).toBeNull();
  });

  it('dialog materi menyediakan multi-sumber dalam alur terpisah', () => {
    mockedUseOne.mockReturnValue({ query: { isLoading: false, isError: false, refetch: vi.fn() }, result: { ...mockLesson, materials: [] } } as never);
    render(<MemoryRouter><Refine dataProvider={dummyDataProvider} resources={resourcesConfig}><AdminMaterialDialog lessonId="lesson-1" onClose={vi.fn()} onSuccess={vi.fn()} /></Refine></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /^Tambah materi$/i }));
    expect(screen.getByText('Materi 1')).toBeDefined();
    expect(screen.getByRole('option', { name: /YouTube/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /PDF/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Tambah materi$/i }));
    expect(screen.getByText('Materi 2')).toBeDefined();
  });

  it('dialog kuis menyediakan pengaturan dan bank soal dalam alur terpisah', () => {
    mockedUseOne.mockReturnValue({ query: { isLoading: false, isError: false, refetch: vi.fn() }, result: { ...mockLesson, quiz: null } } as never);
    render(<MemoryRouter><Refine dataProvider={dummyDataProvider} resources={resourcesConfig}><AdminQuizDialog lessonId="lesson-1" onClose={vi.fn()} onSuccess={vi.fn()} /></Refine></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /^Tambah soal$/i }));
    expect(screen.getByText('Soal 1')).toBeDefined();
    expect(screen.getByRole('button', { name: /Tambah opsi/i })).toBeDefined();
  });

});
