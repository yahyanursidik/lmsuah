import { useState } from 'react';
import { useList } from '@refinedev/core';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../components/public/UIStates';
import { DataLoading } from '../../components/ui/DataLoading';
import { getErrorMessage } from '../../lib/error-message';

interface Assessment { id: string; quizId: string; title: string; score?: number | null; passed?: boolean | null; submittedAt?: string }
export function ParticipantAssessments({ userId }: { userId: string }) {
  const [history, setHistory] = useState(false);
  const query = useList<Assessment>({ resource: history ? 'quizzes/history' : 'quizzes/active', pagination: { mode: 'off' }, queryOptions: { enabled: Boolean(userId) && !userId.startsWith('demo-'), placeholderData: undefined, staleTime: 0 }, meta: { learningUserId: userId } });
  const demo = userId.startsWith('demo-');
  return <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5" aria-label="Kuis dan hasil evaluasi">
    <header><h2 className="text-lg font-bold text-slate-950">Kuis & hasil evaluasi</h2><p className="mt-1 text-sm leading-6 text-slate-600">Percobaan yang sudah dimulai dapat dilanjutkan meskipun isi program diperbarui. Hasil terdahulu tetap tersimpan.</p>{!demo && userId && <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-emerald-800 underline disabled:opacity-50" disabled={query.query.isFetching} onClick={() => void query.query.refetch()}>{query.query.isFetching ? 'Memperbarui evaluasi…' : 'Perbarui evaluasi'}</button>}</header>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter evaluasi">{[false, true].map(value => <button type="button" key={String(value)} aria-pressed={history === value} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${history === value ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-stone-300 text-slate-700'}`} onClick={() => setHistory(value)}>{value ? 'Hasil sebelumnya' : 'Sedang dikerjakan'}</button>)}</div>
    {demo ? <p className="text-sm text-slate-600">Gunakan akun peserta nyata untuk menyimpan percobaan dan hasil kuis di server.</p> : query.query.isLoading || !userId ? <DataLoading label="Memuat evaluasi Anda…" /> : query.query.isError ? <ErrorAlert message={getErrorMessage(query.query.error, 'Evaluasi belum dapat dimuat.')} onRetry={() => void query.query.refetch()} /> : <ul className="divide-y divide-stone-200">{query.result.data.map(item => <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-bold text-slate-900">{item.title}</h3>{history && <p className="mt-1 text-sm text-slate-600">Nilai {item.score ?? '—'}% · {item.passed ? 'Lulus' : 'Belum lulus'}{item.submittedAt ? ` · ${new Date(item.submittedAt).toLocaleDateString('id-ID')}` : ''}</p>}</div><Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-3 text-sm font-semibold text-emerald-800" to={`/belajar/kuis/${item.quizId}${history ? `?attempt=${item.id}` : ''}`}>{history ? 'Lihat hasil evaluasi' : 'Lanjutkan kuis'}</Link></li>)}{query.result.data.length === 0 && <li className="py-4 text-sm text-slate-600">{history ? 'Belum ada hasil evaluasi tersimpan.' : 'Tidak ada kuis yang sedang dikerjakan.'}</li>}</ul>}
  </section>;
}
