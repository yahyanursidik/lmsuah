import { useCallback, useEffect, useState } from 'react';

interface QuizProps {
  quizId: string;
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
  questions: QuizQuestion[];
}

interface QuizAttempt {
  id: string;
  status: 'in_progress' | 'submitted';
  score?: number;
  passed?: boolean;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui';

export function QuizComponent({ quizId }: QuizProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchQuiz = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quizzes/${quizId}`);
      if (!res.ok) throw new Error('Gagal memuat kuis');
      const json = await res.json();
      setQuiz(json.data);
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleStartAttempt = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quizzes/${quizId}/attempts`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Gagal memulai kuis');
      }
      const json = await res.json();
      setAttempt(json.data);
      setAnswers({});
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!attempt) return;

    try {
      setSubmitting(true);
      const payload = {
        answers: Object.entries(answers).map(([questionId, optionId]) => ({
          questionId,
          optionId,
        }))
      };

      const res = await fetch(`/api/quizzes/${quizId}/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Gagal submit kuis');
      }
      const json = await res.json();
      setAttempt(json.data);
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !quiz) return <div className="p-8 text-center text-slate-500">Memuat Kuis...</div>;
  if (error) return <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>;
  if (!quiz) return null;

  if (attempt?.status === 'submitted') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Hasil Evaluasi</h3>
        <div className={`p-4 rounded-xl mb-4 ${attempt.passed ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <div className="text-3xl font-extrabold mb-1">{attempt.score}%</div>
          <p className="font-medium">{attempt.passed ? 'Alhamdulillah, Anda Lulus!' : 'Nilai Anda belum mencapai standar kelulusan.'}</p>
        </div>
        <button onClick={() => setAttempt(null)} className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200 transition-colors">Tutup Hasil</button>
      </div>
    );
  }

  if (attempt?.status === 'in_progress') {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-6">
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
                      onChange={() => setAnswers({ ...answers, [q.id]: opt.id })}
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
      <button onClick={handleStartAttempt} className="px-8 py-3 bg-emerald-800 text-white rounded-xl font-bold hover:bg-emerald-900 transition-colors">
        Mulai Kuis
      </button>
    </div>
  );
}
