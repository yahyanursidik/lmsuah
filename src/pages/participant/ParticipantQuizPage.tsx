import { Link, useParams, useSearchParams } from 'react-router-dom';
import { QuizComponent } from '../../components/public/QuizComponent';

export function ParticipantQuizPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  return <div className="space-y-5">
    <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline" to="/belajar/progres">Kembali ke progres & evaluasi</Link>
    <header><h1 className="text-2xl font-bold text-slate-950">Evaluasi belajar</h1><p className="mt-2 text-sm leading-6 text-slate-600">Lanjutkan kuis atau lihat hasil percobaan Anda. Versi penilaian lama tetap terpisah dari revisi program terbaru.</p></header>
    <QuizComponent key={`${id}:${params.get('attempt') || ''}`} quizId={id} historyContext initialAttemptId={params.get('attempt') || undefined} />
  </div>;
}
