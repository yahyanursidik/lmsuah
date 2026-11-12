import { ArrowLeft, BookOpen, Clock3, ExternalLink, MapPin, Radio, UserRound } from 'lucide-react';
import { useList, useOne } from '@refinedev/core';
import { Link, useLocation } from 'react-router-dom';
import { TARBIYAH_CHANNEL_NAME, TARBIYAH_LIVE_URL, TARBIYAH_STREAMS_URL } from '../../../shared/schedule-stream';
import {
  DiscoveryChoices, DiscoveryEmpty, DiscoveryError, DiscoveryHeader, DiscoveryLoading, DiscoveryResults, DiscoverySearch, DiscoverySelect,
} from '../../components/public/DiscoveryUI';
import { SEOHead } from '../../components/public/SEOHead';
import {
  AGENDA_VIEWS, agendaDateText, agendaRows, agendaTimeText, detailPath, discoveryPaths, discoveryQueryOptions, isAbuHaidar,
  isAgendaChange, matchesAgendaContext, matchesDiscoverySearch, readAgendaView, useActiveVenueIndex,
  useDiscoveryFilters, usePublishedProgramIndex, validAgendaDate, type DiscoveryProgram, type DiscoveryVenue,
} from '../../lib/public-discovery';
import { getAgendaStream } from '../../lib/public-home';
import type { ScheduleItem } from '../../mock/publicData';

const agendaTypes = [
  { value: '', label: 'Semua' },
  { value: 'Rutin', label: 'Rutin' },
  { value: 'Tematik', label: 'Tematik' },
  { value: 'Special', label: 'Khusus' },
  { value: 'siaran', label: 'Siaran' },
];
const agendaIdFormat = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function AgendaEntry({ item, venue, program, paths, detail }: {
  item: ScheduleItem; venue?: DiscoveryVenue; program?: DiscoveryProgram;
  paths: ReturnType<typeof discoveryPaths>; detail?: string;
}) {
  const stream = getAgendaStream(item);
  const channelDefault = stream === TARBIYAH_STREAMS_URL || stream === TARBIYAH_LIVE_URL;
  const cancelled = item.status === 'Dibatalkan';
  const changed = isAgendaChange(item.status);
  const venueName = venue?.name || item.venueName;
  return <article className="discovery-agenda">
    <div>
      <p className="discovery-meta discovery-agenda-time"><Clock3 size={15} aria-hidden="true" /> {agendaTimeText(item)}</p>
    </div>
    <div className="min-w-0">
      <div className="discovery-agenda-tags">
        {changed && <span className={'discovery-tag ' + (cancelled ? 'discovery-tag--cancelled' : 'discovery-tag--change')}>{item.status}</span>}
        <span className="discovery-tag">{item.type === 'Special' ? 'Khusus' : item.type || item.category || 'Kajian'}</span>
        {item.category && item.type && item.category !== item.type && <span className="discovery-tag">{item.category}</span>}
      </div>
      <h2 className={'discovery-item-title' + (cancelled ? ' line-through' : '')}>
        {detail ? <Link className="discovery-title-link" to={detail}>{item.title}</Link> : item.title}
      </h2>
      <div className="discovery-agenda-where">
        {item.speaker && <p className="discovery-meta"><UserRound size={15} aria-hidden="true" /> {item.speaker}</p>}
        {venueName && <p className="discovery-meta"><MapPin size={15} aria-hidden="true" /> {venueName}</p>}
      </div>
      {program && <p className="discovery-meta"><BookOpen size={15} aria-hidden="true" /> Program: {program.title}</p>}
      {changed && item.statusReason && <p className="discovery-agenda-note"><strong>Catatan {cancelled ? 'pembatalan' : item.status === 'Diundur' ? 'pengunduran' : 'lokasi'}:</strong> {item.statusReason}</p>}
      {stream && <p className="discovery-meta discovery-agenda-note"><Radio size={15} aria-hidden="true" /> {channelDefault ? 'Siaran: ' + TARBIYAH_CHANNEL_NAME : 'Tautan siaran tersedia'}</p>}
      {(program || venue || stream || isAbuHaidar(item.speaker)) && <div className="discovery-actions mt-2">
        {program && <Link className="discovery-action discovery-action--text" to={detailPath(paths.catalog, program.id)}
          aria-label={'Lihat kurikulum: ' + program.title}><BookOpen size={16} aria-hidden="true" /> Kurikulum</Link>}
        {venue && <Link className="discovery-action discovery-action--text" to={detailPath(paths.venues, venue.id)}
          aria-label={'Detail lokasi: ' + venue.name}><MapPin size={16} aria-hidden="true" /> Detail lokasi</Link>}
        {stream && <a className="discovery-action discovery-action--primary" href={stream} target="_blank" rel="noopener noreferrer"
          aria-label="Buka siaran (tab baru)">Buka siaran <ExternalLink size={16} aria-hidden="true" /></a>}
        {isAbuHaidar(item.speaker) && !program && <Link className="discovery-action discovery-action--text" to="/speaker">Profil pemateri</Link>}
      </div>}
    </div>
  </article>;
}

