/* Hallmark · genre: modern-minimal · macrostructure: Learning Continuation Workbench · design-system: design.md · designed-as-app */
import { useGetIdentity, useList } from '@refinedev/core';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, ExternalLink, FileText, MapPin, Play, RefreshCw } from 'lucide-react';
import { getUserBookmarks, getUserNotes } from '@/lib/userStore';
import { useLearningData } from '@/lib/useLearningData';
import { LearningSyncNotice } from '@/components/ui/LearningSyncNotice';
import { DashboardState } from '@/components/ui/DashboardState';
import { formatAgendaDate, getAgendaStream, getUpcomingAgenda } from '@/lib/public-home';
import { isSafeStreamUrl } from '../../../shared/schedule-stream';
import { useParticipantPortalData } from './useParticipantPortalData';

type Identity = { id: string; name?: string };
type Announcement = { id: string; title: string; content: string; linkUrl?: string; createdAt?: string };
const shortcuts = [
  { title: 'Katalog kajian', href: '/belajar/katalog', icon: BookOpen },
  { title: 'Kuis & hasil evaluasi', href: '/belajar/progres', icon: ClipboardCheck },
  { title: 'Lokasi majelis', href: '/belajar/lokasi', icon: MapPin },
  { title: 'Catatan belajar', href: '/tersimpan?tab=catatan', icon: FileText },
];
const number = new Intl.NumberFormat('id-ID');
const dateLabel = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
const lessonHref = (id: string) => '/belajar/lesson/' + encodeURIComponent(id);

