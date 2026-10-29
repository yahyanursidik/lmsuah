import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../src/pages/public/HomePage';
import { ProgramsPage } from '../src/pages/public/ProgramsPage';
import { AdminProgramsPage } from '../src/pages/admin/AdminProgramsPage';
import { programCategoryLabel, programCategoryOptions } from '../shared/program-category';

const state = vi.hoisted(() => ({
  programs: [
    { id: 'tauhid', slug: 'tauhid', title: 'Fawaid Tauhid', description: 'Belajar tauhid', category: 'Tauhid' as string | null, status: 'draft' },
    { id: 'tafsir', slug: 'tafsir', title: 'Kajian Tafsir', description: 'Belajar tafsir', category: 'Tafsir', status: 'published' },
    { id: 'none', slug: 'none', title: 'Program tanpa kategori', description: 'Deskripsi', category: null, status: 'draft' },
  ], create: vi.fn(), update: vi.fn(),
}));
vi.mock('@refinedev/core', () => ({
  useList: ({ resource }: { resource: string }) => ({ result: { data: resource === 'programs' ? state.programs : [] }, query: { isFetched: true, isLoading: false, isError: false, refetch: vi.fn() } }),
  useOne: () => ({ result: { programRevisions: false }, query: { isLoading: false, isError: false } }),
  useCreate: () => ({ mutate: state.create, mutation: { isPending: false } }),
  useUpdate: () => ({ mutate: state.update, mutation: { isPending: false } }),
  useDelete: () => ({ mutate: vi.fn(), mutation: { isPending: false } }),
}));
vi.mock('../src/components/public/KnowledgeJourney', () => ({ KnowledgeJourney: () => null }));
beforeEach(() => { cleanup(); state.create.mockReset(); state.update.mockReset(); });
const show = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('Program categories across public and admin views', () => {
  it('uses a neutral label instead of assigning Fiqih on the homepage', () => {
    show(<HomePage />);
    expect(screen.getByText('Tauhid')).toBeDefined();
    expect(screen.getByText('Kajian')).toBeDefined();
    expect(screen.queryByText('Fiqih')).toBeNull();
  });
  it('builds filters from actual categories, including Tafsir and uncategorized programs', () => {
    show(<ProgramsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Tafsir' }));
    expect(screen.getByText('Kajian Tafsir')).toBeDefined();
    expect(screen.queryByText('Fawaid Tauhid')).toBeNull();
    expect(screen.getByRole('button', { name: 'Tafsir' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Kajian' }));
    expect(screen.getByText('Program tanpa kategori')).toBeDefined();
    expect(screen.queryByText('Kajian Tafsir')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Semua' }));
    expect(screen.getByText('Fawaid Tauhid')).toBeDefined();
  });
  it('filters admin programs by category and resets filters', () => {
    show(<AdminProgramsPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter kategori program' }), { target: { value: 'Tauhid' } });
    expect(screen.getByText('Fawaid Tauhid')).toBeDefined();
    expect(screen.queryByText('Kajian Tafsir')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(screen.getByText('Kajian Tafsir')).toBeDefined();
  });
  it('creates a draft with an explicitly selected custom category', () => {
    show(<AdminProgramsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Tambah program' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByRole('textbox', { name: /Judul program/ }), { target: { value: 'Bahasa Arab Dasar' } });
    fireEvent.change(dialog.getByLabelText('Kategori program (opsional)'), { target: { value: 'Bahasa Arab' } });
    fireEvent.submit(dialog.getByRole('button', { name: 'Buat program' }).closest('form')!);
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ values: expect.objectContaining({ category: 'Bahasa Arab', status: 'draft' }) }), expect.any(Object));
  });
  it('loads existing categories and allows explicitly clearing them', () => {
    show(<AdminProgramsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Fawaid Tauhid' }));
    const dialog = within(screen.getByRole('dialog'));
    const input = dialog.getByLabelText('Kategori program (opsional)') as HTMLInputElement;
    expect(input.value).toBe('Tauhid'); expect(input.maxLength).toBe(100);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(dialog.getByRole('button', { name: 'Simpan perubahan' }).closest('form')!);
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'tauhid', values: expect.objectContaining({ category: '' }) }), expect.any(Object));
  });
  it('normalizes display whitespace and deduplicates category options without guessing subjects', () => {
    expect(programCategoryLabel(null)).toBe('Kajian');
    expect(programCategoryLabel('   ')).toBe('Kajian');
    expect(programCategoryOptions([{ category: 'Tauhid' }, { category: ' Tauhid ' }, {}])).toEqual(['Kajian', 'Tauhid']);
  });
});
