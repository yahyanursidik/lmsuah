import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { MapPin } from 'lucide-react';
import type { ScheduleItem, Venue } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';
import { EmptyState, LoadingSkeleton, ErrorAlert } from '../../components/public/UIStates';
import { getAgendaStream } from '../../lib/public-home';
import { TARBIYAH_CHANNEL_NAME, TARBIYAH_LIVE_URL, TARBIYAH_STREAMS_URL } from '../../../shared/schedule-stream';

export function SchedulesPage() {
  const [filterType, setFilterType] = useState<'Semua' | 'Rutin' | 'Tematik' | 'Perubahan' | 'Live'>('Semua');
  const [params, setParams] = useSearchParams();
  const agendaId = params.get('agenda');

  const { query: listQuery, result: listResult } = useList<ScheduleItem>({
    resource: 'schedules',
    pagination: { mode: 'off' },
  });
  const { result: venuesResult } = useList<Venue>({
    resource: 'venues', pagination: { mode: 'off' },
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
  });

  const rawSchedules = listResult?.data || [];
  const venueNames = new Map((venuesResult?.data || []).map(venue => [venue.id, venue.name]));
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;
  const refetch = listQuery.refetch;

  const filteredSchedules = rawSchedules.filter((sch) => {
    if (agendaId) return sch.id === agendaId;
    if (filterType === 'Semua') return true;
    if (filterType === 'Perubahan') return Boolean(sch.status && sch.status !== 'Rutin');
    if (filterType === 'Live') return Boolean(getAgendaStream(sch));
    return sch.type === filterType;
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOHead
        title="Jadwal Kajian"
        description="Jadwal lengkap kajian rutin dan tematik Ustadz Abu Haidar As-Sundawy di Bandung dan sekitarnya (WIB / Asia/Jakarta)."
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-stone-200">
            Zona Waktu: Asia/Jakarta (WIB)
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Jadwal Kajian Pekanan & Tematik
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Lihat waktu, lokasi, dan tautan siaran kajian.
        </p>
        <Link to="/venues" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><MapPin className="h-4 w-4 text-emerald-800" /> Jelajahi lokasi majelis</Link>
      </div>

      {/* Filter Tabs */}
      {agendaId ? (
        <Link to="/schedules" onClick={() => setFilterType('Semua')} className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-emerald-900 focus-visible:outline-2">
          Lihat semua agenda
        </Link>
      ) : <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        {(['Semua', 'Rutin', 'Tematik', 'Perubahan', 'Live'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={filterType === t}
            onClick={() => setFilterType(t)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] flex items-center whitespace-nowrap ${
              filterType === t
                ? 'bg-emerald-900 text-white'
                : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
            }`}
          >
            {t === 'Semua' ? 'Semua agenda' : t === 'Live' ? 'Ada siaran' : t}
          </button>
        ))}
      </div>}

      {/* Content Rendering */}
      {isLoading ? (
        <LoadingSkeleton count={3} />
      ) : isError && rawSchedules.length === 0 ? (
        <ErrorAlert
          message="Gagal memuat jadwal kajian dari server."
          onRetry={() => refetch()}
        />
      ) : filteredSchedules.length === 0 ? (
        <EmptyState
          title={agendaId ? 'Agenda tidak ditemukan' : 'Tidak ada jadwal'}
          description={agendaId ? 'Agenda mungkin telah dihapus. Lihat daftar untuk menemukan jadwal lain.' : 'Belum ada jadwal kajian untuk kategori ini.'}
          actionText={agendaId ? 'Lihat semua jadwal' : undefined}
          onAction={() => { setFilterType('Semua'); setParams({}); }}
        />
      ) : (
        <div className="space-y-6">
          {filteredSchedules.map((sch) => {
            const streamUrl = getAgendaStream(sch);
            const venueName = venueNames.get(sch.venueId) || sch.venueName;
            const venueLink = venueNames.has(sch.venueId) ? `/venues/${encodeURIComponent(sch.venueId)}` : undefined;
            const isCancelled = sch.status === 'Dibatalkan';
            const isRescheduled = sch.status === 'Diundur';
            const isRelocated = sch.status === 'Pindah Lokasi';
            const hasStatusAlert = isCancelled || isRescheduled || isRelocated;

            return (
              <div
                key={sch.id}
                className={`flex flex-col gap-6 rounded-2xl border bg-white p-6 shadow-xs md:flex-row md:items-center md:justify-between ${
                  isCancelled
                    ? 'border-red-300 bg-red-50/30'
                    : isRescheduled || isRelocated
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-stone-200 hover:border-emerald-900/30'
                }`}
              >
                <div className="min-w-0 space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Change Badge */}
                    {isCancelled && (
                      <span className="rounded-md bg-red-800 px-3 py-1 text-xs font-extrabold text-white">
                        🚫 DIBATALKAN
                      </span>
                    )}
                    {isRescheduled && (
                      <span className="rounded-md bg-amber-600 px-3 py-1 text-xs font-extrabold text-white">
                        ⏰ DIUNDUR
                      </span>
                    )}
                    {isRelocated && (
                      <span className="rounded-md bg-orange-600 px-3 py-1 text-xs font-extrabold text-white">
                        📍 PINDAH LOKASI
                      </span>
                    )}
                    {!hasStatusAlert && (
                      <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                        {sch.category || 'Kajian'}
                      </span>
                    )}

                    <span className="rounded-md bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                      Kajian {sch.type}
                    </span>

                    {streamUrl && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        {streamUrl === TARBIYAH_STREAMS_URL || streamUrl === TARBIYAH_LIVE_URL ? `Siaran: ${TARBIYAH_CHANNEL_NAME}` : 'Tautan siaran tersedia'}
                      </span>
                    )}
                  </div>

                  <h2 className={`break-words text-xl font-bold ${isCancelled ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {sch.title}
                  </h2>

                  {/* Status Reason Alert Box */}
                  {sch.statusReason && (
                    <div
                      className={`rounded-xl p-3.5 text-xs font-medium space-y-1 ${
                        isCancelled
                          ? 'bg-red-100 text-red-900 border border-red-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      <span className="font-bold block">
                        {isCancelled ? '⚠️ Catatan Pembatalan:' : isRescheduled ? '⏰ Catatan Pengunduran:' : '📍 Catatan Perpindahan Lokasi:'}
                      </span>
                      <p>{sch.statusReason}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1 font-semibold text-slate-900">
                      📅 {sch.day}, {sch.date}
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-emerald-900">
                      ⏰ {sch.time || [sch.startTime, sch.endTime].filter(Boolean).join(' – ') || 'Waktu menyusul'}
                      {(sch.time || sch.startTime || sch.endTime) && ' WIB'}
                    </div>
                    <div className="flex items-center gap-1">
                      👤 {sch.speaker}
                    </div>
                    {venueName && <div className="flex items-center gap-1 font-medium text-slate-800">
                      <MapPin size={14} aria-hidden="true" /> {venueName}
                    </div>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {venueLink && (
                    <Link
                      to={venueLink}
                      className="flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      Detail Lokasi 📍
                    </Link>
                  )}
                  {streamUrl && (
                    <a
                      href={streamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-red-800 transition-colors min-h-[44px] flex items-center justify-center"
                    >
                      Tonton Live Stream ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
