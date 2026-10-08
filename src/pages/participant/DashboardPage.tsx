/* Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V4
 * genre: modern-minimal · macrostructure: Guided Learning Workbench · design-system: design.md · designed-as-app */
import { useEffect, useMemo, useState } from 'react';
import { useGetIdentity, useList } from '@refinedev/core';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, BookOpen, CalendarDays, CheckCircle2, CircleAlert, Clock3, FileText, MapPin, Play, RefreshCw } from 'lucide-react';
import { getProgramProgress, getUserBookmarks, getUserEnrollments, getUserLessonProgress, getUserNotes } from '@/lib/userStore';
import { PortalPanel, PortalSkeleton } from '@/components/ui/PortalNavigation';
import { getLessonsForProgram, useParticipantPortalData } from './useParticipantPortalData';

type Identity = { id: string; name?: string };
type Announcement = { id: string; title: string; content: string; linkUrl?: string; createdAt?: string };
const shortcuts = [
  { title: 'Katalog kajian', detail: 'Temukan program untuk dipelajari', href: '/belajar/katalog', icon: BookOpen },
  { title: 'Jadwal majelis', detail: 'Siapkan waktu untuk hadir', href: '/belajar/jadwal', icon: CalendarDays },
  { title: 'Lokasi majelis', detail: 'Alamat dan petunjuk tempat', href: '/belajar/lokasi', icon: MapPin },
  { title: 'Catatan belajar', detail: 'Buka catatan dan materi tersimpan', href: '/tersimpan', icon: Bookmark },
];

