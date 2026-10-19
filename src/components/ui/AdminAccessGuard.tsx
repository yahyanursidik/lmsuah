import type { ReactNode } from 'react';
import { usePermissions } from '@refinedev/core';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../public/UIStates';
import { getErrorMessage } from '../../lib/error-message';

export function AdminAccessGuard({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, error, refetch } = usePermissions<string | string[]>({});
  if (isLoading) return <p role="status" className="p-6">Memeriksa akses pengelolaan…</p>;
  if (isError) return <ErrorAlert title="Akses belum dapat diperiksa" message={getErrorMessage(error, 'Server belum merespons. Coba periksa akses kembali.')} onRetry={() => void refetch()} />;
  const roles = Array.isArray(data) ? data : [data];
  const allowed = roles.some(role => role && ['admin', 'administrator', 'super_administrator', 'publisher', 'contributor', 'content_contributor', 'reviewer', 'scientific_reviewer'].includes(role));
  if (!allowed) return <main className="mx-auto max-w-xl p-6"><h1 className="text-xl font-bold">Akses pengelolaan tidak tersedia</h1><p className="mt-2">Akun ini tidak memiliki hak pengelolaan konten.</p><Link className="mt-4 inline-flex min-h-11 items-center font-semibold underline" to="/dashboard">Kembali ke ruang belajar</Link></main>;
  return children;
}
