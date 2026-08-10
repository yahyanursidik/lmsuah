import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { NETWORK_STATUS_EVENT } from '@/providers/dataProvider';

type NetworkStatusDetail = {
  active?: boolean;
  count?: number;
};

export function GlobalNetworkIndicator() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let hideTimer: number | undefined;

    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<NetworkStatusDetail>).detail;
      if (detail?.active) {
        if (hideTimer) window.clearTimeout(hideTimer);
        setIsActive(true);
        return;
      }

      hideTimer = window.setTimeout(() => setIsActive(false), 180);
    };

    window.addEventListener(NETWORK_STATUS_EVENT, handleStatus);
    return () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      window.removeEventListener(NETWORK_STATUS_EVENT, handleStatus);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-3 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-200 bg-white/95 px-3 py-2 text-xs font-bold text-emerald-900 shadow-lg shadow-slate-900/10 backdrop-blur transition duration-200 ${
        isActive ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}
    >
      <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      Memuat data...
    </div>
  );
}
