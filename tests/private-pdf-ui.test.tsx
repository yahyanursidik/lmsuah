import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminTranscriptDialog } from '../src/pages/admin/AdminTranscriptDialog';
vi.mock('@refinedev/core', () => ({
  useOne: () => ({ result: { privatePdf: false, maxPdfBytes: 4194304 }, query: { isLoading: false, isError: false } }),
  useList: () => ({ result: { data: [] }, query: { isLoading: false, isError: false } }),
  useGetIdentity: () => ({ data: { id: 'admin' } }),
  useUpdate: () => ({ mutate: vi.fn(), mutation: { isPending: false } }),
}));
it('explains prepared migration without enabling upload or applying database changes', () => {
  render(<AdminTranscriptDialog lessonId="lesson-1" onClose={vi.fn()} onChanged={vi.fn()} />);
  expect(screen.getByText('Belum diaktifkan pada database ini')).toBeDefined();
  expect(screen.getByText(/Tombol ini tidak menjalankan migrasi/)).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Unggah sebagai draft' })).toBeNull();
});