const participantViews = [
  AGENDA_VIEWS[0], { value: 'kajian-saya', label: 'Kajian saya' }, AGENDA_VIEWS[1], AGENDA_VIEWS[2],
];

export function SchedulesPage({ learning }: {
  learning?: { programIds: ReadonlySet<string>; loading: boolean; failed: boolean };
} = {}) {
  const paths = discoveryPaths(useLocation().pathname);
  const { params, change, search, setSearch, reset } = useDiscoveryFilters();
  const agendaId = params.get('agenda')?.toLowerCase();
  const mine = !!learning && !agendaId && params.get('view') === 'kajian-saya';
  const view = readAgendaView(params.get('view'));
  const type = agendaTypes.find(option => option.value === params.get('jenis'))?.value || '';
  const programId = params.get('programId');
  const venueId = params.get('venueId');

  const { result: list, query: listQuery } = useList<ScheduleItem>({
    resource: 'schedules',
    pagination: { mode: 'off' },
    queryOptions: { ...discoveryQueryOptions, enabled: !agendaId },
  });
  const validId = !!agendaId && agendaIdFormat.test(agendaId);
  const { result: exact, query: exactQuery } = useOne<ScheduleItem>({
    resource: 'schedules',
    id: validId ? agendaId : '',
    queryOptions: { ...discoveryQueryOptions, enabled: validId, retry: false },
  });
  const { items: venues } = useActiveVenueIndex();
  const { items: programs } = usePublishedProgramIndex();

  const programById = new Map(programs.map(program => [program.id, program]));
  const venueById = new Map(venues.map(venue => [venue.id, venue]));
  const visible = agendaId ? (validId && exact?.id === agendaId ? [exact] : []) : agendaRows(
    (list.data || []).filter(item =>
      matchesAgendaContext(item, params) &&
      (!mine || !!item.programId && learning.programIds.has(item.programId)) &&
      (!type || (type === 'siaran' ? !!getAgendaStream(item) : item.type === type)) &&
      matchesDiscoverySearch(search, [item.title, item.category, item.speaker, item.venueName,
        venueById.get(item.venueId)?.name, item.programId ? programById.get(item.programId)?.title : undefined])),
    mine ? 'semua' : view,
  );
  const query = agendaId ? exactQuery : listQuery;
  const loading = ((!agendaId || validId) && query.isLoading) || (mine && learning.loading);
  const missing = agendaId && [403, 404].includes(exactQuery.error?.statusCode || 0);
  const scoped = !!programId || !!venueId;
  const filtersActive = scoped || !!search || !!type;
  const withoutAgenda = new URLSearchParams(params);
  withoutAgenda.delete('agenda');
  const back = withoutAgenda.size ? paths.schedule + '?' + withoutAgenda.toString() : paths.schedule;
  function agendaDetail(id: string) {
    const next = new URLSearchParams(params);
    next.set('agenda', id);
    return paths.schedule + '?' + next.toString();
  }

  return (
    <div className={'public-discovery public-discovery--agenda' + (learning ? ' public-discovery--embedded' : '')}>
      <SEOHead title="Jadwal Kajian" description="Jadwal kajian Ustadz Abu Haidar As-Sundawy: waktu, lokasi, perubahan, dan siaran." />
      <DiscoveryHeader title="Jadwal kajian" description="Waktu, tempat, dan siaran kajian."
        actions={<Link className="discovery-action" to={paths.venues}><MapPin size={17} aria-hidden="true" /> Lokasi majelis</Link>} />

      {agendaId ? (
        <Link className="discovery-action discovery-action--text discovery-back" to={back}>
          <ArrowLeft size={16} aria-hidden="true" /> {withoutAgenda.size ? 'Kembali ke daftar agenda' : 'Lihat semua agenda'}
        </Link>
      ) : (
        <div className="discovery-toolbar">
          <DiscoveryChoices label="Tampilan agenda" value={mine ? 'kajian-saya' : view} options={learning ? participantViews : AGENDA_VIEWS}
            onChange={value => change({ view: value === 'mendatang' ? null : value })} />
          <div className="discovery-fields">
            <DiscoverySearch label="Cari agenda" value={search} onChange={setSearch} placeholder="Judul kajian…" />
            <DiscoverySelect label="Jenis agenda" value={type} options={agendaTypes} onChange={value => change({ jenis: value })} />
          </div>
          {scoped && <div className="discovery-context" aria-label="Filter agenda aktif">
            {programId && <span>Program: {programById.get(programId)?.title || 'program terpilih'}</span>}
            {venueId && <span>Lokasi: {venueById.get(venueId)?.name || 'lokasi terpilih'}</span>}
            <button type="button" className="discovery-action discovery-action--text"
              onClick={() => change({ programId: null, venueId: null })}>Hapus filter lokasi/program</button>
          </div>}
        </div>
      )}

      <p className="discovery-meta"><Clock3 size={15} aria-hidden="true" /> Asia/Jakarta (WIB)</p>

      {loading ? <DiscoveryLoading label="Memuat agenda kajian…" /> :
        query.isError && !missing && !visible.length ? (
          <DiscoveryError message="Jadwal kajian belum dapat dimuat." retry={() => void query.refetch()} retrying={query.isFetching} />
        ) : mine && learning.failed && !learning.programIds.size ? (
          <DiscoveryEmpty title="Jadwal kajian saya belum tersedia" description="Muat ulang data belajar atau buka semua agenda.">
            <button type="button" className="discovery-action" onClick={() => change({ view: 'semua' })}>Lihat semua periode</button>
          </DiscoveryEmpty>
        ) : !visible.length ? (
          <DiscoveryEmpty title={agendaId || filtersActive ? 'Agenda tidak ditemukan' : mine ? 'Belum ada agenda kajian yang diikuti' : view === 'mendatang' ? 'Belum ada agenda mendatang' : view === 'perubahan' ? 'Belum ada perubahan jadwal' : 'Belum ada agenda'}
            description={agendaId ? 'Agenda mungkin telah dihapus atau tautannya berubah.' : filtersActive ? 'Coba ubah kata kunci atau lihat agenda pada tampilan lain.' : undefined}>
            {!agendaId && (mine || view !== 'semua') &&
              <button type="button" className="discovery-action" onClick={() => change({ view: 'semua' })}>Lihat semua periode</button>}
            {!agendaId && filtersActive && <button type="button" className="discovery-action discovery-action--text" onClick={reset}>Hapus filter</button>}
          </DiscoveryEmpty>
        ) : (
          <DiscoveryResults items={visible} unit="agenda" page={params.get('page')} showPage={page => change({ page }, true)}>
            {entries => {
              const days = new Map<string, ScheduleItem[]>();
              for (const item of entries) {
                const date = item.date || '';
                const items = days.get(date);
                if (items) items.push(item);
                else days.set(date, [item]);
              }
              return <div className="discovery-ledger">
                {[...days].map(([date, items]) => <div key={date} className="discovery-agenda-day">
                  <p className="discovery-date">
                    {validAgendaDate(date) ? <time dateTime={date}>{agendaDateText(date)}</time> : agendaDateText(date)}
                  </p>
                  <ul className="discovery-agenda-list">
                    {items.map(item => <li key={item.id}>
                      <AgendaEntry item={item} venue={venueById.get(item.venueId)} paths={paths}
                        detail={agendaId ? undefined : agendaDetail(item.id)}
                        program={item.programId ? programById.get(item.programId) : undefined} />
                    </li>)}
                  </ul>
                </div>)}
              </div>;
            }}
          </DiscoveryResults>
        )}
    </div>
  );
}
