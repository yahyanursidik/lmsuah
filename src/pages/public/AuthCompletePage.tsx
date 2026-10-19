import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import { readJsonResponse } from '../../lib/api-response';
import { hasAdminRole, unwrapAuthMePayload } from '../../providers/authProvider';
import { AccessLayout } from '../../components/auth/AccessLayout';

export function AuthCompletePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const finish = async () => {
      setError(null);
      try {
        const { data: session } = await authClient.getSession({ fetchOptions: { signal: controller.signal, timeout: 15000 } });
        if (controller.signal.aborted) return;
        if (!session?.user) throw new Error('Sesi Google belum tersedia. Silakan kembali dan ulangi login.');
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, {
          credentials: 'include', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (!response.ok) throw new Error('Informasi akun belum dapat dimuat. Silakan coba lagi.');
        const account = unwrapAuthMePayload(await readJsonResponse(response, '/api/auth/me'));
        if (!account.user || !account.roles?.length) throw new Error('Profil akun belum siap. Silakan coba lagi.');
        if (controller.signal.aborted) return;
        navigate(hasAdminRole(account.roles) ? '/admin' : '/dashboard', { replace: true });
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Login belum dapat diselesaikan. Silakan coba lagi.');
      }
    };
    void finish();
    return () => controller.abort();
  }, [navigate, attempt]);
  return <AccessLayout title="Selamat datang di ruang belajar." description="Kami sedang menyiapkan portal sesuai akun Anda.">
    <h2>{error ? 'Akun belum dapat dibuka' : 'Menyiapkan portal Anda'}</h2>
    {error ? <><p role="alert" className="access-error">{error}</p><button type="button" className="access-button mt-5" onClick={() => setAttempt(value => value + 1)}>Coba lagi</button><Link className="mt-4 inline-flex min-h-11 items-center text-sm underline" to="/login">Kembali ke halaman masuk</Link></> : <p role="status" className="mt-5 flex items-center gap-3 text-sm"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Memeriksa sesi dan akses akun…</p>}
  </AccessLayout>;
}
