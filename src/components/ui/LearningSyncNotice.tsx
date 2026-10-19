export function LearningSyncNotice({ loading, error, refresh, hasLocalBackup, exportBackup }: { loading: boolean; error: string; refresh: () => Promise<void>; hasLocalBackup?: boolean; exportBackup?: () => void }) {
  if (error) return <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error} <button type="button" onClick={() => void refresh()} className="ml-2 min-h-11 font-bold underline">Coba lagi</button></div>;
  if (loading) return <p role="status" className="text-sm text-slate-600">Menyinkronkan pendaftaran dan progres…</p>;
  if (hasLocalBackup) return <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Data lama perangkat dicadangkan, belum dimigrasikan ke server. <button type="button" onClick={exportBackup} className="min-h-11 font-semibold underline">Unduh cadangan</button></p>;
  return null;
}
