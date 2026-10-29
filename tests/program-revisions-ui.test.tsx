import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminProgramRevisionsPage } from '../src/pages/admin/AdminProgramRevisionsPage';
import { clearRevisionDraftCache } from '../src/lib/revision-draft-cache';

const fixture = vi.hoisted(() => ({
  enabled: true, user: 'author', status: 'draft', hash: 'a'.repeat(64),
  title: 'Program tersimpan', fetch: vi.fn(), refetch: vi.fn(), invalidate: vi.fn(),
  serverSnapshot: { schemaVersion: 1, program: { id: 'program-1', title: 'Program tersimpan', slug: 'program-1', description: 'Deskripsi' }, chapters: [], series: [], lessons: [] },
}));
vi.mock('@refinedev/core', () => {
  let cached: Record<string, unknown> | null = null;
  return {
  useOne: ({ resource }: { resource: string }) => {
    if (!cached || cached.contentHash !== fixture.hash || cached.status !== fixture.status || cached.snapshot !== fixture.serverSnapshot) cached = {
      id: 'revision-1', programId: 'program-1', version: 1, status: fixture.status, contentHash: fixture.hash,
      snapshot: fixture.serverSnapshot, submittedBy: 'author', changeNote: 'Isi awal', isCurrentPublication: false,
      events: [{ id: 'event-1', actorId: 'author', actorName: 'Penulis', action: 'create', note: 'Buat draft', createdAt: '2026-10-19' }],
    };
    return { result: resource === 'program-capabilities' ? {
    programRevisions: fixture.enabled, programRevisionsReason: 'MIGRATION_REQUIRED', canEditPrograms: true,
    canEditLessons: true, canCreateLessons: true, canReviewPrograms: true, canReviewLessons: true, canPublishPrograms: true, canPublishLessons: true,
    } : cached, query: { isLoading: false, isError: false, refetch: fixture.refetch } };
  },
  useList: ({ resource }: { resource: string }) => ({ result: { data: resource === 'program-revisions' ? [{ id: 'revision-1', version: 1, status: fixture.status, changeNote: 'Isi awal' }] : [] }, query: { isLoading: false, isError: false, refetch: fixture.refetch } }),
  useGetIdentity: () => ({ data: { id: fixture.user } }), useInvalidate: () => fixture.invalidate,
}; });
vi.mock('../src/providers/dataProvider', () => ({ fetchWrapper: fixture.fetch }));
const show = () => <MemoryRouter initialEntries={['/admin/programs/program-1/revisions?revision=revision-1']}><Routes><Route path="/admin/programs/:id/revisions" element={<AdminProgramRevisionsPage />} /></Routes></MemoryRouter>;
beforeEach(() => {
  cleanup(); clearRevisionDraftCache(); fixture.enabled = true; fixture.user = 'author'; fixture.status = 'draft'; fixture.hash = 'a'.repeat(64);
  fixture.serverSnapshot = { schemaVersion: 1, program: { id: 'program-1', title: 'Program tersimpan', slug: 'program-1', description: 'Deskripsi' }, chapters: [], series: [], lessons: [] };
  fixture.fetch.mockReset(); fixture.refetch.mockReset(); fixture.invalidate.mockReset();
});

describe('Review and revision workspace', () => {
  it('explains migration readiness instead of showing nonworking editor actions', () => {
    fixture.enabled = false; render(show());
    expect(screen.getByText('Migrasi database revisi belum lengkap')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Buat draft revisi' })).toBeNull();
    expect(fixture.fetch).not.toHaveBeenCalled();
  });
  it('preserves dirty content during background refresh and shows a safe conflict', async () => {
    const view = render(show());
    const input = await screen.findByRole('textbox', { name: 'Judul program *' });
    fireEvent.change(input, { target: { value: 'Judul belum disimpan' } });
    fixture.hash = 'b'.repeat(64);
    fixture.serverSnapshot = { ...fixture.serverSnapshot, program: { ...fixture.serverSnapshot.program, title: 'Judul dari editor lain' } };
    view.rerender(show());
    expect((screen.getByRole('textbox', { name: 'Judul program *' }) as HTMLInputElement).value).toBe('Judul belum disimpan');
    expect(screen.getByText(/Draft server berubah sejak/)).toBeDefined();
    expect((screen.getByRole('button', { name: 'Simpan draft revisi' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('retains the draft and displays actionable server errors when saving fails', async () => {
    fixture.fetch.mockRejectedValue({ message: 'Koneksi gagal; draft belum tersimpan.' });
    render(show());
    fireEvent.change(await screen.findByRole('textbox', { name: 'Judul program *' }), { target: { value: 'Isi lokal yang aman' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan draft revisi' }));
    await waitFor(() => expect(screen.getByText('Koneksi gagal; draft belum tersimpan.')).toBeDefined());
    expect((screen.getByRole('textbox', { name: 'Judul program *' }) as HTMLInputElement).value).toBe('Isi lokal yang aman');
    expect(JSON.parse(fixture.fetch.mock.calls[0]![1].body)).toMatchObject({ action: 'save', expectedHash: 'a'.repeat(64), snapshot: { program: { title: 'Isi lokal yang aman' } } });
  });
  it('saves category changes in the revision snapshot, not through a direct program update', async () => {
    fixture.fetch.mockRejectedValue({ message: 'Server belum tersedia' });
    render(show());
    fireEvent.change(await screen.findByLabelText('Kategori program (opsional)'), { target: { value: 'Tauhid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan draft revisi' }));
    await waitFor(() => expect(fixture.fetch).toHaveBeenCalledOnce());
    expect(fixture.fetch.mock.calls[0]![0]).toBe('/api/program-revisions/revision-1');
    expect(JSON.parse(fixture.fetch.mock.calls[0]![1].body)).toMatchObject({ action: 'save', snapshot: { program: { category: 'Tauhid' } } });
  });
  it('does not carry a private unsaved draft into another signed-in account', async () => {
    const view = render(show());
    fireEvent.change(await screen.findByRole('textbox', { name: 'Judul program *' }), { target: { value: 'Draft privat penulis' } });
    fixture.user = 'reviewer'; view.rerender(show());
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Judul program *' }) as HTMLInputElement).value).toBe('Program tersimpan'));
  });
  it('prevents author approval, while an independent reviewer can approve with a note', async () => {
    fixture.status = 'submitted'; const view = render(show());
    fireEvent.change(await screen.findByRole('textbox', { name: 'Catatan tindakan' }), { target: { value: 'Isi telah diperiksa' } });
    expect((screen.getByRole('button', { name: 'Setujui snapshot' }) as HTMLButtonElement).disabled).toBe(true);
    view.unmount(); clearRevisionDraftCache(); fixture.user = 'reviewer';
    fixture.fetch.mockResolvedValue(Response.json({ data: { status: 'approved' } }));
    render(show());
    fireEvent.change(await screen.findByRole('textbox', { name: 'Catatan tindakan' }), { target: { value: 'Review independen selesai' } });
    fireEvent.click(screen.getByRole('button', { name: 'Setujui snapshot' }));
    await waitFor(() => expect(fixture.fetch).toHaveBeenCalledOnce());
    expect(JSON.parse(fixture.fetch.mock.calls[0]![1].body)).toMatchObject({ action: 'approve', note: 'Review independen selesai' });
  });
});
