import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Refine, type DataProvider } from '@refinedev/core';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminSchedulesPage } from '../src/pages/admin/AdminSchedulesPage';
import { TARBIYAH_LIVE_URL, TARBIYAH_STREAMS_URL } from '../shared/schedule-stream';

const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; });

function mount({ fail = false, pending = false, referenceFailure = false, schedule = null }: { fail?: boolean; pending?: boolean; referenceFailure?: boolean; schedule?: Record<string, unknown> | null } = {}) {
  let complete!: () => void;
  const create = vi.fn().mockImplementation(() => {
    if (fail) return Promise.reject({ statusCode: 400, message: 'Lokasi tidak tersedia. Pilih lokasi lain.' });
    if (pending) return new Promise(resolve => { complete = () => resolve({ data: { id: 'new' } }); });
    return Promise.resolve({ data: { id: 'new' } });
  });
  const getList = vi.fn().mockImplementation(({ resource }: { resource: string }) => {
    if (resource === 'venues' && referenceFailure) return Promise.reject({ statusCode: 503, message: 'Lokasi gagal dimuat' });
    const data = resource === 'venues' ? [{ id: '11111111-1111-4111-8111-111111111111', name: 'Masjid' }] : resource === 'schedules' && schedule ? [schedule] : [];
    return Promise.resolve({ data, total: data.length });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const update = vi.fn().mockResolvedValue({ data: { id: 'existing' } });
  const provider = { getList, create, update, getApiUrl: () => '/api' } as unknown as DataProvider;
  render(<MemoryRouter><Refine dataProvider={provider} resources={[{ name: 'schedules' }, { name: 'venues' }, { name: 'programs' }]} options={{ reactQuery: { clientConfig: client } }}><AdminSchedulesPage /></Refine></MemoryRouter>);
  return { create, update, complete: () => complete(), getList };
}

async function openForm() {
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Memuat data…' })).toBeNull());
  fireEvent.click(screen.getAllByRole('button', { name: 'Tambah Jadwal Baru' })[0]);
  fireEvent.change(screen.getByRole('textbox', { name: 'Judul kajian' }), { target: { value: 'Kajian pekanan' } });
  return screen.getByRole('form', { name: 'Formulir jadwal kajian' });
}

describe('Schedule form submit regression', () => {
  it.each(['auto-streams', 'auto-live'])('saves the selected automatic destination %s', async mode => {
    const { create } = mount(); const form = await openForm();
    fireEvent.change(screen.getByRole('combobox', { name: 'Mode tautan siaran' }), { target: { value: mode } });
    const expected = mode === 'auto-live' ? TARBIYAH_LIVE_URL : TARBIYAH_STREAMS_URL;
    expect((screen.getByRole('textbox', { name: 'Tautan siaran' }) as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByRole('link', { name: /Pratinjau tautan/ }).getAttribute('href')).toBe(expected);
    fireEvent.submit(form);
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ streamUrl: expected, isLiveStream: true }) })));
  });

  it('retains a manual URL while switching automatic modes and saves it unchanged', async () => {
    const { create } = mount(); const form = await openForm();
    const mode = screen.getByRole('combobox', { name: 'Mode tautan siaran' });
    fireEvent.change(mode, { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Tautan siaran' }), { target: { value: 'https://www.youtube.com/watch?v=fixture' } });
    fireEvent.change(mode, { target: { value: 'auto-live' } });
    fireEvent.change(mode, { target: { value: 'manual' } });
    expect((screen.getByRole('textbox', { name: 'Tautan siaran' }) as HTMLInputElement).value).toBe('https://www.youtube.com/watch?v=fixture');
    fireEvent.submit(form);
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ streamUrl: 'https://www.youtube.com/watch?v=fixture' }) })));
  });

  it.each(['', 'javascript:alert(1)'])('rejects invalid manual URL %s without silently submitting', async value => {
    const { create } = mount(); const form = await openForm();
    fireEvent.change(screen.getByRole('combobox', { name: 'Mode tautan siaran' }), { target: { value: 'manual' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Tautan siaran' }), { target: { value } });
    fireEvent.submit(form);
    expect((await screen.findByRole('alert')).textContent).toContain('Masukkan tautan siaran');
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['https://youtu.be/fixture', 'https://youtube.com/@tarbiyahSUnnah'])('reopens an existing URL with the correct manual/automatic mode: %s', async streamUrl => {
    const { update } = mount({ schedule: { id: 'existing', venueId: '11111111-1111-4111-8111-111111111111', title: 'Kajian tersimpan', speaker: 'Pengajar', type: 'Rutin', day: 'Senin', date: '2026-10-22', status: 'Rutin', isLiveStream: true, streamUrl } });
    fireEvent.click((await screen.findAllByRole('button', { name: 'Edit Status' }))[0]);
    const manual = streamUrl.includes('youtu.be');
    expect((screen.getByRole('combobox', { name: 'Mode tautan siaran' }) as HTMLSelectElement).value).toBe(manual ? 'manual' : 'auto-streams');
    fireEvent.submit(screen.getByRole('form', { name: 'Formulir jadwal kajian' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ streamUrl: manual ? streamUrl : TARBIYAH_STREAMS_URL }) })));
  });

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
