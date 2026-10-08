/* Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V4
 * genre: modern-minimal · macrostructure: Guided Operations Workbench · design-system: design.md · designed-as-app */
import { useList } from '@refinedev/core';
import { ArrowRight, BookOpen, CalendarDays, CircleAlert, Library, MapPin, Megaphone, RefreshCw, Settings, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PortalPanel, PortalSkeleton } from '@/components/ui/PortalNavigation';

type ContentItem = { id: string; title: string; status?: 'draft' | 'published' | 'archived'; programId?: string };
type VenueItem = { id: string; name: string };
type ScheduleItem = { id: string; title?: string };
const queryOptions = { staleTime: 30_000, retry: 1 };
const quickLinks = [
  { label: 'Kelola program', detail: 'Pertemuan, materi, dan kuis', href: '/admin/programs', icon: BookOpen },
  { label: 'Kelola pengguna', detail: 'Peserta dan akses akun', href: '/admin/users', icon: UsersRound },
  { label: 'Atur jadwal', detail: 'Agenda dan status kajian', href: '/admin/schedules', icon: CalendarDays },
  { label: 'Kelola lokasi', detail: 'Alamat dan petunjuk majelis', href: '/admin/venues', icon: MapPin },
  { label: 'Pengumuman', detail: 'Informasi untuk peserta', href: '/admin/announcements', icon: Megaphone },
  { label: 'Pengaturan sistem', detail: 'Akses dan informasi portal', href: '/admin/settings', icon: Settings },
];

export function AdminDashboardPage() {
  const programs = useList<ContentItem>({ resource: 'programs', pagination: { mode: 'off' }, queryOptions });
  const lessons = useList<ContentItem>({ resource: 'lessons', pagination: { mode: 'off' }, queryOptions });
  const venues = useList<VenueItem>({ resource: 'venues', pagination: { mode: 'off' }, queryOptions });
  const schedules = useList<ScheduleItem>({ resource: 'schedules', pagination: { mode: 'off' }, queryOptions });
  const queries = [programs.query, lessons.query, venues.query, schedules.query];
  const refreshing = queries.some(query => query.isFetching);
  const hasError = queries.some(query => query.isError);
  const programItems = programs.result.data || [];
  const lessonItems = lessons.result.data || [];
  const draftPrograms = programItems.filter(item => item.status === 'draft');
  const draftLessons = lessonItems.filter(item => item.status === 'draft');
  const attentionError = programs.query.isError || lessons.query.isError;
  const attentionLoading = programs.query.isLoading || lessons.query.isLoading;
  const attentionItems = [
    ...draftPrograms.map(item => ({ ...item, type: 'Program', href: '/admin/programs/' + item.id })),
    ...draftLessons.map(item => ({ ...item, type: 'Pertemuan', href: item.programId ? '/admin/programs/' + item.programId + '/curriculum' : '/admin/programs' })),
  ].slice(0, 5);
  const metrics = [
    { label: 'Total program', value: programItems.length, helper: programItems.filter(item => item.status === 'published').length + ' sudah terbit', icon: BookOpen, href: '/admin/programs', query: programs.query },
    { label: 'Total pertemuan', value: lessonItems.length, helper: draftLessons.length + ' masih draft', icon: Library, href: '/admin/programs', query: lessons.query },
    { label: 'Lokasi majelis', value: venues.result.data?.length || 0, helper: 'Tersedia di portal', icon: MapPin, href: '/admin/venues', query: venues.query },
    { label: 'Agenda tercatat', value: schedules.result.data?.length || 0, helper: 'Seluruh jadwal', icon: CalendarDays, href: '/admin/schedules', query: schedules.query },
  ];
  const refreshAll = () => { void Promise.all(queries.map(query => query.refetch())); };
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date());
  return <div className="portal-dashboard">
    <section className="portal-welcome"><h1>Selamat datang di ruang admin.</h1><p>Kelola kajian, bantu peserta, dan siapkan majelis berikutnya dari satu tempat.</p><p>{dateLabel}</p><div className="portal-actions"><Link to="/admin/programs" className="portal-button portal-button--primary"><BookOpen size={16} aria-hidden="true" />Buka program</Link><button type="button" onClick={refreshAll} disabled={refreshing} aria-busy={refreshing} className="portal-button"><RefreshCw size={16} aria-hidden="true" className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />{refreshing ? 'Memuat…' : 'Segarkan'}</button></div></section>
    {hasError && <div role="alert" className="portal-feedback portal-feedback--error"><CircleAlert size={20} aria-hidden="true" /><div><strong>Sebagian data belum dapat dimuat.</strong><p>Angka yang belum tersedia ditandai —. Periksa koneksi dan gunakan Segarkan.</p></div></div>}
    <section aria-label="Ringkasan portal" className="portal-metrics">{metrics.map(({ label, value, helper, icon: Icon, href, query }) => <Link key={label} to={href} className="portal-metric"><div className="portal-metric-title"><span>{label}</span><Icon size={18} aria-hidden="true" /></div><strong>{query.isLoading || query.isError ? '—' : value.toLocaleString('id-ID')}</strong><small>{query.isLoading ? 'Memuat data…' : query.isError ? 'Belum dapat dimuat' : helper}</small></Link>)}</section>
    <div className="portal-main-grid">
      <PortalPanel title="Buka area kerja" description="Pilih tugas yang ingin Anda selesaikan."><div className="portal-shortcuts">{quickLinks.map(({ label, detail, href, icon: Icon }) => <Link key={href} to={href} className="portal-shortcut"><Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight size={16} aria-hidden="true" /></Link>)}</div></PortalPanel>
      <PortalPanel title="Perlu perhatian" description="Program dan pertemuan draft yang dapat dilanjutkan.">
        {attentionLoading ? <PortalSkeleton label="Memuat konten draft…" /> : attentionItems.length ? <div className="portal-list">{attentionItems.map(item => <Link key={item.type + item.id} to={item.href} className="portal-list-item"><div><h3>{item.title}</h3><p className="portal-muted">{item.type} · Draft</p></div><ArrowRight size={16} aria-hidden="true" /></Link>)}<Link className="portal-button mt-3" to="/admin/programs">Semua program</Link></div> : attentionError ? <div className="portal-empty"><CircleAlert size={24} aria-hidden="true" /><strong>Draft belum dapat diperiksa</strong><p>Daftar kosong belum berarti seluruh konten selesai. Coba tombol Segarkan.</p></div> : <div className="portal-empty"><BookOpen size={24} aria-hidden="true" /><strong>Tidak ada draft tertunda</strong><p>Konten yang perlu dilanjutkan akan muncul di sini.</p><Link to="/admin/programs" className="portal-button">Kelola program</Link></div>}
      </PortalPanel>
    </div>
  </div>;
}