export function DashboardPage() {
  const { data: identity } = useGetIdentity<Identity>();
  const userId = identity?.id || '';
  const learning = useLearningData(userId);
  const hasLearningHistory = !!userId && (learning.progress.length > 0 || learning.enrollments.some(item => item.status === 'active'));
  const { programs, lessons, schedules, isProgramsLoading, isLessonsLoading, isSchedulesLoading, isRefreshing, programsError, lessonsError, schedulesError, refetch } = useParticipantPortalData({ includeLessons: hasLearningHistory });
  const { query: announcementsQuery, result: announcementsResult } = useList<Announcement>({
    resource: 'announcements', filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    sorters: [{ field: 'createdAt', order: 'desc' }], pagination: { mode: 'server', currentPage: 1, pageSize: 5 },
  });
  const announcements = announcementsResult.data || [];
  const notes = userId ? getUserNotes(userId) : [];
  const bookmarks = userId ? getUserBookmarks(userId) : [];
  const accountReady = !!userId && !learning.loading && !learning.error;
  const contentReady = !isProgramsLoading && !isLessonsLoading && !programsError && !lessonsError;
  const publishedPrograms = programs.filter(item => item.status === 'published');
  const programById = new Map(publishedPrograms.map(item => [item.id, item]));
  const validLessons = lessons.filter((lesson): lesson is typeof lesson & { programId: string } => lesson.status === 'published' && !!lesson.programId && programById.has(lesson.programId));
  const lessonById = new Map(validLessons.map(lesson => [lesson.id, lesson]));
  const progressById = new Map(learning.progress.map(item => [item.lessonId, item]));
  const followedIds = new Set(learning.enrollments.filter(item => item.status === 'active').map(item => item.programId));
  const followed = publishedPrograms.filter(item => followedIds.has(item.id));
  const recent = [...learning.progress].filter(item => !item.isCompleted && lessonById.has(item.lessonId))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  const next = accountReady && contentReady
    ? (recent && lessonById.get(recent.lessonId)) || validLessons.filter(lesson => followedIds.has(lesson.programId) && !progressById.get(lesson.id)?.isCompleted)
      .sort((a, b) => a.sequence - b.sequence)[0]
    : undefined;
  const savedProgress = next && progressById.get(next.id);
  const position = savedProgress?.lastPositionSeconds || 0;
  const program = next?.programId ? programById.get(next.programId) : undefined;
  const nextSchedule = getUpcomingAgenda(schedules)[0];
  const stream = nextSchedule ? getAgendaStream(nextSchedule) : undefined;
  const refreshing = !!(isRefreshing || announcementsQuery.isFetching || learning.loading);
  const refresh = () => { void refetch(); void announcementsQuery.refetch(); if (userId) void learning.refresh(); };
  const metrics = [
    { title: 'Kajian diikuti', value: accountReady && !isProgramsLoading && !programsError ? followed.length : undefined, href: '/belajar', icon: BookOpen },
    { title: 'Pertemuan selesai', value: accountReady && contentReady ? validLessons.filter(lesson => progressById.get(lesson.id)?.isCompleted).length : undefined, href: '/belajar/progres', icon: CheckCircle2 },
    { title: 'Catatan', value: userId ? notes.length : undefined, href: '/tersimpan?tab=catatan', icon: FileText },
    { title: 'Tersimpan', value: userId ? bookmarks.length : undefined, href: '/tersimpan', icon: Bookmark },
  ];

  return <div className="dash-workbench">
    <header className="dash-heading">
      <div><h1>Assalamu’alaikum, {identity?.name?.trim() || 'Peserta'}</h1><p className="dash-meta">Ruang belajar Kajian Abu Haidar</p></div>
      <button type="button" className="portal-button" onClick={refresh} disabled={refreshing} aria-busy={refreshing}>
        <RefreshCw size={16} aria-hidden="true" /> {refreshing ? 'Memuat…' : 'Segarkan'}
      </button>
    </header>
    <LearningSyncNotice {...learning} />
    <div className="dash-grid">
      <section className="dash-panel dash-panel--learning" aria-labelledby="learning-next">
        <h2 id="learning-next">Langkah belajar berikutnya</h2>
        {next ? <>
          <h3 className="dash-lead-title">{next.title}</h3>
          <p className="dash-meta">{program?.title} · Pertemuan {next.sequence}</p>
          {position > 0 && <p className="dash-meta">Posisi tersimpan: {Math.floor(position / 60)}:{String(Math.floor(position % 60)).padStart(2, '0')}</p>}
          <div className="dash-actions">
            <Link to={lessonHref(next.id)} className="portal-button portal-button--primary"><Play size={16} aria-hidden="true" />{savedProgress ? 'Lanjutkan belajar' : 'Buka pertemuan'}</Link>
            {program && <Link to={'/belajar/katalog/' + encodeURIComponent(program.id)} className="dash-link">Kurikulum <ArrowRight size={16} aria-hidden="true" /></Link>}
          </div>
        </> : <DashboardState
          loading={learning.loading || isProgramsLoading || isLessonsLoading ? 'Memeriksa langkah belajar…' : undefined}
          error={programsError || lessonsError ? 'Pertemuan belum dapat diperiksa.' : undefined}
          busy={isRefreshing} onRetry={() => void refetch()}
          empty={<><p>{learning.error ? 'Progres belum terverifikasi. Anda tetap bisa membuka katalog.' : followed.length ? 'Belum ada pertemuan berikutnya di kajian yang Anda ikuti.' : 'Pilih kajian untuk mulai belajar.'}</p>
          <div className="dash-actions"><Link to={followed.length && !learning.error ? '/belajar' : '/belajar/katalog'} className="portal-button portal-button--primary">{followed.length && !learning.error ? 'Buka kajian saya' : 'Jelajahi katalog'} <ArrowRight size={16} aria-hidden="true" /></Link></div></>}
        />}
      </section>
      <section className="dash-panel dash-panel--agenda" aria-labelledby="participant-agenda">
        <div className="dash-panel-head"><h2 id="participant-agenda">Agenda terdekat</h2><Link className="dash-link" to="/belajar/jadwal">Semua jadwal</Link></div>
        {nextSchedule ? <>
          <p className="dash-meta"><time dateTime={nextSchedule.date}>{formatAgendaDate(nextSchedule.date)}</time>{nextSchedule.startTime && ' · ' + nextSchedule.startTime + ' WIB'}</p>
          <h3 className="dash-lead-title">{nextSchedule.title}</h3>
          {nextSchedule.venueName && <p className="dash-meta">{nextSchedule.venueName}</p>}
          {nextSchedule.status === 'Pindah Lokasi' && <p className="dash-meta">Lokasi berubah</p>}
          <div className="dash-actions">
            <Link to={'/belajar/jadwal?' + new URLSearchParams({ agenda: nextSchedule.id })} className="portal-button"><CalendarDays size={16} aria-hidden="true" /> Detail agenda</Link>
            {stream && <a href={stream} target="_blank" rel="noopener noreferrer" className="dash-link">Buka siaran <ExternalLink size={14} aria-hidden="true" /></a>}
          </div>
        </> : <DashboardState loading={isSchedulesLoading ? 'Memuat agenda…' : undefined} error={schedulesError ? 'Jadwal belum dapat dimuat.' : undefined} empty="Belum ada agenda mendatang." busy={isRefreshing} onRetry={() => void refetch()} />}
      </section>
    </div>
    <section className="dash-metrics" aria-label="Ringkasan belajar">
      {metrics.map(({ title, value, href, icon: Icon }) => <Link key={title} to={href}>
        <Icon size={18} aria-hidden="true" /><strong>{value === undefined ? '—' : number.format(value)}</strong><span>{title}</span>
        {value === undefined && <small>{learning.loading || !identity || isProgramsLoading || isLessonsLoading ? 'Memuat…' : 'Tidak tersedia'}</small>}
      </Link>)}
    </section>
    <div className="dash-grid">
      <div className="dash-stack">
        <section className="dash-panel" aria-labelledby="participant-courses">
          <div className="dash-panel-head">
            <h2 id="participant-courses">{followed.length && accountReady ? 'Kajian aktif' : 'Program tersedia'}</h2>
            <Link className="dash-link" to={followed.length && accountReady ? '/belajar' : '/belajar/katalog'}>{followed.length && accountReady ? 'Kajian saya' : 'Buka katalog'} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {isProgramsLoading || programsError || !publishedPrograms.length
            ? <DashboardState loading={isProgramsLoading ? 'Memuat program…' : undefined} error={programsError ? 'Program belum dapat dimuat.' : undefined} empty="Belum ada program terbit." busy={isRefreshing} onRetry={() => void refetch()} />
            : <ul className="dash-list">{(followed.length && accountReady ? followed : publishedPrograms).slice(0, 3).map(item => {
              const meetings = validLessons.filter(lesson => lesson.programId === item.id);
              const completed = meetings.filter(lesson => progressById.get(lesson.id)?.isCompleted).length;
              return <li key={item.id}><Link className="dash-row" to={(accountReady && followedIds.has(item.id) ? '/belajar/program/' : '/belajar/katalog/') + encodeURIComponent(item.id)}>
                <span><strong>{item.title}</strong>{accountReady && contentReady && followedIds.has(item.id) && <small className="dash-meta">{meetings.length ? completed + ' dari ' + meetings.length + ' pertemuan selesai' : 'Belum ada pertemuan terbit'}</small>}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link></li>;
            })}</ul>}
        </section>
        <section className="dash-panel" aria-labelledby="participant-notices">
          <div className="dash-panel-head"><h2 id="participant-notices">Pengumuman</h2></div>
          {announcementsQuery.isLoading || announcementsQuery.isError || !announcements.length
            ? <DashboardState loading={announcementsQuery.isLoading ? 'Memuat pengumuman…' : undefined} error={announcementsQuery.isError ? 'Pengumuman belum dapat dimuat.' : undefined} empty="Belum ada pengumuman." busy={announcementsQuery.isFetching} onRetry={() => void announcementsQuery.refetch()} />
            : <ul className="dash-list">{announcements.map(item => <li key={item.id}>
              <details className="dash-notice"><summary>{item.title}</summary>
                {item.createdAt && Number.isFinite(Date.parse(item.createdAt)) && <time className="dash-meta" dateTime={item.createdAt}>{dateLabel.format(new Date(item.createdAt))}</time>}
                <p>{item.content}</p>
                {item.linkUrl && isSafeStreamUrl(item.linkUrl) && <a className="dash-link" href={item.linkUrl} target="_blank" rel="noopener noreferrer">Buka tautan <ExternalLink size={14} aria-hidden="true" /></a>}
              </details>
            </li>)}</ul>}
        </section>
      </div>
      <section className="dash-panel" aria-labelledby="participant-shortcuts">
        <div className="dash-panel-head"><h2 id="participant-shortcuts">Akses cepat</h2></div>
        <ul className="dash-list">{shortcuts.map(({ title, href, icon: Icon }) => <li key={href}>
          <Link to={href} className="dash-row"><Icon size={18} aria-hidden="true" /><span><strong>{title}</strong></span><ArrowRight size={16} aria-hidden="true" /></Link>
        </li>)}</ul>
      </section>
    </div>
  </div>;
}
