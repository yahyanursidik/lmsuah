import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminMaterialDialog } from '../src/pages/admin/AdminMaterialDialog';
const fixture = vi.hoisted(() => ({
  result: { id: 'lesson-1', title: 'Pertemuan', updatedAt: '2026-10-18T01:00:00.000Z', materials: [{ id: 'material-1', type: 'PDF', url: 'https://example.test/old.pdf', filename: 'Modul' }] },
  mutate: vi.fn(),
}));
vi.mock('@refinedev/core', () => ({
  useOne: () => ({ result: fixture.result, query: { isLoading: false, isError: false } }),
  useUpdate: () => ({ mutate: fixture.mutate, mutation: { isPending: false } }),
}));
beforeEach(() => { fixture.mutate.mockReset(); fixture.result.updatedAt = '2026-10-18T01:00:00.000Z'; });
it('uses the loaded base revision, not a background refetch revision, when a form is dirty', async () => {
  const props = { lessonId: 'lesson-1', onClose: vi.fn(), onSuccess: vi.fn() };
  const view = render(<AdminMaterialDialog {...props} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'URL *' }), { target: { value: 'https://example.test/edited.pdf' } });
  fixture.result = { ...fixture.result, updatedAt: '2026-10-18T02:00:00.000Z' };
  view.rerender(<AdminMaterialDialog {...props} />);
  fireEvent.submit(screen.getByRole('button', { name: 'Simpan 1 materi' }).closest('form')!);
  await waitFor(() => expect(fixture.mutate).toHaveBeenCalledWith(expect.objectContaining({ values: expect.objectContaining({ expectedUpdatedAt: '2026-10-18T01:00:00.000Z', materials: [expect.objectContaining({ url: 'https://example.test/edited.pdf' })] }) }), expect.any(Object)));
});
