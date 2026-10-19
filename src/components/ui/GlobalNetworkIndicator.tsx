import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { getActiveRequestCount, NETWORK_STATUS_EVENT } from '@/providers/dataProvider';
import './portal.css';

export function GlobalNetworkIndicator() {
  const [networkActive, setActive] = useState(() => getActiveRequestCount() > 0);
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = networkActive || fetching > 0 || mutating > 0;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const update = (event: Event) => setActive(Boolean((event as CustomEvent<{ active: boolean }>).detail?.active));
    window.addEventListener(NETWORK_STATUS_EVENT, update);
    setActive(getActiveRequestCount() > 0);
    return () => window.removeEventListener(NETWORK_STATUS_EVENT, update);
  }, []);
  useEffect(() => {
    if (!active) { setSlow(false); return; }
    const timer = window.setTimeout(() => setSlow(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [active]);
  if (!active) return null;
  return <div role="status" aria-live="polite" className="portal-network"><LoaderCircle size={16} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span>{slow ? 'Koneksi memerlukan waktu lebih lama. Data masih dimuat…' : 'Memuat data…'}</span></div>;
}
