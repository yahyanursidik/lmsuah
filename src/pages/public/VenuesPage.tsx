import { Link } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { MOCK_VENUES, Venue } from '../../mock/publicData';
import { SEOHead } from '../../components/public/SEOHead';

const getVenueImage = (v: any) => {
  if (v.image && v.image.startsWith('/masjid')) return v.image;
  if (v.id?.includes('ukhuwah') || v.name?.toLowerCase().includes('ukhuwah')) return '/masjid-ukhuwah.jpg';
  return '/masjid-umar.jpg';
};

export function VenuesPage() {
  const { result: apiVenues } = useList<Venue>({
    resource: 'venues',
  });

  const venuesList = (apiVenues?.data && apiVenues.data.length > 0 ? apiVenues.data : MOCK_VENUES) as Venue[];

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {venuesList.map((venue) => (
          <div
            key={venue.id}
            className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all"
          >
            <div className="h-56 overflow-hidden bg-stone-100 relative">
              <img
                src={getVenueImage(venue)}
                alt={venue.name}
                className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
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
                  to={`/venues/${venue.id}`}
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
