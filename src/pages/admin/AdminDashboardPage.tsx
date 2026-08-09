/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app
 */
import { useList } from '@refinedev/core';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleAlert,
  Clock3,
  Library,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type ContentStatus = 'draft' | 'published' | 'archived';

type ProgramItem = {
  id: string;
  title: string;
  status?: ContentStatus;
  updatedAt?: string;
  createdAt?: string;
};

type LessonItem = {
  id: string;
  title: string;
  status?: ContentStatus;
  programId?: string;
  updatedAt?: string;
  createdAt?: string;
};

type VenueItem = { id: string; name: string };
type ScheduleItem = { id: string; title?: string; startAt?: string };

const dateLabel = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

const quickLinks = [
  { label: 'Kelola program', detail: 'Struktur, status, dan publikasi', href: '/admin/programs', icon: BookOpen },
  { label: 'Atur jadwal', detail: 'Agenda kajian mendatang', href: '/admin/schedules', icon: CalendarDays },
  { label: 'Kelola lokasi', detail: 'Majelis dan informasi tempat', href: '/admin/venues', icon: MapPin },
  { label: 'Pengaturan sistem', detail: 'Akses, publikasi, dan dokumen', href: '/admin/settings', icon: Settings },
];

export function AdminDashboardPage() {
  const programs = useList<ProgramItem>({ resource: 'programs', pagination: { mode: 'off' } });
  const lessons = useList<LessonItem>({ resource: 'lessons', pagination: { mode: 'off' } });
  const venues = useList<VenueItem>({ resource: 'venues', pagination: { mode: 'off' } });
  const schedules = useList<ScheduleItem>({ resource: 'schedules', pagination: { mode: 'off' } });

  const isLoading = programs.query.isLoading || lessons.query.isLoading || venues.query.isLoading || schedules.query.isLoading;
  const hasError = programs.query.isError || lessons.query.isError || venues.query.isError || schedules.query.isError;
  const programItems = programs.result.data || [];
  const lessonItems = lessons.result.data || [];
  const venueItems = venues.result.data || [];
  const scheduleItems = schedules.result.data || [];

  const publishedPrograms = programItems.filter((item) => item.status === 'published').length;
  const draftPrograms = programItems.filter((item) => item.status === 'draft');
  const draftLessons = lessonItems.filter((item) => item.status === 'draft');
  const attentionItems = [
    ...draftPrograms.map((item) => ({ ...item, type: 'Program', href: `/admin/programs/${item.id}` })),
    ...draftLessons.map((item) => ({ ...item, type: 'Pertemuan', href: item.programId ? `/admin/programs/${item.programId}/curriculum` : '/admin/programs' })),
  ].slice(0, 5);

  const metrics = [
    { label: 'Total program', value: programItems.length, helper: `${publishedPrograms} sudah terbit`, icon: BookOpen },
    { label: 'Total pertemuan', value: lessonItems.length, helper: `${draftLessons.length} masih draft`, icon: Library },
    { label: 'Lokasi majelis', value: venueItems.length, helper: 'Tersedia di portal', icon: MapPin },
    { label: 'Agenda tercatat', value: scheduleItems.length, helper: 'Seluruh jadwal', icon: CalendarDays },
  ];

  const refreshAll = () => {
    void Promise.all([
      programs.query.refetch(),
      lessons.query.refetch(),
      venues.query.refetch(),
      schedules.query.refetch(),
    ]);
  };

  return (
    <div className="mx-auto max-w-[90rem] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-8 lg:py-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" /> Ruang kerja admin
            </div>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Kendalikan konten kajian dari satu tempat.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Pantau isi portal, lanjutkan konten yang belum selesai, lalu buka area kerja yang Anda butuhkan.</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {dateLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              type="button" 
              onClick={refreshAll} 
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" /> Segarkan
            </button>
            <Link 
              to="/admin/programs" 
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Tambah program
            </Link>
          </div>
        </div>
      </section>

      {hasError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">Sebagian data belum dapat dimuat.</p>
            <p className="mt-0.5 text-xs text-amber-700">Periksa koneksi server lalu gunakan tombol Segarkan.</p>
          </div>
        </div>
      )}

      <section aria-labelledby="summary-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 id="summary-title" className="text-lg font-bold text-slate-900">Ringkasan portal</h2>
            <p className="text-xs text-slate-500">Angka langsung dari data aplikasi.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{metric.label}</p>
                  <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                    <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{isLoading ? '—' : metric.value.toLocaleString('id-ID')}</p>
                <p className="mt-1 text-xs text-slate-500">{isLoading ? 'Memuat data…' : metric.helper}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <section aria-labelledby="workspace-title" className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div>
            <h2 id="workspace-title" className="text-lg font-bold text-slate-900">Buka area kerja</h2>
            <p className="mt-0.5 text-xs text-slate-500">Jalur cepat menuju pekerjaan utama.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href} 
                  to={item.href} 
                  className="group flex min-h-20 items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-emerald-600 shadow-2xs group-hover:border-emerald-200 transition-colors">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600 transition-colors" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="attention-title" className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="attention-title" className="text-lg font-bold text-slate-900">Perlu perhatian</h2>
              <p className="mt-0.5 text-xs text-slate-500">Konten draft yang dapat dilanjutkan.</p>
            </div>
            {!isLoading && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {draftPrograms.length + draftLessons.length}
              </span>
            )}
          </div>

          <div className="mt-5">
            {isLoading ? (
              <div className="space-y-3" aria-label="Memuat konten draft">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : attentionItems.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {attentionItems.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <Link 
                      to={item.href} 
                      className="group flex items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-400">{item.type} · Draft</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600 transition-colors" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-700">Tidak ada draft tertunda</p>
                <p className="mt-1 text-xs text-slate-400">Konten yang perlu dilanjutkan akan muncul di sini.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
