export const TARBIYAH_CHANNEL_NAME = 'Tarbiyah Sunnah Channel';
export const TARBIYAH_STREAMS_URL = 'https://www.youtube.com/@TarbiyahSunnahChannel/streams';
export const TARBIYAH_LIVE_URL = 'https://www.youtube.com/tarbiyahsunnahchannel/live';
export type StreamLinkMode = 'auto-streams' | 'auto-live' | 'manual';

export function isSafeStreamUrl(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

/** Only recognized channel defaults are corrected; specific videos and custom
 * channels are never rewritten. No stored records are changed when reading. */
export function getStreamLinkMode(value?: string | null): StreamLinkMode {
  if (!value?.trim()) return 'auto-streams';
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
      !['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname.toLowerCase())) return 'manual';
    const path = url.pathname.replace(/\/+$/, '').toLowerCase();
    if (['/@tarbiyahsunnah', '/@tarbiyahsunnah/live', '/@tarbiyahsunnah/streams', '/@tarbiyahsunnahchannel', '/@tarbiyahsunnahchannel/streams'].includes(path)) return 'auto-streams';
    if (['/@tarbiyahsunnahchannel/live', '/tarbiyahsunnahchannel/live'].includes(path)) return 'auto-live';
  } catch { /* Invalid manual URLs are rejected on save and hidden from readers. */ }
  return 'manual';
}

export function streamUrlForMode(mode: StreamLinkMode, manualUrl = '') {
  if (mode === 'auto-streams') return TARBIYAH_STREAMS_URL;
  if (mode === 'auto-live') return TARBIYAH_LIVE_URL;
  return manualUrl.trim();
}

export function resolveStreamUrl(value?: string | null) {
  const url = streamUrlForMode(getStreamLinkMode(value), value || '');
  return isSafeStreamUrl(url) ? url : undefined;
}

export function scheduleStreamUrl(schedule: { isLiveStream?: boolean | null; streamUrl?: string | null }) {
  return schedule.isLiveStream ? resolveStreamUrl(schedule.streamUrl) : undefined;
}
