import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWrapper } from '../../providers/dataProvider';

interface QuizProps {
  quizId: string;
  historyContext?: boolean;
  initialAttemptId?: string;
}

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
}

interface QuizData {
  id: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  canStartAttempt?: boolean;
  questions: QuizQuestion[];
}

interface QuizAttempt {
  id: string;
  status: 'in_progress' | 'submitted';
  score?: number;
  passed?: boolean;
  reviewAvailable?: boolean;
  reviewMessage?: string;
  review?: Array<{ questionId: string; text: string; explanation?: string; chosenAnswerText: string | null; correctAnswerText: string | null; isCorrect: boolean }>;
}

const errorMessage = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Terjadi kesalahan yang tidak diketahui';

export function QuizComponent({ quizId, historyContext = false, initialAttemptId }: QuizProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const requestVersion = useRef(0);
  const openedInitialResult = useRef('');

  const fetchQuiz = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setError('');
      const res = await fetchWrapper(`/api/quizzes/${quizId}${historyContext ? '?history=1' : ''}`);
      if (!res.ok) throw new Error('Gagal memuat kuis');
      const json = await res.json();
      if (version !== requestVersion.current) return;
      setQuiz(json.data);
      const historyResponse = await fetchWrapper(`/api/quizzes/${quizId}/attempts`).catch(() => null);
      if (version !== requestVersion.current) return;
      if (historyResponse) {
        const historyBody = await historyResponse.json();
        const records: QuizAttempt[] = historyBody.data?.items || [];
        setHistory(records);
        const previous = initialAttemptId ? records.find(item => item.id === initialAttemptId && item.status === 'submitted') : null;
        if (previous && openedInitialResult.current !== previous.id) {
          openedInitialResult.current = previous.id;
          const result = await fetchWrapper(`/api/quizzes/${quizId}/attempts/${previous.id}`);
          const value = await result.json();
          if (version === requestVersion.current) setAttempt(value.data);
          return;
        }
        const active = records.find(item => item.status === 'in_progress');
        if (active) {
          setAttempt(active);
          try { setAnswers(JSON.parse(sessionStorage.getItem(`quiz-answers:${active.id}`) || '{}')); }
          catch { setAnswers({}); }
        }
      }
    } catch (error: unknown) {
      if (version === requestVersion.current) setError(errorMessage(error));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [quizId, historyContext, initialAttemptId]);

  useEffect(() => {
    setQuiz(null); setAttempt(null); setAnswers({}); setHistory([]); setSubmitting(false);
    void fetchQuiz();
    return () => { requestVersion.current += 1; };
  }, [fetchQuiz]);

  const showResult = async (id: string) => {
    const version = requestVersion.current;
    try {
      setError('');
      const response = await fetchWrapper(`/api/quizzes/${quizId}/attempts/${id}`);
      const body = await response.json();
      if (version === requestVersion.current) setAttempt(body.data);
    } catch (cause) { if (version === requestVersion.current) setError(errorMessage(cause)); }
  };

  const handleStartAttempt = async () => {
    if (loading || quiz?.canStartAttempt === false) return;
    const version = requestVersion.current;
    try {
      setLoading(true);
      setError('');
      const res = await fetchWrapper(`/api/quizzes/${quizId}/attempts`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Gagal memulai kuis');
      }
      const json = await res.json();
      if (version !== requestVersion.current) return;
      setAttempt(json.data);
      try { setAnswers(JSON.parse(sessionStorage.getItem(`quiz-answers:${json.data.id}`) || '{}')); }
      catch { setAnswers({}); }
    } catch (error: unknown) {
      if (version === requestVersion.current) setError(errorMessage(error));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!attempt || submitting) return;
    const version = requestVersion.current;

    try {
      setSubmitting(true);
      const payload = {
        answers: Object.entries(answers).map(([questionId, optionId]) => ({
          questionId,
          optionId,
        }))
      };

      setError('');
      const res = await fetchWrapper(`/api/quizzes/${quizId}/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Gagal submit kuis');
      }
      const json = await res.json();
      if (version !== requestVersion.current) return;
      setAttempt(json.data);
      try { sessionStorage.removeItem(`quiz-answers:${attempt.id}`); } catch { /* The server result remains authoritative. */ }
      await showResult(json.data.id);
    } catch (error: unknown) {
      if (version === requestVersion.current) setError(errorMessage(error));
    } finally {
      if (version === requestVersion.current) setSubmitting(false);
    }
  };

  if (loading && !quiz) return <div className="p-8 text-center text-slate-500">Memuat Kuis...</div>;
  if (!quiz) return <div role="alert" className="p-4 text-rose-800">{error || 'Kuis tidak tersedia.'}<button type="button" onClick={fetchQuiz} className="ml-2 min-h-11 underline">Coba lagi</button></div>;

  if (attempt?.status === 'submitted') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Hasil Evaluasi</h3>
        {error && <p role="alert" className="text-rose-800">{error} <button className="min-h-11 font-semibold underline" onClick={() => void showResult(attempt.id)}>Muat ulang hasil</button></p>}
        <div className={`p-4 rounded-xl mb-4 ${attempt.passed ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <div className="text-3xl font-extrabold mb-1">{attempt.score}%</div>
          <p className="font-medium">{attempt.passed ? 'Alhamdulillah, Anda Lulus!' : 'Nilai Anda belum mencapai standar kelulusan.'}</p>
        </div>
        <p className="my-4 text-sm text-slate-600">{attempt.reviewMessage || 'Memuat pembahasan hasil…'}</p>
        {attempt.reviewAvailable && <div className="my-5 space-y-4">{attempt.review?.map((item, index) => <article key={item.questionId} className="rounded-lg border border-stone-200 p-4"><h4 className="font-semibold text-slate-900">{index + 1}. {item.text}</h4><p className={`mt-2 text-sm font-semibold ${item.isCorrect ? 'text-emerald-800' : 'text-rose-800'}`}>{item.isCorrect ? 'Jawaban benar' : 'Jawaban belum tepat'}</p><p className="mt-2 text-sm text-slate-700">Jawaban Anda: {item.chosenAnswerText || 'Tidak dijawab'}</p><p className="mt-1 text-sm text-slate-700">Jawaban benar: {item.correctAnswerText || '—'}</p>{item.explanation && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.explanation}</p>}</article>)}</div>}
        <button onClick={() => { setAttempt(null); void fetchQuiz(); }} className="min-h-11 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200 transition-colors">Tutup Hasil</button>
      </div>
    );
  }

  if (attempt?.status === 'in_progress') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-6">
        {error && <p role="alert" className="text-rose-800">{error} Jawaban Anda tetap tersimpan di formulir ini.</p>}
        <div className="flex justify-between items-center pb-4 border-b border-stone-100">
          <h3 className="text-lg font-bold text-slate-900">{quiz.title}</h3>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">Sedang Mengerjakan</span>
        </div>
        
        <div className="space-y-8">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="space-y-3">
              <p className="font-semibold text-slate-800">{idx + 1}. {q.text}</p>
              <div className="space-y-2 pl-4">
                {q.options.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => { const next = { ...answers, [q.id]: opt.id }; setAnswers(next); try { sessionStorage.setItem(`quiz-answers:${attempt.id}`, JSON.stringify(next)); } catch { /* In-memory answers remain available. */ } }}
                      className="w-4 h-4 text-emerald-600 border-stone-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-stone-100 flex justify-end">
          <button 
            onClick={handleSubmit} 
            disabled={submitting || Object.keys(answers).length < quiz.questions.length}
            className="px-6 py-2.5 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Menyimpan...' : 'Submit Jawaban'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm text-center space-y-4">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">Q</div>
      <h3 className="text-xl font-bold text-slate-900">{quiz.title}</h3>
      <p className="text-slate-600 text-sm max-w-md mx-auto">{quiz.description || 'Evaluasi pemahaman Anda terhadap materi ini.'}</p>
      <div className="flex justify-center gap-4 text-xs font-medium text-slate-500 py-4">
        <span>Passing Score: {quiz.passingScore}%</span>
        <span>Max Attempts: {quiz.maxAttempts}</span>
      </div>
      {quiz.canStartAttempt === false && <p role="status" className="text-sm text-slate-600">Versi ini hanya untuk melanjutkan percobaan yang sudah dimulai atau melihat hasil. Percobaan baru mengikuti versi program saat ini.</p>}
      <button disabled={loading || quiz.canStartAttempt === false} onClick={handleStartAttempt} className="px-8 py-3 bg-emerald-800 text-white rounded-xl font-bold hover:bg-emerald-900 transition-colors disabled:opacity-50">
        {loading ? 'Memuat…' : 'Mulai / Lanjutkan Kuis'}
      </button>
      {error && <p role="alert" className="text-rose-800">{error}</p>}
      {history.some(item => item.status === 'submitted') && <div className="mt-4 border-t border-stone-200 pt-4"><h4 className="text-sm font-semibold">Riwayat percobaan</h4>{history.filter(item => item.status === 'submitted').map(item => <button key={item.id} onClick={() => void showResult(item.id)} className="m-1 min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-semibold">Lihat hasil {item.score ?? '—'}%</button>)}</div>}
    </div>
  );
}
