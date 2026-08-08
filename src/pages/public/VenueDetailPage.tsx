import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOne, useList } from '@refinedev/core';
import { MOCK_VENUES, MOCK_PROGRAMS, MOCK_SCHEDULES, Venue, Program, ScheduleItem } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';
import { EmptyState, LoadingSkeleton, ErrorAlert } from '../../components/public/UIStates';
import { Copy, Check, Share2, MapPin, ExternalLink, Calendar, Phone, Users, Home } from 'lucide-react';

const getVenueImage = (venue: Pick<Venue, 'id' | 'name' | 'image'>) => {
  if (venue.image?.startsWith('/masjid')) return venue.image;
  if (venue.id.includes('ukhuwah') || venue.name.toLowerCase().includes('ukhuwah')) return '/masjid-ukhuwah.jpg';
  return '/masjid-umar.jpg';
};

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [sharedLocation, setSharedLocation] = useState(false);

  const { query: venueQuery, result: refineVenue } = useOne<Venue>({
    resource: 'venues',
    id: id || '',
    queryOptions: { enabled: !!id },
  });

  const { result: schedulesResult } = useList<ScheduleItem>({
    resource: 'schedules',
    filters: [{ field: 'venueId', operator: 'eq', value: id }],
  });

  const mockVenue = MOCK_VENUES.find((v) => v.id === id);
  const rawVenue = refineVenue || mockVenue;
  const venue: Venue | undefined = rawVenue ? { ...rawVenue, image: getVenueImage(rawVenue) } : undefined;
  const isLoading = venueQuery.isLoading;
  const isError = venueQuery.isError;
  const refetch = venueQuery.refetch;

  const apiSchedules = schedulesResult?.data || [];
  const mockSchedules = MOCK_SCHEDULES.filter((s) => s.venueId === id);
  const locationSchedules = apiSchedules.length > 0 ? apiSchedules : mockSchedules;

  const activePrograms: Program[] = MOCK_PROGRAMS.filter((p) => p.venueId === id);

  const handleCopyAddress = async () => {
    if (!venue) return;
    const fullText = `${venue.name}, ${venue.address}, ${venue.city}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareLocation = async () => {
    if (!venue) return;
    const shareData = {
      title: venue.name,
      text: `Lokasi Majelis Kajian ${venue.name} - ${venue.address}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setSharedLocation(true);
        setTimeout(() => setSharedLocation(false), 2500);
      } catch {
        // Fallback
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 space-y-8">
        <SEOHead title="Memuat Detail Lokasi..." />
        <LoadingSkeleton count={1} />
      </div>
    );
  }

  if (isError && !venue) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <SEOHead title="Lokasi Tidak Ditemukan" />
        <ErrorAlert
          message="Gagal memuat informasi lokasi dari server."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <SEOHead title="Lokasi Tidak Ditemukan" />
        <EmptyState
          title="Lokasi Tidak Ditemukan"
          description="Maaf, informasi lokasi masjid yang Anda cari tidak tersedia."
          actionText="Kembali ke Daftar Lokasi"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-16">
      <SEOHead
        title={venue.name}
        description={`Detail lokasi masjid ${venue.name}, alamat, petunjuk Google Maps, dan jadwal kajian rutin.`}
      />

      {/* Venue Header */}
      <section className="bg-stone-900 text-white py-12 sm:py-16 border-b border-stone-800">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-800 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {venue.city || 'Kota Bandung'}, {venue.province || 'Jawa Barat'}
                </span>
                <span className="rounded-md bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-300">
                  Zona WIB (Asia/Jakarta)
                </span>
              </div>

              <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl text-stone-100">
                {venue.name}
              </h1>

              <p className="text-stone-300 text-sm sm:text-base leading-relaxed flex items-start gap-2">
                <MapPin className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {venue.address} {venue.district ? `(${venue.district}, ${venue.city})` : ''}
                </span>
              </p>

              {/* Action Buttons: Google Maps, Copy Address, Share */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                {venue.googleMapsUrl && (
                  <a
                    href={venue.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-colors min-h-[44px] flex items-center gap-2 shadow-md"
                  >
                    <span>Buka Google Maps ↗</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="rounded-xl border border-stone-700 bg-stone-800 px-5 py-3 text-xs font-bold text-stone-200 hover:bg-stone-700 transition-colors min-h-[44px] flex items-center gap-2 cursor-pointer"
                >
                  {copiedAddress ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-300">Alamat Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-stone-400" />
                      <span>Salin Alamat</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareLocation}
                  className="rounded-xl border border-stone-700 bg-stone-800 px-5 py-3 text-xs font-bold text-stone-200 hover:bg-stone-700 transition-colors min-h-[44px] flex items-center gap-2 cursor-pointer"
                >
                  {sharedLocation ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-300">Link Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 text-stone-400" />
                      <span>Bagikan Lokasi</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-stone-700 bg-stone-800 h-52 shadow-xl">
                <img src={venue.image} alt={venue.name} className="h-full w-full object-cover" />
              </div>
              <div className="rounded-2xl border border-stone-700 bg-stone-800/90 p-6 space-y-3.5 text-xs text-stone-300 shadow-xl">
                <h3 className="font-bold text-stone-100 text-sm border-b border-stone-700 pb-2 flex items-center gap-2">
                  <Home className="h-4 w-4 text-emerald-400" /> Informasi Masjid
                </h3>
                {venue.capacity && (
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Kapasitas:</span>
                    <span className="font-semibold text-stone-100">{venue.capacity}</span>
                  </div>
                )}
                {venue.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telepon:</span>
                    <span className="font-semibold text-stone-100">{venue.phone}</span>
                  </div>
                )}
                {venue.postalCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Kode Pos:</span>
                    <span className="font-semibold text-stone-100">{venue.postalCode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Agenda Schedules & Facilities */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Schedules Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-emerald-900" /> Agenda Kajian di Lokasi Ini
              </h2>
              <span className="text-xs text-slate-500 font-medium">WIB (Asia/Jakarta)</span>
            </div>

            {locationSchedules.length === 0 ? (
              <EmptyState title="Belum Ada Agenda Terjadwal di Lokasi Ini" />
            ) : (
              <div className="space-y-4">
                {locationSchedules.map((sch: ScheduleItem) => {
                  const isCancelled = sch.status === 'Dibatalkan';
                  const isRescheduled = sch.status === 'Diundur';
                  const isRelocated = sch.status === 'Pindah Lokasi';

                  return (
                    <div
                      key={sch.id}
                      className={`rounded-2xl border p-5 bg-white shadow-xs space-y-2 transition-all ${
                        isCancelled
                          ? 'border-red-300 bg-red-50/30'
                          : isRescheduled || isRelocated
                          ? 'border-amber-300 bg-amber-50/30'
                          : 'border-stone-200 hover:border-emerald-900/30'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isCancelled && (
                            <span className="rounded-md bg-red-800 px-2.5 py-0.5 text-xs font-extrabold text-white">
                              🚫 DIBATALKAN
                            </span>
                          )}
                          {isRescheduled && (
                            <span className="rounded-md bg-amber-600 px-2.5 py-0.5 text-xs font-extrabold text-white">
                              ⏰ DIUNDUR
                            </span>
                          )}
                          {isRelocated && (
                            <span className="rounded-md bg-orange-600 px-2.5 py-0.5 text-xs font-extrabold text-white">
                              📍 PINDAH LOKASI
                            </span>
                          )}
                          {!isCancelled && !isRescheduled && !isRelocated && (
                            <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                              {sch.category || 'Rutin'}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 font-semibold">{sch.day}, {sch.date}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-md">
                          ⏰ {sch.time || `${sch.startTime} - ${sch.endTime}`} WIB
                        </span>
                      </div>

                      <h3 className={`font-bold text-slate-900 text-base ${isCancelled ? 'line-through text-slate-500' : ''}`}>
                        {sch.title}
                      </h3>

                      {sch.statusReason && (
                        <p className="text-xs text-amber-900 bg-amber-100 p-2.5 rounded-lg border border-amber-200 font-medium">
                          ⚠️ {sch.statusReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Programs Section */}
          {activePrograms.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-stone-200">
              <h3 className="text-xl font-bold text-slate-900">Program Kajian Rutin Lengkap</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activePrograms.map((prog) => (
                  <div key={prog.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm">{prog.title}</h4>
                    <p className="text-xs text-emerald-900 font-semibold">{prog.routineSchedule}</p>
                    <Link
                      to={`/programs/${prog.id}`}
                      className="block text-xs font-bold text-slate-700 hover:text-emerald-900 pt-2"
                    >
                      Lihat Detail Program & Kurikulum →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Facilities */}
        <div className="lg:col-span-4 space-y-6">
          {venue.facilities && venue.facilities.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b border-stone-100 pb-2">Fasilitas Masjid</h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {venue.facilities.map((fac, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>{fac}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
