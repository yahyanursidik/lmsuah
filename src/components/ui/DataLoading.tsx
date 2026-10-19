import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

export function DataLoading({ label = 'Memuat data…', compact = false }: { label?: string; compact?: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8_000);
    return () => clearTimeout(timer);
  }, []);
  return <div role="status" aria-live="polite" className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 ${compact ? 'px-4 py-3' : 'min-h-40 justify-center p-6'}`}>
    <LoaderCircle aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" />
    <div><p>{label}</p>{slow && <p className="mt-1 text-xs">Koneksi membutuhkan waktu lebih lama. Mohon tunggu; pesan akan tampil jika pemuatan gagal.</p>}</div>
  </div>;
}
