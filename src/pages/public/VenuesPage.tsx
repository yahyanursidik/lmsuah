import { ArrowRight, CalendarDays, MapPin, Navigation } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AppImage } from '../../components/ui/AppImage';
import {
  DiscoveryEmpty, DiscoveryError, DiscoveryHeader, DiscoveryLoading, DiscoveryResults, DiscoverySearch, DiscoverySelect,
} from '../../components/public/DiscoveryUI';
import { SEOHead } from '../../components/public/SEOHead';
import { getVenueFallbackImage } from '../../lib/image-source';
import {
  agendaPath, detailPath, discoveryPaths, matchesDiscoverySearch, useActiveVenueIndex, useDiscoveryFilters, venueMapsHref,
} from '../../lib/public-discovery';

export function VenuesPage() {
  const location = useLocation();
  const { venues, schedule } = discoveryPaths(location.pathname);
  const { params, change, search, setSearch, reset } = useDiscoveryFilters();
  const city = params.get('kota') || '';
  const { items, query } = useActiveVenueIndex();
  const cities = [...new Set(items.map(venue => venue.city?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
  const cityOptions = [{ value: '', label: 'Semua kota' }, ...cities.map(label => ({ value: label, label }))];
  if (city && !cities.includes(city)) cityOptions.push({ value: city, label: 'Kota pilihan' });

  const visible = items.filter(venue =>
    (!city || venue.city?.trim() === city) && matchesDiscoverySearch(search, [venue.name, venue.address, venue.city, venue.district, venue.province]));
  const filtered = Boolean(city || search);

  return (
    <div className={'public-discovery' + (venues.startsWith('/belajar/') ? ' public-discovery--embedded' : '')}>
      <SEOHead title="Lokasi Majelis" description="Temukan masjid tempat kajian Ustadz Abu Haidar As-Sundawy, jadwal di lokasi, dan petunjuk arah." />
      <DiscoveryHeader title="Lokasi majelis" description="Cari masjid, cek agenda di lokasi, dan buka petunjuk arah."
        actions={<Link className="discovery-action" to={schedule}><CalendarDays size={17} aria-hidden="true" /> Jadwal kajian</Link>} />

      <div className="discovery-fields">
        <DiscoverySearch label="Cari lokasi majelis" value={search} onChange={setSearch} placeholder="Nama masjid atau alamat…" />
        {cities.length > 1 || city ? <DiscoverySelect label="Kota atau kabupaten" value={city} options={cityOptions} onChange={value => change({ kota: value })} /> : null}
      </div>

      {query.isLoading ? <DiscoveryLoading label="Memuat lokasi majelis…" /> :
        query.isError && !items.length ? (
          <DiscoveryError message="Lokasi majelis belum dapat dimuat." retry={() => void query.refetch()} retrying={query.isFetching} />
        ) : !visible.length ? (
          <DiscoveryEmpty title={filtered ? 'Lokasi tidak ditemukan' : 'Belum ada lokasi yang tersedia'}
            description={filtered ? 'Coba nama masjid, kota, atau alamat lain.' : undefined}>
            {filtered && <button type="button" className="discovery-action" onClick={reset}>Hapus filter</button>}
          </DiscoveryEmpty>
        ) : (
          <DiscoveryResults items={visible} unit="lokasi" page={params.get('page')} perPage={9} showPage={page => change({ page }, true)}>
            {entries => <ul className="discovery-venue-list">
              {entries.map(venue => {
                const map = venueMapsHref(venue);
                return <li key={venue.id} className="discovery-venue">
                  <article>
                    <div className="discovery-venue-image">
                      <AppImage src={venue.image} fallbackSrc={getVenueFallbackImage(venue)} alt={venue.name} kind="venue" />
                    </div>
                    <div className="discovery-venue-body">
                      {venue.city && <span className="discovery-tag">{venue.city}</span>}
                      <h2 className="discovery-item-title">{venue.name}</h2>
                      {venue.address && <p className="discovery-meta"><MapPin size={16} aria-hidden="true" /> {venue.address}</p>}
                      <div className="discovery-actions">
                        <Link to={detailPath(venues, venue.id)} state={location.search ? { directory: venues, search: location.search } : undefined}
                          className="discovery-action discovery-action--text" aria-label={'Detail lokasi: ' + venue.name}>
                          Detail lokasi <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                        <Link className="discovery-action" to={agendaPath(schedule, { venueId: venue.id })} aria-label={'Jadwal di ' + venue.name}>
                          <CalendarDays size={16} aria-hidden="true" /> Jadwal
                        </Link>
                        {map && <a className="discovery-action" href={map} target="_blank" rel="noopener noreferrer"
                          aria-label={'Peta: ' + venue.name + ' (tab baru)'}>
                          <Navigation size={16} aria-hidden="true" /> Peta
                        </a>}
                      </div>
                    </div>
                  </article>
                </li>;
              })}
            </ul>}
          </DiscoveryResults>
        )}
    </div>
  );
}
