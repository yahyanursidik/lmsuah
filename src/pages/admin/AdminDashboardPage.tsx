/* Hallmark · genre: modern-minimal · macrostructure: Task Queue Workbench · design-system: design.md · designed-as-app */
import { useList } from '@refinedev/core';
import { ArrowRight, BookOpen, CalendarDays, Library, MapPin, Megaphone, RefreshCw, Settings, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardState } from '@/components/ui/DashboardState';

type Item = { id: string; title?: string; programId?: string };
const countFormat = new Intl.NumberFormat('id-ID');
const dateFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const operations = [
  { label: 'Kelola program', href: '/admin/programs', icon: BookOpen },
  { label: 'Peserta & pengguna', href: '/admin/users', icon: UsersRound },
  { label: 'Atur jadwal', href: '/admin/schedules', icon: CalendarDays },
  { label: 'Lokasi majelis', href: '/admin/venues', icon: MapPin },
  { label: 'Pengumuman', href: '/admin/announcements', icon: Megaphone },
  { label: 'Pengaturan sistem', href: '/admin/settings', icon: Settings },
];

function useDashboardList(resource: string, status?: string, pageSize = 1) {
  return useList<Item>({
    resource, pagination: { mode: 'server', currentPage: 1, pageSize },
    filters: status ? [{ field: 'status', operator: 'eq', value: status }] : [],
    sorters: pageSize > 1 ? [{ field: 'updatedAt', order: 'desc' }] : [],
  });
}

function DraftQueue({ title, list, linkFor, empty }: {
  title: string;
  list: ReturnType<typeof useDashboardList>;
  linkFor: (item: Item) => string;
  empty: string;
}) {
  const items = list.result.data || [];
  const count = list.result.total ?? items.length;
  return <section className="dash-queue">
    <h3>{title}{!list.query.isLoading && !list.query.isError && <span className="dash-queue-count">{countFormat.format(count)} draft</span>}</h3>
    {list.query.isLoading || list.query.isError || !items.length
      ? <DashboardState loading={list.query.isLoading ? 'Memuat draft…' : undefined} error={list.query.isError ? 'Daftar draft belum dapat dimuat.' : undefined} empty={empty} busy={list.query.isFetching} onRetry={() => void list.query.refetch()} />
      : <ul className="dash-list">{items.slice(0, 3).map(item => <li key={item.id}>
        <Link to={linkFor(item)} className="dash-row"><span><strong>{item.title}</strong></span><ArrowRight size={16} aria-hidden="true" /></Link>
      </li>)}</ul>}
    {!list.query.isError && count > 3 && <p className="dash-meta">Menampilkan 3 draft terbaru.</p>}
  </section>;
}

export function AdminDashboardPage() {
  const programs = useDashboardList('programs');
  const lessons = useDashboardList('lessons');
  const venues = useDashboardList('venues', 'active');
  const schedules = useDashboardList('schedules');
  const draftPrograms = useDashboardList('programs', 'draft', 3);
  const draftLessons = useDashboardList('lessons', 'draft', 3);
  const metrics = [
    { label: 'Program kajian', list: programs, href: '/admin/programs', icon: BookOpen },
    { label: 'Pertemuan', list: lessons, href: '/admin/programs', icon: Library },
    { label: 'Lokasi aktif', list: venues, href: '/admin/venues', icon: MapPin },
    { label: 'Agenda tercatat', list: schedules, href: '/admin/schedules', icon: CalendarDays },
  ];
  const queries = [...metrics.map(metric => metric.list.query), draftPrograms.query, draftLessons.query];
  const refreshing = queries.some(query => query.isFetching);
  const metricError = metrics.some(metric => metric.list.query.isError);

  return <div className="dash-workbench">
    <header className="dash-heading">
      <div><h1>Dashboard admin</h1><p className="dash-meta">{dateFormat.format(new Date())} · WIB</p></div>
      <button type="button" className="portal-button" disabled={refreshing} aria-busy={refreshing} onClick={() => void Promise.all(queries.map(query => query.refetch()))}>
        <RefreshCw size={16} aria-hidden="true" /> {refreshing ? 'Memuat…' : 'Segarkan'}
      </button>
    </header>
    <section className="dash-metrics" aria-label="Ringkasan pengelolaan">
      {metrics.map(({ label, list, href, icon: Icon }) => <Link key={label} to={href}>
        <Icon size={18} aria-hidden="true" />
        <strong>{list.query.isLoading || list.query.isError ? '—' : countFormat.format(list.result.total ?? list.result.data?.length ?? 0)}</strong>
        <span>{label}</span>
        {(list.query.isLoading || list.query.isError) && <small>{list.query.isLoading ? 'Memuat…' : 'Tidak tersedia'}</small>}
      </Link>)}
    </section>
    {metricError && <p role="alert" className="portal-feedback portal-feedback--error">Sebagian ringkasan belum dapat dimuat. Gunakan Segarkan untuk mencoba lagi.</p>}
    <div className="dash-grid">
      <section className="dash-panel dash-panel--learning" aria-labelledby="admin-queue">
        <div className="dash-panel-head"><h2 id="admin-queue">Perlu perhatian</h2><Link className="dash-link" to="/admin/programs?status=draft">Semua program draft <ArrowRight size={16} aria-hidden="true" /></Link></div>
        <DraftQueue title="Program" list={draftPrograms} empty="Tidak ada program draft." linkFor={item => '/admin/programs/' + encodeURIComponent(item.id)} />
        <DraftQueue title="Pertemuan" list={draftLessons} empty="Tidak ada pertemuan draft." linkFor={item => item.programId
          ? '/admin/programs/' + encodeURIComponent(item.programId) + '/curriculum?' + new URLSearchParams({ lesson: item.id })
          : '/admin/lessons'} />
      </section>
      <section className="dash-panel" aria-labelledby="admin-tools">
        <div className="dash-panel-head"><h2 id="admin-tools">Area kerja</h2></div>
        <ul className="dash-list">{operations.map(({ label, href, icon: Icon }) => <li key={href}>
          <Link to={href} className="dash-row"><Icon size={18} aria-hidden="true" /><span><strong>{label}</strong></span><ArrowRight size={16} aria-hidden="true" /></Link>
        </li>)}</ul>
      </section>
    </div>
  </div>;
}
