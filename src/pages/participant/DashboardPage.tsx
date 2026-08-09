import { useEffect, useMemo, useState } from 'react';
import { useGetIdentity, useList } from '@refinedev/core';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, BookOpen, CalendarDays, CheckCircle2, Clock3, FileText, Play, RefreshCw, TrendingUp, Megaphone, Link as LinkIcon } from 'lucide-react';
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

  const { query: announcementsQuery, result: announcementsResult } = useList({
    resource: 'announcements',
    filters: [
      { field: 'status', operator: 'eq', value: 'published' }
    ],
    sorters: [
      { field: 'createdAt', order: 'desc' }
    ],
    pagination: { pageSize: 5 },
  });
  const announcements = announcementsResult?.data || [];
  const announcementsLoading = announcementsQuery?.isLoading;

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
    { label: 'Kajian diikuti', value: enrolledPrograms.length, suffix: 'program', icon: BookOpen, href: '/belajar' },
    { label: 'Pertemuan selesai', value: completedCount, suffix: 'materi', icon: CheckCircle2, href: '/belajar/progres' },
    { label: 'Catatan privat', value: notes.length, suffix: 'catatan', icon: FileText, href: '/tersimpan' },
    { label: 'Tersimpan', value: bookmarks.length, suffix: 'item', icon: Bookmark, href: '/tersimpan' },
  ];

  return <div className="space-y-8 pb-10">
    <section className="grid gap-5 rounded-3xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-6 text-white shadow-xl sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.6fr)] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>
      <div className="min-w-0 relative z-10 flex flex-col justify-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Ringkasan Belajar</p>
        <h1 className="mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-4xl">Assalamu’alaikum, {identity?.name || 'Peserta'}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-100/90">Lanjutkan kajian terakhir, pantau progres belajar, dan persiapkan diri untuk majelis berikutnya langsung dari ruang belajar Anda.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {continueLesson ? 
            <Link to={`/belajar/lesson/${continueLesson.id}`} className="group inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-emerald-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95">
              <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" /> Lanjutkan Belajar
            </Link> 
          : 
            <Link to="/belajar" className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-emerald-500 px-5 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95">Pilih Kajian</Link>
          }
          <Link to="/belajar/progres" className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-emerald-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95">
            <TrendingUp className="h-4 w-4" /> Lihat Progres
          </Link>
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-400/20 bg-white/10 p-5 backdrop-blur-md relative z-10 flex flex-col justify-center shadow-inner">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">Berikutnya untuk Anda</p>
        {continueLesson ? <>
          <p className="mt-3 text-base font-bold leading-tight text-white drop-shadow-sm">{continueLesson.title}</p>
          <p className="mt-2 text-xs font-medium text-emerald-100/80">{continueProgram?.title || 'Program kajian'} <span className="mx-1">•</span> Pertemuan {continueLesson.sequence}</p>
          {recentProgress?.lastPositionSeconds ? 
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/50 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              <Clock3 className="h-3.5 w-3.5" /> Terakhir di menit {Math.floor(recentProgress.lastPositionSeconds / 60)}
            </p> 
          : null}
        </> : <>
          <p className="mt-4 text-sm font-bold text-white">Belum ada progres aktif</p>
          <p className="mt-2 text-xs leading-relaxed text-emerald-100/80">Buka salah satu pertemuan untuk mulai merekam progres belajar Anda secara otomatis.</p>
        </>}
      </div>
    </section>

    {!announcementsLoading && announcements.length > 0 && (
      <section className="rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
        <div className="p-5 border-b border-amber-100/50 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <div className="relative flex h-5 w-5 items-center justify-center">
              <Megaphone className="h-5 w-5 text-amber-600 relative z-10 animate-[bounce_2s_infinite]" />
              <div className="absolute inset-0 bg-amber-400 opacity-30 rounded-full blur-md animate-pulse"></div>
            </div>
            Papan Pengumuman
          </h2>
        </div>
        <div className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((item: any) => (
            <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100/60 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight pr-6">{item.title}</h3>
              {item.imageUrl && (
                <div className="mt-3 mb-3 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                  <img src={item.imageUrl} alt={item.title} className="w-full object-cover max-h-48 group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-2 mb-4">{item.content}</p>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                <p className="text-[10px] font-medium text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {item.linkUrl && (
                  <a href={item.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                    <LinkIcon size={12} /> Buka Tautan
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    )}

    <section aria-label="Statistik belajar" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, suffix, icon: Icon, href }) => 
        <Link key={label} to={href} className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-stone-50 transition-colors group-hover:bg-emerald-50"></div>
          <div className="relative flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500 transition-colors group-hover:text-slate-700">{label}</p>
            <Icon className="h-4 w-4 text-emerald-700 transition-transform group-hover:scale-110 group-hover:text-emerald-600" />
          </div>
          <p className="relative mt-4 text-3xl font-extrabold text-slate-900">{value}</p>
          <p className="relative mt-1 text-[11px] font-medium text-slate-400">{suffix}</p>
        </Link>
      )}
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,.5fr)]">
      <section className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-6 sm:flex-row sm:items-center sm:justify-between bg-stone-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-700"/> Kajian Aktif</h2>
            <p className="mt-1 text-xs text-slate-500">Program yang sedang Anda pelajari.</p>
          </div>
          <Link to="/belajar" className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-4 text-xs font-bold text-emerald-800 shadow-sm border border-stone-200 hover:bg-emerald-50 hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 transition-colors">
            Semua Kajian <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex-1 divide-y divide-stone-100 p-2">
          {learningPrograms.map((program) => { 
            const programLessons = getLessonsForProgram(lessons, program.id); 
            const info = getProgramProgress(userId, programLessons); 
            const next = programLessons.find((lesson) => !progress.some((item) => item.lessonId === lesson.id && item.isCompleted)) || programLessons[0]; 
            return (
              <article key={program.id} className="group p-4 hover:bg-stone-50 transition-colors rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-stone-200 border border-stone-200 hidden sm:block">
                  <img src={program.coverImage || '/placeholder.svg'} alt="" className="h-full w-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" onError={(e) => e.currentTarget.src = 'data:image/svg+xml;utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23f5f5f4\'/%3E%3C/svg%3E'} />
                </div>
                <div className="min-w-0 flex-1 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="break-words text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">{program.title}</h3>
                      {enrolledPrograms.some((item) => item.id === program.id) && <span className="mt-1 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Diikuti</span>}
                    </div>
                    {next ? 
                      <Link to={`/belajar/lesson/${next.id}`} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3 text-[11px] font-bold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 transition-transform hover:scale-105 active:scale-95">
                        <Play className="h-3 w-3" /> Lanjutkan
                      </Link> 
                    : 
                      <Link to={`/belajar/katalog/${program.slug || program.id}`} className="inline-flex min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-stone-300 px-3 text-[11px] font-bold text-slate-700 hover:bg-stone-100 transition-transform hover:scale-105 active:scale-95">
                        Lihat Program
                      </Link>
                    }
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                      <span>Progres Belajar</span>
                      <span>{info.completedCount} / {info.totalCount} Selesai</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200/50">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out" style={{ width: `${info.percentage}%` }} />
                    </div>
                  </div>
                </div>
              </article>
            ); 
          })}
          {learningPrograms.length === 0 && <div className="py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 mb-4"><BookOpen className="h-5 w-5 text-stone-400" /></div>
            <p className="text-sm font-semibold text-slate-700">Belum ada program diikuti</p>
            <Link to="/belajar/katalog" className="mt-3 inline-flex min-h-10 items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"><ArrowRight className="h-3 w-3"/> Jelajahi katalog kajian</Link>
          </div>}
        </div>
      </section>

      <aside className="space-y-6">


        <section className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-stone-50/50 p-5 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-700" /> Jadwal Terdekat</h2>
          </div>
          <div className="p-5">
            {nextSchedule ? 
              <div className="group relative rounded-2xl border border-stone-200 bg-white p-4 hover:border-emerald-200 hover:shadow-md transition-all">
                <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-md">{nextSchedule.day}</div>
                <p className="text-xl font-extrabold text-slate-900">{nextSchedule.date.split(',')[0]}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">{nextSchedule.time || [nextSchedule.startTime, nextSchedule.endTime].filter(Boolean).join(' – ') || 'Waktu menyusul'}</p>
                <p className="mt-3 text-sm font-bold leading-tight text-slate-900 group-hover:text-emerald-800 transition-colors">{nextSchedule.title}</p>
                {nextSchedule.status && nextSchedule.status !== 'Rutin' && 
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 border border-amber-100">
                    <span className="font-bold">{nextSchedule.status}:</span> {nextSchedule.statusReason || 'Periksa pembaruan jadwal.'}
                  </p>
                }
                <Link to={`/belajar/lokasi/${nextSchedule.venueId || ''}`} className="mt-4 block rounded-xl bg-stone-100 px-3 py-2 text-center text-[11px] font-bold text-slate-700 hover:bg-stone-200 transition-colors">
                  Lihat Detail Lokasi
                </Link>
              </div> 
            : 
              <div className="py-8 text-center text-slate-500">
                <CalendarDays className="mx-auto h-8 w-8 text-stone-300 mb-3 opacity-50" />
                <p className="text-xs">Belum ada jadwal yang dipublikasikan.</p>
              </div>
            }
            <Link to="/belajar/jadwal" className="mt-4 flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-stone-300 px-4 text-xs font-bold text-slate-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 transition-colors">
              Buka Semua Jadwal
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-stone-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sinkronisasi Konten</h2>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed max-w-[200px]">{isFallback ? 'Menampilkan data fallback ketika API kosong.' : 'Konten mengikuti perubahan terbaru dari admin secara real-time.'}</p>
            </div>
            <button type="button" onClick={refetch} disabled={isLoading} aria-label="Segarkan konten" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-stone-300 text-slate-600 shadow-sm hover:bg-stone-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            </button>
          </div>
        </section>
      </aside>
    </div>
  </div>;
}
