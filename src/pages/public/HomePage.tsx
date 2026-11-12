import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetIdentity, useList } from '@refinedev/core';
import { ArrowRight, CalendarDays, ExternalLink, Search } from 'lucide-react';
import { programCategoryLabel } from '../../../shared/program-category';
import { AppImage } from '../../components/ui/AppImage';
import { SEOHead } from '../../components/public/SEOHead';
import { KnowledgeJourney } from '../../components/public/KnowledgeJourney';
import { getVenueFallbackImage } from '../../lib/image-source';
import { catalogSearchPath, formatAgendaDate, getAgendaStream, getUpcomingAgenda, PUBLIC_SEARCH_LIMIT } from '../../lib/public-home';
import { isAdminRole } from '../../providers/authProvider';
import type { ScheduleItem, Venue } from '../../mock/publicData';
import type { PublicProgramSummary } from '../../types';
import './home-page.css';

type HomeQuery = { isLoading: boolean; isError: boolean; isFetching?: boolean; refetch: () => unknown };

function SectionState({ query, label, empty }: { query: HomeQuery; label: string; empty: string }) {
  if (query.isLoading || (query.isError && query.isFetching)) {
    return <p className="home-state" role="status">Memuat {label}…</p>;
  }
  if (query.isError) {
    return <div className="home-state home-state--error">
      <p role="alert">{label.charAt(0).toUpperCase() + label.slice(1)} belum dapat dimuat.</p>
      <button type="button" className="home-action home-action--outline" onClick={() => void query.refetch()}>Coba lagi</button>
    </div>;
  }
  return <p className="home-state">{empty}</p>;
}

