import { useEffect, useSyncExternalStore } from "react";
let uploads = 0;
const listeners = new Set<() => void>();
export const notifyUpload = (change: number) => {
  uploads += change;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function useUploadsPending() {
  const pending = useSyncExternalStore(
    subscribe,
    () => uploads > 0,
    () => false,
  );
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  return pending;
}
