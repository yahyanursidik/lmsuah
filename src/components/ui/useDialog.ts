import { useCallback, useEffect, useRef } from 'react';

export function useDialog({ open = true, pending = false, dirty = false, onClose }: { open?: boolean; pending?: boolean; dirty?: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ pending, dirty, onClose });
  state.current = { pending, dirty, onClose };
  const close = useCallback(() => {
    if (state.current.pending) return;
    if (state.current.dirty && !window.confirm('Perubahan belum disimpan. Tutup formulir dan abaikan perubahan?')) return;
    state.current.onClose();
  }, []);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const siblings: Array<{ node: HTMLElement; inert: boolean }> = [];
    let current: HTMLElement = dialog;
    while (current.parentElement && current !== document.body) {
      for (const sibling of current.parentElement.children) if (sibling !== current && sibling instanceof HTMLElement) {
        siblings.push({ node: sibling, inert: sibling.inert }); sibling.inert = true;
      }
      current = current.parentElement;
    }
    document.body.style.overflow = 'hidden';
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(node => node.getClientRects().length && !node.closest('[hidden]'));
    const frame = requestAnimationFrame(() => (focusable()[0] || dialog).focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      if (event.key !== 'Tab') return;
      const items = focusable(); const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (state.current.dirty) event.preventDefault(); };
    document.addEventListener('keydown', keydown, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown, true);
      window.removeEventListener('beforeunload', beforeUnload);
      document.body.style.overflow = previousOverflow;
      siblings.forEach(({ node, inert }) => { node.inert = inert; });
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [close, open]);
  return { ref, close };
}
