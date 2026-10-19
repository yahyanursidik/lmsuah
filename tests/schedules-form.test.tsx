import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Refine, type DataProvider } from '@refinedev/core';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminSchedulesPage } from '../src/pages/admin/AdminSchedulesPage';

const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; });

function mount({ fail = false, pending = false, referenceFailure = false } = {}) {
  let complete!: () => void;
  const create = vi.fn().mockImplementation(() => {
    if (fail) return Promise.reject({ statusCode: 400, message: 'Lokasi tidak tersedia. Pilih lokasi lain.' });
    if (pending) return new Promise(resolve => { complete = () => resolve({ data: { id: 'new' } }); });
    return Promise.resolve({ data: { id: 'new' } });
  });
  const getList = vi.fn().mockImplementation(({ resource }: { resource: string }) => {
    if (resource === 'venues' && referenceFailure) return Promise.reject({ statusCode: 503, message: 'Lokasi gagal dimuat' });
    return Promise.resolve({ data: resource === 'venues' ? [{ id: '11111111-1111-4111-8111-111111111111', name: 'Masjid' }] : [], total: resource === 'venues' ? 1 : 0 });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const provider = { getList, create, getApiUrl: () => '/api' } as unknown as DataProvider;
  render(<MemoryRouter><Refine dataProvider={provider} resources={[{ name: 'schedules' }, { name: 'venues' }, { name: 'programs' }]} options={{ reactQuery: { clientConfig: client } }}><AdminSchedulesPage /></Refine></MemoryRouter>);
  return { create, complete: () => complete(), getList };
}

async function openForm() {
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Memuat data…' })).toBeNull());
  fireEvent.click(screen.getAllByRole('button', { name: 'Tambah Jadwal Baru' })[0]);
  fireEvent.change(screen.getByRole('textbox', { name: 'Judul kajian' }), { target: { value: 'Kajian pekanan' } });
  return screen.getByRole('form', { name: 'Formulir jadwal kajian' });
}

describe('Schedule form submit regression', () => {
  it('submits an agenda with programId null and shows success', async () => {
    const { create, getList } = mount();
    fireEvent.submit(await openForm());
    await screen.findByText('Jadwal kajian berhasil dibuat.');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ title: 'Kajian pekanan', programId: null }) }));
    expect(screen.queryByRole('form')).toBeNull();
    await waitFor(() => expect(getList.mock.calls.filter(([params]) => params.resource === 'schedules')).toHaveLength(2));
  });

  it('shows the server error and preserves the form for correction', async () => {
    mount({ fail: true });
    fireEvent.submit(await openForm());
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Lokasi tidak tersedia. Pilih lokasi lain.');
    expect((screen.getByRole('textbox', { name: 'Judul kajian' }) as HTMLInputElement).value).toBe('Kajian pekanan');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Buat Jadwal' }) as HTMLButtonElement).disabled).toBe(false));
  });

  it('blocks duplicate submits and shows pending feedback', async () => {
    const state = mount({ pending: true });
    const form = await openForm();
    fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(state.create).toHaveBeenCalledOnce());
    expect((await screen.findByRole('button', { name: 'Menyimpan...' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => state.complete());
    await screen.findByText('Jadwal kajian berhasil dibuat.');
  });

  it('does not silently submit when dropdown data failed to load', async () => {
    const { create } = mount({ referenceFailure: true });
    await openForm();
    expect(await screen.findByText(/Pilihan lokasi atau program gagal dimuat/)).toBeDefined();
    expect((screen.getByRole('button', { name: 'Buat Jadwal' }) as HTMLButtonElement).disabled).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });
});
