import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { Search } from 'lucide-react';
import { MOCK_VENUES, Venue } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';

const getVenueImage = (venue: Pick<Venue, 'id' | 'name' | 'image'>) => {
  if (venue.image?.startsWith('/masjid')) return venue.image;
  if (venue.id.includes('ukhuwah') || venue.name.toLowerCase().includes('ukhuwah')) return '/masjid-ukhuwah.jpg';
  return '/masjid-umar.jpg';
};

export function VenuesPage() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const { result: apiVenues, query: venuesQuery } = useList<Venue>({
    resource: 'venues',
    pagination: { mode: 'off' },
  });

  const apiData = apiVenues?.data || [];
  const isFetched = venuesQuery.isFetched || apiData.length > 0;
  const venuesList = (isFetched ? apiData : (venuesQuery.isError ? MOCK_VENUES : [])) as Venue[];
  const visibleVenues = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return venuesList;
    return venuesList.filter((venue) => [venue.name, venue.address, venue.city, venue.district].some((value) => value?.toLowerCase().includes(needle)));
  }, [query, venuesList]);

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SEOHead
        title="Lokasi Kajian Masjid"
        description="Daftar masjid dan majelis lokasi penyelenggaraan kajian rutin Ustadz Abu Haidar As-Sundawy."
      />

      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Lokasi Kajian & Masjid
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Informasi masjid penyelenggara majelis ilmu rutin dilengkapi fasilitas dan petunjuk arah Google Maps.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between"><label className="relative block w-full sm:max-w-md"><span className="sr-only">Cari lokasi majelis</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, kota, atau alamat…" className="min-h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" /></label><p className="text-xs font-semibold text-slate-500">{venuesQuery.isLoading ? 'Memuat lokasi…' : `${visibleVenues.length} lokasi ditemukan`}</p></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {visibleVenues.map((venue) => (
          <div
            key={venue.id}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs hover:border-emerald-900/30"
          >
            <div className="h-56 overflow-hidden bg-stone-100 relative">
              <img
                src={getVenueImage(venue)}
                alt={venue.name}
                className="h-full w-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-slate-900/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md backdrop-blur-xs">
                {venue.city || 'Kota Bandung'}
              </span>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900">
                    {venue.city || 'Bandung'}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    Kapasitas: {venue.capacity || '1.000 Jamaah'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{venue.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{venue.address}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{venue.description}</p>
              </div>

              <div className="border-t border-stone-100 pt-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {venue.activeKajiansCount || 1} Program Kajian Rutin
                </span>
                <Link
                  to={location.pathname.startsWith('/belajar') ? `/belajar/lokasi/${venue.id}` : `/venues/${venue.id}`}
                  className="rounded-xl bg-emerald-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-950 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Detail Lokasi & Peta →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
