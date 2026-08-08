/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * Hallmark · genre: modern-minimal · macrostructure: summary-to-next-action workbench · design-system: design.md · designed-as-app
 */
import { useEffect, useMemo, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, BookOpen, CalendarDays, CheckCircle2, Clock3, FileText, Play, RefreshCw, TrendingUp } from 'lucide-react';
import { getProgramProgress, getUserBookmarks, getUserEnrollments, getUserLessonProgress, getUserNotes } from '@/lib/userStore';
import { getLessonsForProgram, useParticipantPortalData } from './useParticipantPortalData';

type Identity = { id: string; name?: string };

export function DashboardPage() {
  const { data: identity } = useGetIdentity<Identity>();
  const userId = identity?.id || 'demo-peserta-1';
  const { programs, lessons, schedules, isLoading, isFallback, refetch } = useParticipantPortalData();
  const [progress, setProgress] = useState(() => getUserLessonProgress(userId));
  const [enrollments, setEnrollments] = useState(() => getUserEnrollments(userId));
  const [notes, setNotes] = useState(() => getUserNotes(userId));
  const [bookmarks, setBookmarks] = useState(() => getUserBookmarks(userId));

  useEffect(() => {
    setProgress(getUserLessonProgress(userId)); setEnrollments(getUserEnrollments(userId)); setNotes(getUserNotes(userId)); setBookmarks(getUserBookmarks(userId));
  }, [userId]);

  const enrolledPrograms = useMemo(() => programs.filter((program) => enrollments.some((item) => item.programId === program.id && item.status === 'active')), [enrollments, programs]);
  const learningPrograms = enrolledPrograms.length > 0 ? enrolledPrograms : programs.slice(0, 2);
  const completedCount = progress.filter((item) => item.isCompleted).length;
  const recentProgress = [...progress].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  const continueLesson = (recentProgress && lessons.find((lesson) => lesson.id === recentProgress.lessonId && !recentProgress.isCompleted)) || learningPrograms.flatMap((program) => getLessonsForProgram(lessons, program.id)).find((lesson) => !progress.some((item) => item.lessonId === lesson.id && item.isCompleted));
  const continueProgram = continueLesson ? programs.find((program) => program.id === continueLesson.programId) : learningPrograms[0];
  const nextSchedule = schedules.find((schedule) => schedule.status !== 'Dibatalkan');

  const stats = [
    { label: 'Kajian diikuti', value: enrolledPrograms.length, suffix: 'program', icon: BookOpen },
    { label: 'Pertemuan selesai', value: completedCount, suffix: 'materi', icon: CheckCircle2 },
    { label: 'Catatan privat', value: notes.length, suffix: 'catatan', icon: FileText },
    { label: 'Tersimpan', value: bookmarks.length, suffix: 'item', icon: Bookmark },
  ];

  return <div className="space-y-6">
    <section className="grid gap-5 rounded-2xl border border-emerald-900 bg-emerald-950 p-5 text-white sm:p-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,.6fr)]">
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Ringkasan belajar</p><h1 className="mt-2 break-words text-xl font-bold tracking-tight sm:text-3xl">Assalamu’alaikum, {identity?.name || 'Peserta Kajian'}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/80">Lanjutkan kajian terakhir, pantau progres, dan buka agenda majelis dari satu ruang belajar.</p><div className="mt-5 flex flex-wrap gap-2">{continueLesson ? <Link to={`/lesson/${continueLesson.id}`} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-500 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-emerald-600"><Play className="h-4 w-4 fill-current" /> Lanjutkan belajar</Link> : <Link to="/belajar" className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-500 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Pilih kajian</Link>}<Link to="/belajar/progres" className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:bg-emerald-800"><TrendingUp className="h-4 w-4" /> Lihat progres</Link></div></div>
      <div className="rounded-xl border border-emerald-800 bg-emerald-900/55 p-4"><p className="text-xs font-bold text-emerald-300">Berikutnya untuk Anda</p>{continueLesson ? <><p className="mt-3 text-sm font-bold leading-5">{continueLesson.title}</p><p className="mt-2 text-xs text-emerald-100/70">{continueProgram?.title || 'Program kajian'} · Pertemuan {continueLesson.sequence}</p>{recentProgress?.lastPositionSeconds ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-200"><Clock3 className="h-3.5 w-3.5" /> Terakhir di menit {Math.floor(recentProgress.lastPositionSeconds / 60)}</p> : null}</> : <><p className="mt-3 text-sm font-bold">Belum ada progres aktif</p><p className="mt-2 text-xs leading-5 text-emerald-100/70">Buka salah satu pertemuan untuk mulai merekam progres belajar.</p></>}</div>
    </section>

    <section aria-label="Statistik belajar" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(({ label, value, suffix, icon: Icon }) => <article key={label} className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500">{label}</p><Icon className="h-4 w-4 text-emerald-800" /></div><p className="mt-3 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-[11px] text-slate-400">{suffix}</p></article>)}</section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Kajian aktif</h2><p className="mt-1 text-xs text-slate-500">Program yang Anda ikuti atau pilihan awal untuk mulai.</p></div><Link to="/belajar" className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">Semua kajian <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        <div className="mt-5 divide-y divide-stone-200">{learningPrograms.map((program) => { const programLessons = getLessonsForProgram(lessons, program.id); const info = getProgramProgress(userId, programLessons); const next = programLessons.find((lesson) => !progress.some((item) => item.lessonId === lesson.id && item.isCompleted)) || programLessons[0]; return <article key={program.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-bold text-slate-950">{program.title}</h3>{enrolledPrograms.some((item) => item.id === program.id) && <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">Diikuti</span>}</div><p className="mt-1 text-xs text-slate-500">{info.completedCount} dari {info.totalCount} pertemuan selesai</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${info.percentage}%` }} /></div></div>{next ? <Link to={`/lesson/${next.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 active:bg-slate-700"><Play className="h-3.5 w-3.5" /> Buka pertemuan</Link> : <Link to={`/programs/${program.slug || program.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-stone-300 px-3 text-xs font-bold text-slate-700 hover:bg-stone-100">Lihat program</Link>}</div></article>; })}{learningPrograms.length === 0 && <div className="py-10 text-center"><p className="text-sm font-semibold text-slate-700">Belum ada program tersedia</p><Link to="/programs" className="mt-3 inline-flex min-h-10 items-center text-xs font-bold text-emerald-800">Jelajahi katalog</Link></div>}</div>
      </section>
      <aside className="space-y-5"><section className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-950">Jadwal terdekat</h2><CalendarDays className="h-4 w-4 text-emerald-800" /></div>{nextSchedule ? <><p className="mt-4 text-sm font-bold leading-5 text-slate-900">{nextSchedule.title}</p><p className="mt-2 text-xs text-slate-500">{nextSchedule.day}, {nextSchedule.date}</p><p className="mt-1 text-xs font-semibold text-emerald-800">{nextSchedule.time || [nextSchedule.startTime, nextSchedule.endTime].filter(Boolean).join(' – ') || 'Waktu menyusul'}</p>{nextSchedule.status && nextSchedule.status !== 'Rutin' && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{nextSchedule.status}: {nextSchedule.statusReason || 'Periksa pembaruan jadwal.'}</p>}</> : <p className="mt-4 text-xs text-slate-500">Belum ada jadwal yang dipublikasikan.</p>}<Link to="/belajar/jadwal" className="mt-4 inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-stone-300 px-3 text-xs font-bold text-slate-700 hover:bg-stone-100">Buka semua jadwal <ArrowRight className="h-3.5 w-3.5" /></Link></section>
        <section className="rounded-2xl border border-stone-200 bg-stone-100 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-950">Sinkronisasi konten</h2><p className="mt-1 text-xs text-slate-500">{isFallback ? 'Menampilkan data fallback ketika API kosong.' : 'Konten mengikuti perubahan terbaru dari admin.'}</p></div><button type="button" onClick={refetch} disabled={isLoading} aria-label="Segarkan konten" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-300 text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 active:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-55"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></button></div></section></aside>
    </div>
  </div>;
}
