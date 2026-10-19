import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuizComponent } from '../src/components/public/QuizComponent';
import { fetchWrapper } from '../src/providers/dataProvider';

vi.mock('../src/providers/dataProvider', () => ({ fetchWrapper: vi.fn() }));
const request = vi.mocked(fetchWrapper);
const quiz = { id: 'quiz-1', title: 'Evaluasi Tauhid', passingScore: 70, maxAttempts: 1, questions: [{ id: 'q1', text: 'Pertanyaan 1', options: [{ id: 'o1', text: 'Opsi A' }, { id: 'o2', text: 'Opsi B' }] }] };
beforeEach(() => { request.mockReset(); sessionStorage.clear(); });

describe('Participant quiz history and explanations', () => {
  it('opens a previous result without creating another attempt', async () => {
    request.mockImplementation(async url => {
      if (String(url).endsWith('/attempts')) return Response.json({ data: { items: [{ id: 'attempt-1', status: 'submitted', score: 80 }] } });
      if (String(url).endsWith('/attempts/attempt-1')) return Response.json({ data: { id: 'attempt-1', status: 'submitted', score: 80, passed: true, reviewAvailable: true, reviewMessage: 'Pembahasan tersedia.', review: [{ questionId: 'q1', text: 'Pertanyaan 1', explanation: 'Penjelasan terverifikasi', chosenAnswerText: 'Opsi A', correctAnswerText: 'Opsi A', isCorrect: true }] } });
      return Response.json({ data: quiz });
    });
    render(<QuizComponent quizId="quiz-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat hasil 80%' }));
    expect(await screen.findByText('Penjelasan terverifikasi')).toBeDefined();
    expect(screen.getByText('Jawaban benar: Opsi A')).toBeDefined();
    expect(request.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true);
  });
  it('shows the retry policy without fabricating a correct answer', async () => {
    request.mockImplementation(async url => {
      if (String(url).endsWith('/attempts')) return Response.json({ data: { items: [{ id: 'a1', status: 'submitted', score: 50 }] } });
      if (String(url).endsWith('/attempts/a1')) return Response.json({ data: { id: 'a1', status: 'submitted', score: 50, passed: false, reviewAvailable: false, review: [], reviewMessage: 'Masih ada kesempatan percobaan. Pembahasan belum tersedia.' } });
      return Response.json({ data: quiz });
    });
    render(<QuizComponent quizId="quiz-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat hasil 50%' }));
    expect(await screen.findByText(/Masih ada kesempatan percobaan/)).toBeDefined();
    expect(screen.queryByText(/Jawaban benar:/)).toBeNull();
  });
  it('resumes an active attempt and restores its local draft answers', async () => {
    sessionStorage.setItem('quiz-answers:active', JSON.stringify({ q1: 'o2' }));
    request.mockImplementation(async url => String(url).endsWith('/attempts') ? Response.json({ data: { items: [{ id: 'active', status: 'in_progress' }] } }) : Response.json({ data: quiz }));
    render(<QuizComponent quizId="quiz-1" />);
    expect(await screen.findByText('Sedang Mengerjakan')).toBeDefined();
    expect((screen.getByRole('radio', { name: 'Opsi B' }) as HTMLInputElement).checked).toBe(true);
    expect(request.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true);
  });
  it('opens a historical result directly and cannot start an obsolete assessment', async () => {
    request.mockImplementation(async url => {
      if (String(url).endsWith('/attempts')) return Response.json({ data: { items: [{ id: 'old-result', status: 'submitted', score: 100 }] } });
      if (String(url).endsWith('/attempts/old-result')) return Response.json({ data: { id: 'old-result', status: 'submitted', score: 100, passed: true, reviewAvailable: false, reviewMessage: 'Kunci belum tersedia.' } });
      return Response.json({ data: { ...quiz, canStartAttempt: false } });
    });
    render(<QuizComponent quizId="quiz-1" historyContext initialAttemptId="old-result" />);
    expect(await screen.findByText('Hasil Evaluasi')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup Hasil' }));
    expect(await screen.findByText(/Versi ini hanya untuk/)).toBeDefined();
    expect((screen.getByRole('button', { name: 'Mulai / Lanjutkan Kuis' }) as HTMLButtonElement).disabled).toBe(true);
    expect(request.mock.calls.some(([url]) => String(url).endsWith('?history=1'))).toBe(true);
    expect(request.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true);
  });
});
