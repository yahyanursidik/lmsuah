import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Copy, MapPin, Navigation, Share2 } from 'lucide-react';
import { useList, useOne } from '@refinedev/core';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppImage } from '../../components/ui/AppImage';
import { DiscoveryEmpty, DiscoveryError, DiscoveryHeader, DiscoveryLoading } from '../../components/public/DiscoveryUI';
import { SEOHead } from '../../components/public/SEOHead';
import { getVenueFallbackImage } from '../../lib/image-source';
import {
  agendaDateText, agendaPath, agendaTimeText, detailPath, directoryReturnPath, discoveryPaths, discoveryQueryOptions,
  isActiveVenue, venueMapsHref, type DiscoveryVenue,
} from '../../lib/public-discovery';
import { getUpcomingAgenda } from '../../lib/public-home';
import type { ScheduleItem } from '../../mock/publicData';

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { venues, schedule } = discoveryPaths(location.pathname);
  const back = directoryReturnPath(venues, location.state);
  const [action, setAction] = useState<'copy' | 'share' | null>(null);
  const [feedback, setFeedback] = useState('');

  const { query: venueQuery, result: item } = useOne<DiscoveryVenue>({
    resource: 'venues',
    id: id ? encodeURIComponent(id) : '',
    queryOptions: { ...discoveryQueryOptions, enabled: !!id, retry: false },
  });
  const venue = item && isActiveVenue(item) && (!id || item.id === id || item.slug === id) ? item : undefined;

  const { query: agendaQuery, result: agendaResult } = useList<ScheduleItem>({
    resource: 'schedules',
    filters: venue ? [{ field: 'venueId', operator: 'eq', value: venue.id }] : [],
    pagination: { mode: 'off' },
    queryOptions: { ...discoveryQueryOptions, enabled: !!venue },
  });
  const upcoming = venue ? getUpcomingAgenda((agendaResult.data || []).filter(row => row.venueId === venue.id)).slice(0, 3) : [];
  const address = venue && [venue.address, venue.district, venue.city, venue.postalCode].filter(Boolean).join(', ');
  const map = venue && venueMapsHref(venue, 'directions');
  const notFound = [403, 404].includes(venueQuery.error?.statusCode || 0);

  async function copyAddress() {
    if (!address || action) return;
    setAction('copy');
    setFeedback('');
    try {
      await navigator.clipboard.writeText(address);
      setFeedback('Alamat disalin.');
    } catch {
      setFeedback('Alamat belum tersalin. Pilih dan salin teks alamat secara manual.');
    } finally { setAction(null); }
  }

  async function shareLocation() {
    if (!venue || action) return;
    setAction('share');
    setFeedback('');
    const url = new URL(detailPath('/venues', venue.id), window.location.origin).href;
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: venue.name, url });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(url);
      setFeedback('Tautan lokasi disalin.');
    } catch {
      setFeedback('Tautan belum dapat dibagikan. Salin alamat halaman dari peramban.');
    } finally { setAction(null); }
  }

  return (
    <div className={'public-discovery' + (venues.startsWith('/belajar/') ? ' public-discovery--embedded' : '')}>
      <SEOHead title={venue?.name || 'Detail Lokasi'} description={venue ? 'Alamat dan jadwal kajian di ' + venue.name : undefined} />
      <Link to={back} className="discovery-action discovery-action--text discovery-back"><ArrowLeft size={16} aria-hidden="true" /> Kembali ke lokasi</Link>
      {venueQuery.isLoading ? <DiscoveryLoading label="Memuat lokasi majelis…" /> :
        venueQuery.isError && !notFound && !venue ? (
          <DiscoveryError message="Lokasi majelis belum dapat dimuat." retry={() => void venueQuery.refetch()} retrying={venueQuery.isFetching} />
        ) : !venue ? (
          <DiscoveryEmpty title="Lokasi tidak ditemukan" description="Lokasi mungkin tidak lagi aktif." />
        ) : (
          <>
            <div className="discovery-detail-grid">
              <div className="discovery-section">
                <DiscoveryHeader title={venue.name} />
                {address && <p className="discovery-meta"><MapPin size={17} aria-hidden="true" /> {address}</p>}
                {venue.description && <p className="discovery-prose">{venue.description}</p>}
                <div className="discovery-actions">
                  {map && <a className="discovery-action discovery-action--primary" href={map} target="_blank" rel="noopener noreferrer"
                    aria-label="Petunjuk arah (tab baru)"><Navigation size={16} aria-hidden="true" /> Petunjuk arah</a>}
                  {address && <button type="button" className="discovery-action" aria-disabled={action !== null} onClick={() => void copyAddress()}>
                    <Copy size={16} aria-hidden="true" /> {action === 'copy' ? 'Menyalin…' : 'Salin alamat'}
                  </button>}
                  <button type="button" className="discovery-action" aria-disabled={action !== null} onClick={() => void shareLocation()}>
                    <Share2 size={16} aria-hidden="true" /> {action === 'share' ? 'Membagikan…' : 'Bagikan lokasi'}
                  </button>
                </div>
                {feedback && <p role="status" className="discovery-meta">{feedback}</p>}
                {(venue.facilities?.length > 0 || venue.capacity || venue.phone) && <aside className="discovery-detail-info" aria-label="Informasi masjid">
                  <dl>
                    {venue.facilities?.length > 0 && <div><dt>Fasilitas</dt><dd>{venue.facilities.join(' · ')}</dd></div>}
                    {venue.capacity && <div><dt>Kapasitas</dt><dd>{venue.capacity}</dd></div>}
                    {venue.phone && <div><dt>Telepon</dt><dd>{venue.phone}</dd></div>}
                  </dl>
                </aside>}
              </div>
              <div className="discovery-venue-image discovery-detail-image">
                <AppImage src={venue.image} fallbackSrc={getVenueFallbackImage(venue)} kind="venue" alt={venue.name} loading="eager" />
              </div>
            </div>

            <section className="discovery-section" aria-labelledby="venue-agenda-heading">
              <div className="discovery-section-heading">
                <h2 id="venue-agenda-heading">Agenda mendatang</h2>
                <Link className="discovery-action discovery-action--text" to={agendaPath(schedule, { venueId: venue.id, view: 'semua' })}>
                  <CalendarDays size={16} aria-hidden="true" /> Semua agenda di sini
                </Link>
              </div>
              {agendaQuery.isLoading ? <DiscoveryLoading label="Memuat agenda lokasi…" /> :
                agendaQuery.isError && !upcoming.length ? (
                  <DiscoveryError message="Agenda lokasi belum dapat dimuat." retry={() => void agendaQuery.refetch()} retrying={agendaQuery.isFetching} />
                ) : !upcoming.length ? <DiscoveryEmpty title="Belum ada agenda mendatang di lokasi ini" /> :
                <ul className="discovery-agenda-list">
                  {upcoming.map(row => <li key={row.id} className="discovery-agenda">
                    <p className="discovery-agenda-time">{agendaTimeText(row)}</p>
                    <div className="min-w-0">
                      <p className="discovery-meta">{agendaDateText(row.date)}</p>
                      <h3 className="discovery-item-title">{row.title}</h3>
                      <Link className="discovery-action discovery-action--text" to={agendaPath(schedule, { agenda: row.id })}
                        aria-label={'Detail agenda: ' + row.title}>
                        Detail agenda <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </li>)}
                </ul>}
            </section>
          </>
        )}
    </div>
  );
}
