import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminCurriculumPage } from '../src/pages/admin/AdminCurriculumPage';

const state = vi.hoisted(() => ({ loading: false, failed: false, detailFailed: false, refetch: vi.fn() }));
vi.mock('@refinedev/core', () => ({
  useList: ({ resource }: { resource: string }) => ({
    result: { data: resource === 'lessons' ? [{ id: 'lesson', title: 'Pertemuan contoh', sequence: 1, status: 'draft', materialCount: 1 }] : [] },
    query: { isLoading: state.loading, isError: state.failed, error: { message: 'Koneksi server terputus.' }, refetch: state.refetch },
  }),
  useOne: () => ({ result: undefined, query: { isLoading: false, isError: state.detailFailed, error: { message: 'Materi belum dapat dihubungi.' }, refetch: state.refetch } }),
  useCreate: () => ({ mutate: vi.fn(), mutation: { isPending: false } }),
  useUpdate: () => ({ mutate: vi.fn(), mutation: { isPending: false } }),
  useDelete: () => ({ mutate: vi.fn(), mutation: { isPending: false } }),
}));
vi.mock('../src/pages/admin/AdminLessonForm', () => ({ AdminLessonForm: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>Batalkan form</button> }));
const mount = () => render(<MemoryRouter initialEntries={['/program/program/curriculum']}><Routes><Route path="/program/:id/curriculum" element={<AdminCurriculumPage />} /></Routes></MemoryRouter>);
afterEach(() => { cleanup(); state.loading = false; state.failed = false; state.detailFailed = false; state.refetch.mockClear(); });

describe('Curriculum loading and errors', () => {
  it('labels the initial loading panel', () => {
    state.loading = true; mount();
    expect(screen.getByRole('status').textContent).toContain('Memuat modul dan pertemuan');
  });
  it('shows the failure and retries both module and meeting data', () => {
    state.failed = true; mount();
    expect(screen.getByRole('alert').textContent).toContain('Koneksi server terputus.');
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(state.refetch).toHaveBeenCalledTimes(2);
  });
  it('does not misrepresent a failed material request as an empty meeting', () => {
    state.detailFailed = true; mount();
    fireEvent.click(screen.getByText('Pertemuan contoh'));
    expect(screen.getByRole('alert').textContent).toContain('Materi belum dapat dihubungi.');
    expect(screen.queryByText('Belum ada materi.')).toBeNull();
  });
  it('does not refetch the whole curriculum when cancelling a meeting form', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Tambah pertemuan', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan form' }));
    expect(state.refetch).not.toHaveBeenCalled();
  });
});
