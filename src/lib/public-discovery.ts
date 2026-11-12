import { useList } from '@refinedev/core';
import { useSearchParams } from 'react-router-dom';
import { isSafeStreamUrl } from '../../shared/schedule-stream';
import type { ScheduleItem, Venue } from '../mock/publicData';
import type { PublicProgramSummary } from '../types';
import { getUpcomingAgenda, PUBLIC_SEARCH_LIMIT } from './public-home';

export type DiscoveryProgram = PublicProgramSummary & { status: string; instructor?: string | null };
export type DiscoveryVenue = Venue & {
  status?: string;
  slug?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

// Share fresh index results between the catalog, agenda, directory and profile.
export const discoveryQueryOptions = { staleTime: 30_000, placeholderData: undefined };

export function usePublishedProgramIndex() {
  const { result, query } = useList<DiscoveryProgram>({
    resource: 'programs',
    pagination: { mode: 'off' },
    filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    queryOptions: discoveryQueryOptions,
  });
  return { items: (result.data || []).filter(program => program.status === 'published'), query };
}

export function useActiveVenueIndex() {
  const { result, query } = useList<DiscoveryVenue>({
    resource: 'venues',
    pagination: { mode: 'off' },
    filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    queryOptions: discoveryQueryOptions,
  });
  return { items: (result.data || []).filter(isActiveVenue), query };
}

export function isActiveVenue(venue: DiscoveryVenue) {
  return venue.status == null || venue.status === 'active';
}

export function discoveryPaths(pathname: string) {
  return pathname === '/belajar' || pathname.startsWith('/belajar/')
    ? { catalog: '/belajar/katalog', schedule: '/belajar/jadwal', venues: '/belajar/lokasi' }
    : { catalog: '/programs', schedule: '/schedules', venues: '/venues' };
}

export function detailPath(directory: string, id: string) {
  return directory + '/' + encodeURIComponent(id);
}

export function agendaPath(path: string, filters: { programId?: string; venueId?: string; agenda?: string; view?: string }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.size ? path + '?' + params.toString() : path;
}

export function directoryReturnPath(directory: string, state: unknown) {
  if (state && typeof state === 'object' && 'directory' in state && state.directory === directory &&
    'search' in state && typeof state.search === 'string' && state.search.startsWith('?')) {
    return directory + state.search;
  }
  return directory;
}

export function useDiscoveryFilters() {
  const [params, setParams] = useSearchParams();
  function change(updates: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(params);
    if (!('page' in updates)) next.delete('page');
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace, preventScrollReset: true });
  }
  return {
    params,
    change,
    search: (params.get('q') || '').slice(0, PUBLIC_SEARCH_LIMIT),
    setSearch: (value: string) => change({ q: value.slice(0, PUBLIC_SEARCH_LIMIT) }, true),
    reset: () => setParams({}, { preventScrollReset: true }),
  };
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('id-ID');
}

export function matchesDiscoverySearch(query: string, values: (string | null | undefined)[]) {
  const terms = normalizeText(query).trim().split(/\s+/).filter(Boolean);
  const haystack = normalizeText(values.filter(Boolean).join(' '));
  return terms.every(term => haystack.includes(term));
}

export function isAbuHaidar(instructor?: string | null) {
  const name = normalizeText(instructor || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .replace(/^(?:ustadz?|ustaz)\s+/u, '').replace(/\s+hafizhahullah$/u, '');
  return ['abu haidar as sundawy', 'abu haidar assundawy', 'abu haidar as sundawi', 'abu haidar assundawi'].includes(name);
}

function coordinate(value: string | number | null | undefined, max: number) {
  if (value == null || String(value).trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= max ? number : undefined;
}

export function venueMapsHref(venue: DiscoveryVenue, intent: 'map' | 'directions' = 'map') {
  const manual = venue.googleMapsUrl?.trim();
  if (manual && isSafeStreamUrl(manual)) return manual;
  const lat = coordinate(venue.latitude ?? venue.coordinates?.lat, 90);
  const lng = coordinate(venue.longitude ?? venue.coordinates?.lng, 180);
  const query = lat !== undefined && lng !== undefined
    ? lat + ',' + lng
    : venue.address?.trim() ? [venue.name, venue.address, venue.city].filter(Boolean).join(', ') : '';
  if (!query) return undefined;
  return intent === 'directions'
    ? 'https://www.google.com/maps/dir/?' + new URLSearchParams({ api: '1', destination: query })
    : 'https://www.google.com/maps/search/?' + new URLSearchParams({ api: '1', query });
}

export const isAgendaChange = (status?: ScheduleItem['status']) =>
  status === 'Dibatalkan' || status === 'Diundur' || status === 'Pindah Lokasi';

export const AGENDA_VIEWS = [
  { value: 'mendatang', label: 'Mendatang' },
  { value: 'perubahan', label: 'Perubahan' },
  { value: 'semua', label: 'Semua' },
] as const;
export type AgendaView = typeof AGENDA_VIEWS[number]['value'];

export function readAgendaView(value: string | null): AgendaView {
  return value === 'perubahan' || value === 'semua' ? value : 'mendatang';
}

export function matchesAgendaContext(schedule: { programId?: string | null; venueId?: string | null }, params: URLSearchParams) {
  const programId = params.get('programId');
  const venueId = params.get('venueId');
  return (!programId || schedule.programId === programId) && (!venueId || schedule.venueId === venueId);
}

type AgendaRow = Pick<ScheduleItem, 'id' | 'date' | 'status' | 'startTime' | 'endTime'>;

const fullAgendaDate = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

export function validAgendaDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const day = new Date(date + 'T00:00:00Z');
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === date ? day : undefined;
}

export function agendaDateText(date: string) {
  const day = validAgendaDate(date);
  return day ? fullAgendaDate.format(day) : date?.trim() || 'Tanggal menyusul';
}

export function agendaTimeText(schedule: Pick<ScheduleItem, 'startTime' | 'endTime' | 'time'>) {
  const value = schedule.time?.trim() || [schedule.startTime, schedule.endTime].filter(Boolean).join(' – ');
  return value ? value + (/\bWIB\b/i.test(value) ? '' : ' WIB') : 'Waktu menyusul';
}

export function agendaRows<T extends AgendaRow>(items: readonly T[], view: AgendaView, now = new Date()) {
  if (view === 'mendatang') return getUpcomingAgenda(items, now);
  const visible = view === 'perubahan' ? items.filter(item => isAgendaChange(item.status)) : items;
  // Changes remain discoverable even for cancelled, postponed and legacy undated events.
  const upcoming = getUpcomingAgenda(visible.map(item => ({ ...item, status: undefined })), now);
  const futureOrder = new Map(upcoming.map((item, index) => [item.id, index]));
  return [...visible].sort((a, b) => {
    const ai = futureOrder.get(a.id) ?? Infinity;
    const bi = futureOrder.get(b.id) ?? Infinity;
    if (ai !== bi) return ai - bi;
    return (validAgendaDate(b.date)?.getTime() ?? -Infinity) - (validAgendaDate(a.date)?.getTime() ?? -Infinity)
      || (b.startTime || '').localeCompare(a.startTime || '') || a.id.localeCompare(b.id);
  });
}
