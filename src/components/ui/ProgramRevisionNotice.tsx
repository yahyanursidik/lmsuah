import { Link } from 'react-router-dom';

export function ProgramRevisionNotice({ programId }: { programId: string }) {
  return <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
    <h2 className="text-lg font-bold">Penyuntingan melalui Review & Revisi</h2>
    <p className="text-sm leading-6">Informasi, modul, pertemuan, materi, dan kuis kini disusun dalam satu draft versi. Versi publik tetap tersedia sampai reviewer independen menyetujui dan publisher menerbitkan perubahan.</p>
    <Link className="inline-flex min-h-11 items-center rounded-lg border border-emerald-400 bg-white px-4 text-sm font-semibold" to={`/admin/programs/${programId}/revisions`}>Buka Review & Revisi</Link>
  </section>;
}
