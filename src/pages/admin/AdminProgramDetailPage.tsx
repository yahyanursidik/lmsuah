/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * Hallmark · genre: modern-minimal · macrostructure: Program summary · design-system: design.md · designed-as-app
 */
import { useList, useOne } from '@refinedev/core';
import { ArrowRight, BookOpenCheck, Files, FileQuestion, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

interface ProgramSummary { id: string; title: string; description?: string; status: 'draft' | 'published' | 'archived' }
interface EnrollmentSummary { id: string }
interface LessonSummary { id: string; status: 'draft' | 'published'; materialCount?: number; hasQuiz?: boolean }

export function AdminProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { query: programQuery, result: program } = useOne<ProgramSummary>({ resource: 'programs', id: id || '' });
  const enrollments = useList<EnrollmentSummary>({ resource: 'enrollments', filters: [{ field: 'programId', operator: 'eq', value: id }], pagination: { mode: 'off' } });
  const lessons = useList<LessonSummary>({ resource: 'lessons', filters: [{ field: 'programId', operator: 'eq', value: id }], pagination: { mode: 'off' } });
  const lessonItems = lessons.result.data;
  const isLoading = programQuery.isLoading || enrollments.query.isLoading || lessons.query.isLoading;
  const metrics = [
    { label: 'Pertemuan', value: lessonItems.length, helper: `${lessonItems.filter((item) => item.status === 'published').length} sudah terbit`, icon: BookOpenCheck },
    { label: 'Sumber materi', value: lessonItems.reduce((total, item) => total + (item.materialCount || 0), 0), helper: 'YouTube, PDF, audio, dan lainnya', icon: Files },
    { label: 'Kuis', value: lessonItems.filter((item) => item.hasQuiz).length, helper: 'Terhubung ke pertemuan', icon: FileQuestion },
    { label: 'Peserta', value: enrollments.result.data.length, helper: 'Terdaftar di program', icon: Users },
  ];

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div><h2 className="text-xl font-bold text-slate-900">Ringkasan program</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Lihat kesiapan isi program lalu lanjutkan penyusunan pertemuan, materi, dan evaluasi.</p></div>
        <Link to={`/admin/programs/${id}/curriculum`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-600 px-4 text-sm font-bold text-slate-900 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:bg-emerald-700">Kelola pertemuan <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </section>

      <section aria-label="Ringkasan isi program" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => { const Icon = metric.icon; return <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-100 p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-700">{metric.label}</p><Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" /></div><p className="mt-4 text-3xl font-bold text-slate-900">{metric.value.toLocaleString('id-ID')}</p><p className="mt-1 text-xs leading-5 text-slate-500">{metric.helper}</p></div>; })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6"><h2 className="text-base font-bold text-slate-900">Informasi umum</h2><dl className="mt-5 grid gap-5"><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Judul</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{program?.title}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Deskripsi</dt><dd className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">{program?.description || 'Belum ada deskripsi program.'}</dd></div></dl></section>
    </div>
  );
}
