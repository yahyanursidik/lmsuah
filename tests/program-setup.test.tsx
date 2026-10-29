import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { programReadiness } from '../shared/program-readiness';
import { parseMarkerLines } from '../shared/lesson-markers';
import { AdminProgramSetupPage } from '../src/pages/admin/AdminProgramSetupPage';

const fixtures = vi.hoisted(() => ({
  program: { id: 'program-1', title: 'Kajian Tauhid', slug: 'kajian-tauhid', description: 'Belajar bertahap', status: 'draft' },
  lessons: [{ id: 'lesson-1', title: 'Pertemuan 1', status: 'published', materialCount: 1, hasQuiz: false }],
  update: vi.fn(),
  refetch: vi.fn(),
  isFetching: false,
}));
vi.mock('@refinedev/core', async importOriginal => ({
  ...await importOriginal<typeof import('@refinedev/core')>(),
  useOne: () => ({ result: fixtures.program, query: { isLoading: false, isError: false, refetch: vi.fn() } }),
  useList: () => ({ result: { data: fixtures.lessons }, query: { isLoading: false, isError: false, isFetching: fixtures.isFetching, refetch: fixtures.refetch } }),
  usePermissions: () => ({ data: 'publisher' }),
  useUpdate: () => ({ mutate: fixtures.update, mutation: { isPending: false } }),
}));
const renderSetup = (step = 'review') => render(<MemoryRouter initialEntries={[`/admin/programs/program-1/setup?step=${step}`]}><Routes><Route path="/admin/programs/:id/setup" element={<AdminProgramSetupPage />} /></Routes></MemoryRouter>);
beforeEach(() => { fixtures.update.mockReset(); fixtures.refetch.mockReset(); fixtures.isFetching = false; fixtures.lessons[0]!.materialCount = 1; });

describe('Program setup and readiness', () => {
  it('does not mark an empty program ready', () => {
    expect(programReadiness({ title: 'Kajian' }, []).every(check => check.ready)).toBe(false);
  });
  it('requires materials on every published meeting, not on drafts', () => {
    const info = { title: 'Kajian', description: 'Deskripsi' };
    expect(programReadiness(info, [{ status: 'published', materialCount: 0 }]).every(check => check.ready)).toBe(false);
    expect(programReadiness(info, [{ status: 'published', materialCount: 1 }, { status: 'draft' }]).every(check => check.ready)).toBe(true);
  });
  it('exposes named steps and optional evaluation without requiring a quiz', () => {
    renderSetup();
    expect(screen.getByRole('list', { name: 'Langkah persiapan' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Evaluasi & jadwal/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Terbitkan program$/i }).hasAttribute('disabled')).toBe(false);
  });
  it('prevents publication when a published meeting has no materials', () => {
    fixtures.lessons[0]!.materialCount = 0;
    renderSetup();
    expect(screen.getByRole('button', { name: /^Terbitkan program$/i }).hasAttribute('disabled')).toBe(true);
  });
  it('information step saves a partial payload rather than publishing implicitly', () => {
    renderSetup('information');
    fireEvent.change(screen.getByLabelText('Kategori program (opsional)'), { target: { value: 'Tauhid' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Simpan & lanjutkan' }).closest('form')!);
    expect(fixtures.update).toHaveBeenCalledWith(expect.objectContaining({ resource: 'programs', values: expect.not.objectContaining({ status: 'published' }) }), expect.any(Object));
    expect(fixtures.update).toHaveBeenCalledWith(expect.objectContaining({ values: expect.objectContaining({ category: 'Tauhid' }) }), expect.any(Object));
  });
  it('refreshes the checklist when review opens and supports a manual recheck', () => {
    renderSetup();
    expect(fixtures.refetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Periksa ulang kesiapan' }));
    expect(fixtures.refetch).toHaveBeenCalledTimes(2);
  });
  it('prevents publishing stale checks while the latest meetings are being fetched', () => {
    fixtures.isFetching = true;
    renderSetup();
    expect(screen.getByText('Memeriksa kesiapan terbaru…')).toBeDefined();
    expect(screen.getByRole('button', { name: /^Terbitkan program$/i }).hasAttribute('disabled')).toBe(true);
  });
  it('refreshes readiness after a server rejects publication', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: /^Terbitkan program$/i }));
    const callbacks = fixtures.update.mock.calls[0]![1];
    act(() => callbacks.onError({ message: 'Program belum siap' }));
    expect(fixtures.refetch).toHaveBeenCalledTimes(2);
  });
  it('parses video markers and rejects invalid timestamps', () => {
    expect(parseMarkerLines('05:20 | Pembahasan\n00:00 | Pembukaan')).toEqual([{ timestamp: 0, title: 'Pembukaan' }, { timestamp: 320, title: 'Pembahasan' }]);
    expect(() => parseMarkerLines('12:99 | Salah')).toThrow();
  });
});
