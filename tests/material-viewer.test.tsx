import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PublicationLesson } from '../shared/program-publication';
import { MaterialViewer } from '../src/components/material/MaterialViewer';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Material preview compatibility with revision snapshots', () => {
  it('explains private PDF authentication failures and retries before mounting the viewer', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ error: { message: 'Unauthorized' } }, { status: 401 }))
      .mockResolvedValueOnce(new Response('%PDF-1.7', { status: 206, headers: { 'content-type': 'application/pdf' } }));
    vi.stubGlobal('fetch', fetch);
    const url = '/api/transcript-file/11111111-1111-4111-8111-111111111111';
    render(<MaterialViewer material={{ type: 'PDF', url, filename: 'Privat' }} />);
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText(/Sesi berakhir/)).toBeDefined();
    expect(screen.queryByTitle('Pratinjau PDF Privat')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Coba muat PDF lagi' }));
    await waitFor(() => expect(screen.getByTitle('Pratinjau PDF Privat')).toBeDefined());
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({ credentials: 'include', headers: { Range: 'bytes=0-7' } }));
  });
  it('previews a video even when its persisted duration is null', () => {
    const material: PublicationLesson['materials'][number] = {
      id: 'video-one', type: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ',
      filename: 'Materi pertemuan', duration: null,
    };
    render(<MaterialViewer material={material} tone="admin" />);
    expect(screen.getByTitle('Materi pertemuan').getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('previews a PDF whose snapshot has no duration', () => {
    const material: PublicationLesson['materials'][number] = {
      id: 'pdf-one', type: 'PDF', url: '/api/transcript-file/document-one/view',
      filename: 'Modul peserta', duration: null, isDownloadable: false,
    };
    render(<MaterialViewer material={material} tone="participant" />);
    expect(screen.getByTitle('Pratinjau PDF Modul peserta').getAttribute('src')).toContain(material.url);
    expect(screen.queryByRole('link', { name: 'Unduh PDF' })).toBeNull();
  });
});
