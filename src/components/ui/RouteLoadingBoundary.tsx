import { Component, Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

class RouteErrorBoundary extends Component<{ path: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: { path: string }) {
    if (this.state.failed && previous.path !== this.props.path) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) return <div role="alert" className="mx-auto max-w-xl p-6"><h1 className="text-xl font-bold">Halaman belum dapat dimuat</h1><p className="mt-2 text-sm">Periksa koneksi lalu muat ulang. Data yang sudah tersimpan tidak dihapus.</p><button className="mt-4 min-h-11 rounded-lg border px-4 font-semibold" onClick={() => window.location.reload()}>Muat ulang halaman</button></div>;
    return this.props.children;
  }
}
export function RouteLoadingBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <RouteErrorBoundary path={location.pathname}><Suspense fallback={<p role="status" className="p-6 text-sm text-slate-600">Memuat halaman…</p>}>{children}</Suspense></RouteErrorBoundary>;
}