export function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: user } = useGetIdentity<{ id: string; role?: string }>();
  const isAdmin = isAdminRole(user?.role);
  const isParticipant = !!user && !isAdmin;
  const catalog = isParticipant ? '/belajar/katalog' : '/programs';
  const schedulePath = isParticipant ? '/belajar/jadwal' : '/schedules';
  const venuePath = isParticipant ? '/belajar/lokasi' : '/venues';

  const { query: programsQuery, result: programsResult } = useList<PublicProgramSummary>({
    resource: 'programs', pagination: { currentPage: 1, pageSize: 4, mode: 'server' },
    filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    sorters: [{ field: 'updatedAt', order: 'desc' }],
  });
  const { query: schedulesQuery, result: schedulesResult } = useList<ScheduleItem>({
    resource: 'schedules', pagination: { mode: 'off' },
  });
  const { query: venuesQuery, result: venuesResult } = useList<Venue>({
    resource: 'venues', pagination: { mode: 'off' },
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
  });

  const [featured, ...otherPrograms] = (programsResult?.data || []).slice(0, 4);
  const agendas = getUpcomingAgenda(schedulesResult?.data || []).slice(0, 2);
  const venues = venuesResult?.data || [];
  const venueNames = new Map(venues.map(venue => [venue.id, venue.name]));

  function searchPrograms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(catalogSearchPath(catalog, search));
  }

  return (
    <div className="home-page">
      <SEOHead title="Beranda Majelis Ilmu" description="Pelajari kajian kitab dan temukan jadwal majelis Ustadz Abu Haidar As-Sundawy hafizhahullah." />

      <div className="home-lead">
        <section className="home-intro" aria-labelledby="home-title">
          <h1 id="home-title">Belajar kajian,<br className="home-title-break" /> setahap demi setahap.</h1>
          <p className="home-teacher">Bersama Ustadz Abu Haidar As-Sundawy <span>hafizhahullah</span></p>
          <form className="home-search" role="search" onSubmit={searchPrograms}>
            <label className="sr-only" htmlFor="home-search">Cari judul kajian atau kitab</label>
            <input id="home-search" type="search" value={search} onChange={event => setSearch(event.target.value)} maxLength={PUBLIC_SEARCH_LIMIT} placeholder="Judul atau kitab" />
            <button type="submit"><Search size={18} aria-hidden="true" /> Cari</button>
          </form>
          <div className="home-intro-actions">
            <Link className="home-action home-action--solid" to={user ? (isAdmin ? '/admin' : '/dashboard') : catalog}>
              {user ? (isAdmin ? 'Buka portal admin' : 'Lanjut belajar') : 'Jelajahi program'} <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="home-action home-action--link" to={user ? catalog : '/login'}>
              {user ? 'Katalog kajian' : 'Masuk ke ruang belajar'}
            </Link>
          </div>
        </section>

        <section className="home-agenda" aria-labelledby="home-agenda-title">
          <div className="home-agenda-heading">
            <CalendarDays size={22} aria-hidden="true" />
            <h2 id="home-agenda-title">Agenda terdekat</h2>
          </div>
          {agendas.length ? (
            <ul className="home-agenda-list">
              {agendas.map(agenda => {
                const stream = getAgendaStream(agenda);
                const venue = venueNames.get(agenda.venueId) || agenda.venueName;
                return <li key={agenda.id}>
                  <p className="home-meta home-agenda-time">
                    <time dateTime={agenda.date}>{formatAgendaDate(agenda.date)}</time>
                    {agenda.startTime && <span>{agenda.startTime} WIB</span>}
                  </p>
                  <Link className="home-agenda-title" to={`${schedulePath}?${new URLSearchParams({ agenda: agenda.id })}`}>{agenda.title}<ArrowRight size={16} aria-hidden="true" /></Link>
                  {venue && <p className="home-meta">{venue}</p>}
                  {stream && <a href={stream} target="_blank" rel="noopener noreferrer" className="home-action home-action--link">
                    Buka siaran <ExternalLink size={14} aria-hidden="true" />
                  </a>}
                </li>;
              })}
            </ul>
          ) : <SectionState query={schedulesQuery} label="agenda" empty="Belum ada agenda mendatang." />}
          <Link className="home-action home-action--link" to={schedulePath}>Semua jadwal <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      </div>

      <div className="home-learning">
        <section aria-labelledby="home-programs-title">
          <div className="home-section-heading">
            <h2 id="home-programs-title">Program kajian</h2>
            <Link className="home-action home-action--link" to={catalog}>Semua program <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {featured ? (
            <div className="home-programs">
              <Link to={`${catalog}/${encodeURIComponent(featured.id)}`} className="home-featured">
                <AppImage className="home-featured-image" kind="program" src={featured.coverImage} alt={featured.title} />
                <div className="home-featured-body">
                  <p className="home-meta">{programCategoryLabel(featured.category)}</p>
                  <h3>{featured.title}</h3>
                  {featured.bookTitle && featured.bookTitle !== featured.title && <p className="home-meta">{featured.bookTitle}</p>}
                  <span className="home-featured-cta">Lihat kurikulum <ArrowRight size={16} aria-hidden="true" /></span>
                </div>
              </Link>
              {otherPrograms.length > 0 && <ul className="home-program-list">
                {otherPrograms.map(program => <li key={program.id}>
                  <Link to={`${catalog}/${encodeURIComponent(program.id)}`}>
                    <span><strong>{program.title}</strong><span className="home-meta">{programCategoryLabel(program.category)}</span></span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </li>)}
              </ul>}
            </div>
          ) : <SectionState query={programsQuery} label="program kajian" empty="Belum ada program yang diterbitkan." />}
        </section>
        <KnowledgeJourney catalog={catalog} isParticipant={isParticipant} isAdmin={isAdmin} />
      </div>

      <section aria-labelledby="home-venues-title">
        <div className="home-section-heading">
          <h2 id="home-venues-title">Lokasi majelis</h2>
          <Link className="home-action home-action--link" to={venuePath}>Semua lokasi <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {venues.length ? <ul className="home-venues">
          {venues.slice(0, 3).map(venue => <li key={venue.id}>
            <Link to={`${venuePath}/${encodeURIComponent(venue.id)}`}>
              <AppImage className="home-venue-image" kind="venue" src={venue.image} fallbackSrc={getVenueFallbackImage(venue)} alt={venue.name} />
              <span className="home-venue-details"><strong>{venue.name}</strong>{(venue.city || venue.address) && <span className="home-meta">{venue.city || venue.address}</span>}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </li>)}
        </ul> : <SectionState query={venuesQuery} label="lokasi majelis" empty="Belum ada lokasi majelis yang tersedia." />}
      </section>

      <section className="home-profile" aria-labelledby="home-profile-title">
        <AppImage src="/logo-abu-haidar.jpg" kind="brand" alt="" width="52" height="52" className="home-profile-logo" />
        <h2 id="home-profile-title">Ustadz Abu Haidar As-Sundawy</h2>
        <Link className="home-action home-action--link" to="/speaker">Profil pemateri <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
