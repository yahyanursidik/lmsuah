import type { ScheduleItem } from '../mock/publicData';
import { scheduleStreamUrl } from '../../shared/schedule-stream';

const wibClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const agendaDateLabel = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric', month: 'short',
});

function parseAgendaDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return undefined;
  return parsed;
}

function validTime(time?: string): time is string {
  return !!time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function getUpcomingAgenda<T extends Pick<ScheduleItem, 'id' | 'date' | 'status' | 'startTime' | 'endTime'>>(schedules: readonly T[], now = new Date()) {
  const parts = Object.fromEntries(wibClock.formatToParts(now).map(({ type, value }) => [type, value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;

  return schedules.filter(schedule => {
    if (!parseAgendaDate(schedule.date) || schedule.status === 'Dibatalkan' || schedule.status === 'Diundur') return false;
    return schedule.date > today || (schedule.date === today &&
      (!validTime(schedule.endTime) || schedule.endTime > time));
  }).sort((a, b) => a.date.localeCompare(b.date) ||
    (a.startTime || '24:00').localeCompare(b.startTime || '24:00') || a.id.localeCompare(b.id));
}

export function formatAgendaDate(date: string) {
  const parsed = parseAgendaDate(date);
  return parsed ? agendaDateLabel.format(parsed) : date;
}

export function getAgendaStream(schedule: { status?: ScheduleItem['status']; isLiveStream?: boolean | null; streamUrl?: string | null }) {
  return schedule.status === 'Dibatalkan' || schedule.status === 'Diundur' ? undefined : scheduleStreamUrl(schedule);
}

export const PUBLIC_SEARCH_LIMIT = 120;

export function catalogSearchPath(catalog: string, query: string) {
  const value = query.trim().slice(0, PUBLIC_SEARCH_LIMIT);
  return value ? `${catalog}?${new URLSearchParams({ q: value })}` : catalog;
}
