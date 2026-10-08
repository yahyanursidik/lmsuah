import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function MobileNavigationDrawer({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    const media = window.matchMedia('(min-width: 64rem)');
    const resize = () => { if (media.matches) onClose(); };
    media.addEventListener('change', resize);
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
      media.removeEventListener('change', resize);
      trigger?.focus({ preventScroll: true });
    };
  }, [open, onClose]);
  return <dialog ref={ref} aria-label={label} className="navigation-drawer" onCancel={onClose} onClick={event => {
    if (event.target === event.currentTarget || (event.target instanceof Element && event.target.closest('a[href]'))) onClose();
  }}>
    <div className="navigation-drawer-content">
      <button type="button" autoFocus aria-label={`Tutup ${label.toLowerCase()}`} onClick={onClose} className="navigation-drawer-close"><X className="h-5 w-5" aria-hidden="true" /></button>
      {children}
    </div>
  </dialog>;
}
