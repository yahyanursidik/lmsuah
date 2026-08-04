import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-6xl font-extrabold text-slate-900">404</h1>
      <p className="mt-4 text-lg text-slate-600">Halaman yang Anda cari tidak ditemukan.</p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
