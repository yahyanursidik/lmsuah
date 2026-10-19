import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminProgramReferencesPage } from '../src/pages/admin/AdminProgramReferencesPage';
const fixture = vi.hoisted(() => ({
  book: { id: 'book-1', title: 'Kitab Rujukan', slug: 'kitab-rujukan', author: 'Penulis', description: 'Deskripsi kitab bersama yang harus dipertahankan', status: 'draft', updatedAt: '2026-10-18T01:00:00.000Z' },
  create: vi.fn(), update: vi.fn(),
}));
vi.mock('@refinedev/core', () => ({
  useList: ({ resource }: { resource: string }) => ({ result: { data: resource === 'books' ? [fixture.book] : [{ id: 'series-1', title: 'Seri Pertama', slug: 'seri-pertama', sequence: 1, status: 'draft', books: [{ id: 'book-1', title: 'Kitab Rujukan', slug: 'kitab-rujukan', status: 'draft' }] }] }, query: { isLoading: false, isError: false, refetch: vi.fn() } }),
  usePermissions: () => ({ data: 'publisher' }),
  useCreate: () => ({ mutate: fixture.create, mutation: { isPending: false } }),
  useUpdate: () => ({ mutate: fixture.update, mutation: { isPending: false } }),
}));
const show = () => render(<MemoryRouter initialEntries={['/admin/programs/program-1/references']}><Routes><Route path="/admin/programs/:id/references" element={<AdminProgramReferencesPage />} /></Routes></MemoryRouter>);
beforeEach(() => { fixture.create.mockReset(); fixture.update.mockReset(); });
describe('Program references workspace', () => {
  it('shows series and allows editing book relationships atomically', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Edit seri' }));
    const dialog = within(screen.getByRole('dialog'));
    expect((dialog.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(dialog.getByRole('checkbox'));
    fireEvent.submit(dialog.getByRole('button', { name: 'Simpan rujukan' }).closest('form')!);
    expect(fixture.update).toHaveBeenCalledWith(expect.objectContaining({ resource: 'series', id: 'series-1', values: expect.objectContaining({ programId: 'program-1', bookIds: [] }) }), expect.any(Object));
  });
  it('loads full shared book data rather than overwriting omitted fields from a series DTO', () => {
    show(); fireEvent.click(screen.getByRole('button', { name: 'Edit kitab' }));
    const dialog = within(screen.getByRole('dialog'));
    expect((dialog.getByRole('textbox', { name: 'Deskripsi' }) as HTMLTextAreaElement).value).toBe(fixture.book.description);
    fireEvent.submit(dialog.getByRole('button', { name: 'Simpan rujukan' }).closest('form')!);
    expect(fixture.update).toHaveBeenCalledWith(expect.objectContaining({ resource: 'books', values: expect.objectContaining({ description: fixture.book.description, expectedUpdatedAt: fixture.book.updatedAt }) }), expect.any(Object));
  });
});
