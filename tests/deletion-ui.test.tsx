import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Refine, type DataProvider } from '@refinedev/core';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminProgramsPage } from '../src/pages/admin/AdminProgramsPage';
import { AdminLessonsPage } from '../src/pages/admin/AdminLessonsPage';
import { AdminVenuesPage } from '../src/pages/admin/AdminVenuesPage';
import { AdminAnnouncementsPage } from '../src/pages/admin/AdminAnnouncementsPage';

const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; vi.restoreAllMocks(); });
const error = 'Data masih memiliki 2 riwayat peserta. Arsipkan tanpa menghapus riwayat.';
function mount(page: React.ReactNode, resource = 'programs', fail = true) {
  const row = { id: '11111111-1111-4111-8111-111111111111', slug: 'kajian', title: 'Kajian', name: 'Masjid', address: 'Alamat', city: 'Bandung', sequence: 1, content: 'Informasi', status: resource === 'venues' ? 'active' : 'draft', updatedAt: '2026-10-24T00:00:00.000Z' };
  const remove = vi.fn().mockImplementation(() => fail ? Promise.reject({ statusCode: 409, message: error }) : Promise.resolve({ data: row }));
  const update = vi.fn().mockResolvedValue({ data: { ...row, status: 'archived' } });
  const getList = vi.fn().mockResolvedValue({ data: [row], total: 1 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); clients.push(client);
  const provider = { getList, deleteOne: remove, update, getOne: async () => ({ data: { id: 'general', programRevisions: false } }), getApiUrl: () => '/api' } as unknown as DataProvider;
  render(<MemoryRouter><Refine dataProvider={provider} resources={[{ name: resource }, { name: 'program-capabilities' }]} options={{ reactQuery: { clientConfig: client } }}>{page}</Refine></MemoryRouter>);
  return { remove, update, getList, row };
}
describe('Delete feedback and safe recovery', () => {
  it('keeps the program confirmation open with an actionable server error and can archive instead', async () => {
    const { remove, update } = mount(<AdminProgramsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus Kajian' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus permanen' }));
    const dialog = screen.getByRole('alertdialog');
    expect((await within(dialog).findByRole('alert')).textContent).toBe(error);
    expect(remove).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Arsipkan' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ resource: 'programs', variables: { status: 'archived', expectedUpdatedAt: '2026-10-24T00:00:00.000Z' } }));
    expect(screen.getByRole('status').textContent).toContain('riwayat peserta tetap disimpan');
  });
  it('closes the program dialog and refreshes after successful deletion', async () => {
    const { getList } = mount(<AdminProgramsPage />, 'programs', false);
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus Kajian' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus permanen' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('status').textContent).toContain('berhasil dihapus');
    await waitFor(() => expect(getList.mock.calls.length).toBeGreaterThan(1));
  });
  it.each([
    ['lessons', <AdminLessonsPage />], ['venues', <AdminVenuesPage />], ['announcements', <AdminAnnouncementsPage />],
  ] as const)('shows deletion failures visibly on %s', async (resource, page) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { remove } = mount(page, resource);
    await screen.findAllByText(resource === 'venues' ? 'Masjid' : 'Kajian');
    fireEvent.click(screen.getAllByRole('button', { name: resource === 'venues' ? 'Hapus Masjid' : 'Hapus Kajian' })[0]!);
    expect((await screen.findByRole('alert')).textContent).toBe(error);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