export function DashboardPage() {
  const { data: identity } = useGetIdentity<Identity>();
  const userId = identity?.id || '';
  const { programs, lessons, schedules, isProgramsLoading, isLessonsLoading, isSchedulesLoading, isRefreshing, isError, programsError, lessonsError, schedulesError, refetch } = useParticipantPortalData();
  const [progress, setProgress] = useState(() => getUserLessonProgress(userId));
  const [enrollments, setEnrollments] = useState(() => getUserEnrollments(userId));
  const [notes, setNotes] = useState(() => getUserNotes(userId));
  const [bookmarks, setBookmarks] = useState(() => getUserBookmarks(userId));
  const { query: announcementsQuery, result: announcementsResult } = useList<Announcement>({
    resource: 'announcements', filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    sorters: [{ field: 'createdAt', order: 'desc' }], pagination: { pageSize: 5 }, queryOptions: { staleTime: 30_000, retry: 1 },
  });
  useEffect(() => {
    setProgress(getUserLessonProgress(userId)); setEnrollments(getUserEnrollments(userId));
    setNotes(getUserNotes(userId)); setBookmarks(getUserBookmarks(userId));
  }, [userId]);
  const enrolledPrograms = useMemo(() => programs.filter(program => enrollments.some(item => item.programId === program.id && item.status === 'active')), [enrollments, programs]);
  const learningPrograms = enrolledPrograms.length > 0 ? enrolledPrograms : programs.slice(0, 2);
  const recentProgress = [...progress].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  const continueLesson = (recentProgress && lessons.find(lesson => lesson.id === recentProgress.lessonId && !recentProgress.isCompleted))
    || learningPrograms.flatMap(program => getLessonsForProgram(lessons, program.id)).find(lesson => !progress.some(item => item.lessonId === lesson.id && item.isCompleted));
  const continueProgram = continueLesson ? programs.find(program => program.id === continueLesson.programId) : undefined;
  const savedPosition = progress.find(item => item.lessonId === continueLesson?.id)?.lastPositionSeconds;
  const nextSchedule = schedules.find(schedule => schedule.status !== 'Dibatalkan');
  const announcements = announcementsResult.data || [];
  const contentLoading = isProgramsLoading || isLessonsLoading;
  const refreshing = isRefreshing || announcementsQuery.isFetching;
  const refresh = () => { void refetch(); void announcementsQuery.refetch(); };
  const stats = [
    { label: 'Kajian diikuti', value: enrolledPrograms.length, suffix: 'program', icon: BookOpen, href: '/belajar', unavailable: programsError },
    { label: 'Pertemuan selesai', value: progress.filter(item => item.isCompleted).length, suffix: 'pertemuan', icon: CheckCircle2, href: '/belajar/progres' },
    { label: 'Catatan privat', value: notes.length, suffix: 'catatan', icon: FileText, href: '/tersimpan' },
    { label: 'Tersimpan', value: bookmarks.length, suffix: 'item', icon: Bookmark, href: '/tersimpan' },
  ];
  return <div className="portal-dashboard">
    <section className="portal-welcome">
      <h1>Assalamu’alaikum, {identity?.name || 'Peserta'}</h1>
      <p>Senang Anda kembali. Lanjutkan belajar atau pilih kajian yang ingin Anda ikuti.</p>
      <div className="portal-actions">
        {continueLesson ? <Link className="portal-button portal-button--primary" to={'/belajar/lesson/' + continueLesson.id}><Play size={16} aria-hidden="true" />Lanjutkan belajar</Link> : <Link className="portal-button portal-button--primary" to="/belajar/katalog"><BookOpen size={16} aria-hidden="true" />Pilih kajian</Link>}
        <Link className="portal-button" to="/belajar/progres">Lihat progres</Link>
        <button type="button" className="portal-button" onClick={refresh} disabled={refreshing} aria-busy={refreshing}><RefreshCw size={16} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />{refreshing ? 'Memuat…' : 'Segarkan'}</button>
      </div>
    </section>
    {isError && <div role="alert" className="portal-feedback portal-feedback--error"><CircleAlert size={20} aria-hidden="true" /><div><strong>Sebagian konten belum dapat dimuat.</strong><p>Data yang sudah tersedia tetap dapat dibuka. Gunakan Segarkan untuk mencoba lagi.</p></div></div>}
    <section aria-label="Statistik belajar" className="portal-metrics">{stats.map(({ label, value, suffix, icon: Icon, href, unavailable }) => <Link key={label} to={href} className="portal-metric"><div className="portal-metric-title"><span>{label}</span><Icon size={18} aria-hidden="true" /></div><strong>{!identity || (label === 'Kajian diikuti' && isProgramsLoading) || unavailable ? '—' : value}</strong><small>{unavailable ? 'Belum dapat dimuat' : suffix}</small></Link>)}</section>
    <div className="portal-main-grid">
      <div className="portal-side-stack">
        <PortalPanel title="Lanjutkan dari sini" description="Pertemuan berikutnya untuk perjalanan belajar Anda.">
          {contentLoading ? <PortalSkeleton label="Memuat pertemuan…" /> : continueLesson ? <div>
            <h3 className="font-semibold text-base">{continueLesson.title}</h3><p className="portal-muted mt-2">{continueProgram?.title || 'Program kajian'} · Pertemuan {continueLesson.sequence}</p>
            {Boolean(savedPosition) && <p className="portal-muted mt-3 flex gap-2 items-center"><Clock3 size={16} aria-hidden="true" />Terakhir di menit {Math.floor((savedPosition || 0) / 60)}</p>}
            <Link to={'/belajar/lesson/' + continueLesson.id} className="portal-button mt-4">Buka pertemuan <ArrowRight size={16} aria-hidden="true" /></Link>
          </div> : <div className="portal-empty"><BookOpen size={24} aria-hidden="true" /><strong>{lessonsError ? 'Pertemuan belum dapat dimuat' : 'Siap memulai kajian?'}</strong><p>{lessonsError ? 'Coba muat ulang melalui tombol Segarkan.' : 'Pilih program dari katalog untuk melihat pertemuan dan materi yang tersedia.'}</p><Link to="/belajar/katalog" className="portal-button">Jelajahi katalog</Link></div>}
        </PortalPanel>
        <PortalPanel title={enrolledPrograms.length > 0 ? 'Kajian aktif' : 'Pilihan kajian'} description={enrolledPrograms.length > 0 ? 'Program yang sedang Anda ikuti.' : 'Program tersedia. Buka detail untuk mulai belajar.'} action={<Link to="/belajar" className="portal-button">Semua kajian</Link>}>
          {contentLoading ? <PortalSkeleton label="Memuat program kajian…" /> : learningPrograms.length > 0 ? <div className="portal-list">{learningPrograms.map(program => {
            const programLessons = getLessonsForProgram(lessons, program.id);
            const info = getProgramProgress(userId, programLessons);
            const next = programLessons.find(lesson => !progress.some(item => item.lessonId === lesson.id && item.isCompleted)) || programLessons[0];
            return <article key={program.id} className="portal-list-item"><div><h3>{program.title}</h3><p className="portal-muted">{info.completedCount}/{info.totalCount} pertemuan selesai</p><progress className="portal-progress" max={100} value={info.percentage} aria-label={'Progres ' + program.title} /></div><Link to={next ? '/belajar/lesson/' + next.id : '/belajar/katalog/' + (program.slug || program.id)} className="portal-button">{next ? 'Lanjutkan' : 'Lihat program'}<ArrowRight size={16} aria-hidden="true" /></Link></article>;
          })}</div> : <div className="portal-empty"><BookOpen size={24} aria-hidden="true" /><strong>{programsError ? 'Program belum dapat dimuat' : 'Belum ada kajian tersedia'}</strong><p>{programsError ? 'Periksa koneksi dan coba Segarkan.' : 'Program yang dipublikasikan admin akan muncul di sini.'}</p><Link to="/belajar/katalog" className="portal-button">Buka katalog</Link></div>}
        </PortalPanel>
        <PortalPanel title="Papan pengumuman" description="Informasi terbaru dari pengelola kajian.">
          {announcementsQuery.isLoading ? <PortalSkeleton label="Memuat pengumuman…" /> : announcementsQuery.isError ? <div className="portal-feedback portal-feedback--error" role="alert">Pengumuman belum dapat dimuat. Coba tombol Segarkan.</div> : announcements.length ? <div className="portal-list">{announcements.map(item => <article className="portal-list-item" key={item.id}><div><h3>{item.title}</h3><p className="portal-muted whitespace-pre-line">{item.content}</p>{item.createdAt && <p className="portal-muted">{new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}</p>}{item.linkUrl && <a href={item.linkUrl} target="_blank" rel="noreferrer" className="portal-button mt-3">Buka tautan <ArrowRight size={16} aria-hidden="true" /></a>}</div></article>)}</div> : <p className="portal-muted">Belum ada pengumuman terbaru.</p>}
        </PortalPanel>
      </div>
      <aside className="portal-side-stack">
        <PortalPanel title="Akses cepat"><div className="portal-shortcuts">{shortcuts.map(({ title, detail, href, icon: Icon }) => <Link className="portal-shortcut" key={href} to={href}><Icon size={20} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={16} aria-hidden="true" /></Link>)}</div></PortalPanel>
        <PortalPanel title="Agenda kajian" action={<Link to="/belajar/jadwal" className="portal-button">Semua jadwal</Link>}>
          {isSchedulesLoading ? <PortalSkeleton label="Memuat jadwal…" /> : nextSchedule ? <div><h3 className="font-semibold">{nextSchedule.title}</h3><p className="portal-muted mt-2">{nextSchedule.day} · {nextSchedule.date}</p><p className="portal-muted">{nextSchedule.time || [nextSchedule.startTime, nextSchedule.endTime].filter(Boolean).join(' – ') || 'Waktu menyusul'}</p>{nextSchedule.status && nextSchedule.status !== 'Rutin' && <p className="portal-feedback mt-3">{nextSchedule.status}: {nextSchedule.statusReason || 'Periksa pembaruan jadwal.'}</p>}<Link to={nextSchedule.venueId ? '/belajar/lokasi/' + nextSchedule.venueId : '/belajar/lokasi'} className="portal-button mt-4"><MapPin size={16} aria-hidden="true" />Lihat lokasi</Link></div> : <div className="portal-empty"><CalendarDays size={24} aria-hidden="true" /><strong>{schedulesError ? 'Jadwal belum dapat dimuat' : 'Belum ada agenda tersedia'}</strong><p>{schedulesError ? 'Periksa koneksi dan coba Segarkan.' : 'Jadwal yang dipublikasikan akan tampil di sini.'}</p></div>}
        </PortalPanel>
        <p className="portal-muted">Progres, catatan, dan koleksi tersimpan mengikuti akun Anda pada browser ini.</p>
      </aside>
    </div>
  </div>;
}
