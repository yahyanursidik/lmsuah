import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ParticipantAssessments } from '../src/pages/participant/ParticipantAssessments';

const state = vi.hoisted(() => ({ failed: false, retry: vi.fn() }));
vi.mock('@refinedev/core', () => ({ useList: ({ resource }: { resource: string }) => ({ result: { data: [{ id: resource === 'quizzes/history' ? 'result-1' : 'active-1', quizId: 'old-quiz', title: 'Evaluasi versi terdahulu', score: 80, passed: true }] }, query: { isLoading: false, isError: state.failed, error: { message: 'Koneksi evaluasi terputus' }, refetch: state.retry } }) }));
beforeEach(() => { cleanup(); state.failed = false; state.retry.mockClear(); });
describe('Participant assessment navigation', () => {
  it('links active assessments independently of the current lesson revision', () => {
    render(<MemoryRouter><ParticipantAssessments userId="participant" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Lanjutkan kuis' }).getAttribute('href')).toBe('/belajar/kuis/old-quiz');
    fireEvent.click(screen.getByRole('button', { name: 'Hasil sebelumnya' }));
    expect(screen.getByRole('link', { name: 'Lihat hasil evaluasi' }).getAttribute('href')).toBe('/belajar/kuis/old-quiz?attempt=result-1');
    expect(screen.getByText('Nilai 80% · Lulus')).toBeDefined();
  });
  it('distinguishes a server error from an empty history', () => {
    state.failed = true;
    render(<MemoryRouter><ParticipantAssessments userId="participant" /></MemoryRouter>);
    expect(screen.getByRole('alert').textContent).toContain('Koneksi evaluasi terputus');
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(state.retry).toHaveBeenCalledOnce();
  });
});
