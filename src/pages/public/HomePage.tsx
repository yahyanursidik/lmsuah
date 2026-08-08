import { Link } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { MOCK_PROGRAMS, MOCK_SCHEDULES, MOCK_SPEAKER, MOCK_VENUES, type ScheduleItem, type Venue } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';

export function HomePage() {
  const schedulesQuery = useList<ScheduleItem>({ resource: 'schedules', pagination: { mode: 'off' } });
  const venuesQuery = useList<Venue>({ resource: 'venues', pagination: { mode: 'off' } });
  const venues = venuesQuery.result.data.length > 0 ? venuesQuery.result.data : MOCK_VENUES;
  const schedules = (schedulesQuery.result.data.length > 0 ? schedulesQuery.result.data : MOCK_SCHEDULES).map((schedule) => ({
    ...schedule,
    venueName: schedule.venueName || venues.find((venue) => venue.id === schedule.venueId)?.name,
  }));
  return (
    <div className="space-y-16 pb-12">
      <SEOHead
        title="Beranda Majelis Ilmu"
        description="Portal resmi pembelajaran syar'i dan arsip majelis ilmu Ustadz Abu Haidar As-Sundawy hafizhahullah."
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-stone-200/80 bg-[#F7F5ED] py-16 sm:py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/20 bg-emerald-900/5 px-3.5 py-1 text-xs font-semibold text-emerald-900">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-700 motion-reduce:animate-none" />
                <span>Portal Pembelajaran Syar'i Ustadz Abu Haidar As-Sundawy</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl leading-[1.2]">
                Terlewat Kajian? Tidak Sempat Hadir? Atau Ingin Mengulang Kembali Kajian yang Pernah Dihadiri?
              </h1>
              <p className="text-lg text-slate-700 leading-relaxed max-w-2xl">
                Mari tetap terkoneksi dengan ilmu. Dapatkan akses penuh, rekaman kajian yang disesuaikan agar nyaman ketika dipelajari, transkrip, hingga kuis evaluasi pemahaman dari kajian-kajian Ustadz Abu Haidar As-Sundawy (hafizhahullah).
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/programs"
                  className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 active:bg-emerald-950"
                >
                  Jelajahi Program Kitab
                </Link>
                <Link
                  to="/schedules"
                  className="flex min-h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-2xs hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 active:bg-stone-100"
                >
                  Jadwal Kajian Pekanan
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md rounded-2xl border border-stone-300/80 bg-white p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Kajian Pekanan Terdekat</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Live Stream
                  </span>
                </div>
                {schedules.slice(0, 2).map((sch) => (
                  <div key={sch.id} className="rounded-xl bg-stone-50 p-4 border border-stone-200/60 space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                      <span>{sch.day}, {sch.date}</span>
                      <span className="text-emerald-900 font-bold">{sch.time || [sch.startTime, sch.endTime].filter(Boolean).join(' – ') || 'Menyusul'}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{sch.title}</h4>
                    <p className="text-xs text-slate-600">📍 {sch.venueName}</p>
                  </div>
                ))}
                <Link
                  to="/schedules"
                  className="block text-center text-xs font-bold text-emerald-900 hover:underline pt-1"
                >
                  Lihat Semua Jadwal Pekanan →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Programs Grid */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Program Kajian Kitab</h2>
            <p className="text-sm text-slate-600 mt-1">Pembahasan kitab-kitab syar'i yang diampu oleh Ustadz Abu Haidar As-Sundawy.</p>
          </div>
          <Link to="/programs" className="text-sm font-semibold text-emerald-900 hover:underline">
            Lihat Semua Program ({MOCK_PROGRAMS.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_PROGRAMS.map((prog) => (
            <div
              key={prog.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs hover:border-emerald-900/30"
            >
              <div className="relative h-48 overflow-hidden bg-stone-100">
                <img
                  src={prog.coverImage}
                  alt={prog.title}
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-3 left-3 rounded-md bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                  {prog.category}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                    {prog.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {prog.description}
                  </p>
                </div>
                <div className="border-t border-stone-100 pt-3 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Kitab Rujukan:</span>
                    <span className="font-semibold text-slate-800">{prog.bookTitle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Pertemuan:</span>
                    <span className="font-semibold text-slate-800">{prog.totalLessons} Pertemuan</span>
                  </div>
                </div>
                <Link
                  to={`/programs/${prog.id}`}
                  className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-300 py-2.5 text-center text-xs font-bold text-slate-800 hover:border-emerald-900 hover:bg-emerald-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  Lihat Detail Program
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Speaker Section */}
      <section className="bg-stone-900 text-white py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-amber-500/30 bg-black p-4 shadow-2xl flex items-center justify-center">
                <img
                  src={MOCK_SPEAKER.image}
                  alt={MOCK_SPEAKER.name}
                  className="h-full w-full object-contain rounded-xl"
                />
              </div>
            </div>
            <div className="lg:col-span-8 space-y-6">
              <div className="inline-block rounded-md bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-200">
                Pengampu Kajian
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl text-stone-100">
                {MOCK_SPEAKER.name} <span className="text-emerald-400 text-xl font-normal">({MOCK_SPEAKER.title})</span>
              </h2>
              <p className="text-stone-300 leading-relaxed text-sm sm:text-base">
                {MOCK_SPEAKER.bio}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="rounded-xl bg-stone-800/80 p-4 border border-stone-700">
                  <div className="text-2xl font-bold text-emerald-400">{MOCK_SPEAKER.activeProgramsCount}</div>
                  <div className="text-xs text-stone-400">Program Aktif</div>
                </div>
                <div className="rounded-xl bg-stone-800/80 p-4 border border-stone-700">
                  <div className="text-2xl font-bold text-emerald-400">{MOCK_SPEAKER.totalKajiansCount}+</div>
                  <div className="text-xs text-stone-400">Arsip Rekaman</div>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/speaker"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors min-h-[44px]"
                >
                  Biografi Lengkap & Profil Pemateri →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Venues Preview */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Lokasi Majelis Offline</h2>
            <p className="text-sm text-slate-600 mt-1">Masjid dan majelis penyelenggara kajian rutin Ustadz Abu Haidar As-Sundawy.</p>
          </div>
          <Link to="/venues" className="text-sm font-semibold text-emerald-900 hover:underline">
            Lihat Semua Lokasi →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {venues.slice(0, 4).map((v) => (
            <div key={v.id} className="space-y-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs hover:border-emerald-900/30">
              <div className="h-44 w-full bg-stone-100 overflow-hidden">
                <img src={v.image} alt={v.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-6 pt-0 space-y-3">
                <h3 className="text-lg font-bold text-slate-900">{v.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{v.address}</p>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-100">
                  <span className="font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-md">
                    {v.activeKajiansCount} Program Rutin
                  </span>
                  <Link to={`/venues/${v.id}`} className="font-bold text-slate-800 hover:text-emerald-900">
                    Detail Lokasi & Peta →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
