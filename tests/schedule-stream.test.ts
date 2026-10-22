// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getStreamLinkMode, isSafeStreamUrl, resolveStreamUrl, scheduleStreamUrl, streamUrlForMode, TARBIYAH_LIVE_URL, TARBIYAH_STREAMS_URL } from '../shared/schedule-stream';

describe('Schedule broadcast links', () => {
  it.each([undefined, null, '', 'https://youtube.com/@TarbiyahSunnah', 'https://www.youtube.com/@tarbiyahSUnnah/', 'https://www.youtube.com/@TarbiyahSunnahChannel/streams'])('corrects automatic/legacy default %s without reading or writing a database', value => {
    expect(getStreamLinkMode(value)).toBe('auto-streams');
    expect(resolveStreamUrl(value)).toBe(TARBIYAH_STREAMS_URL);
  });
  it.each([TARBIYAH_LIVE_URL, 'https://www.youtube.com/@TarbiyahSunnahChannel/live'])('recognizes live mode %s', value => {
    expect(getStreamLinkMode(value)).toBe('auto-live');
    expect(resolveStreamUrl(value)).toBe(TARBIYAH_LIVE_URL);
  });
  it.each(['https://www.youtube.com/watch?v=fixture', 'https://youtu.be/fixture', 'https://example.test/broadcast', 'https://www.youtube.com/@AnotherChannel/live', 'https://www.youtube.com/@TarbiyahSunnahChannel/streams?fixture=1'])('preserves explicit manual link %s', value => {
    expect(getStreamLinkMode(value)).toBe('manual');
    expect(resolveStreamUrl(value)).toBe(value);
  });
  it.each(['javascript:alert(1)', 'data:text/html,fixture', 'ftp://example.test/live', '/relative', 'not-a-url', 'https://user:password@example.test/live'])('rejects unsafe/malformed URL %s', value => {
    expect(isSafeStreamUrl(value)).toBe(false);
    expect(resolveStreamUrl(value)).toBeUndefined();
  });
  it('does not show inactive live links or overwrite manual drafts when changing modes', () => {
    expect(scheduleStreamUrl({ isLiveStream: false, streamUrl: TARBIYAH_STREAMS_URL })).toBeUndefined();
    expect(scheduleStreamUrl({ isLiveStream: true })).toBe(TARBIYAH_STREAMS_URL);
    expect(streamUrlForMode('manual', ' https://example.test/live ')).toBe('https://example.test/live');
    expect(streamUrlForMode('auto-live', 'https://example.test/live')).toBe(TARBIYAH_LIVE_URL);
  });
});
