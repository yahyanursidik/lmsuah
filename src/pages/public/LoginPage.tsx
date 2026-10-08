/* Hallmark · pre-emit critique: P4 H5 E4 S5 R5 V4 · design-system: design.md */
import { useState, type FormEvent } from 'react';
import { useLogin } from '@refinedev/core';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserCheck } from 'lucide-react';
import { SEOHead } from '../../components/public/SEOHead';
import { AccessLayout } from '../../components/auth/AccessLayout';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';
import { googleLoginError } from '../../lib/google-auth';

function getLoginError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Gagal masuk. Periksa kembali email dan password Anda.';
}

export function LoginPage() {
  const { mutate: login, isPending: isLoading } = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(() => googleLoginError(params.get('error')));
  const [capsLock, setCapsLock] = useState(false);

  const completeLogin = (credentials: { email: string; password: string }) => {
    setLoginError(null);
    login(credentials, {
      onSuccess: (data) => {
        if (!data?.success) { setLoginError(getLoginError(data?.error)); return; }
        navigate(data.redirectTo || '/dashboard', { replace: true });
      },
      onError: (error: unknown) => setLoginError(getLoginError(error)),
    });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) { setLoginError('Email dan password wajib diisi.'); return; }
    completeLogin({ email: email.trim(), password });
  };
  const demo = (role: 'admin' | 'participant') => {
    const credentials = role === 'admin'
      ? { email: 'admin@abutaidar.id', password: 'admin123' }
      : { email: 'peserta@abutaidar.id', password: 'peserta123' };
    setEmail(credentials.email); setPassword(credentials.password); completeLogin(credentials);
  };

  return <AccessLayout title="Mari lanjutkan belajar bersama." description="Program kajian, materi pertemuan, dan catatan belajar Anda ada di sini. Masuk untuk melanjutkan dari pertemuan terakhir.">
    <SEOHead title="Masuk Portal Kajian" description="Masuk dengan email atau akun Google ke Portal Kajian Ustadz Abu Haidar As-Sundawy." />
    <nav className="access-tabs" aria-label="Akses akun"><Link to="/login" aria-current="page">Masuk</Link><Link to="/register">Daftar akun</Link></nav>
    <h2>Masuk ke akun</h2>
    <p className="mt-2 mb-6 text-sm text-[var(--color-ink-2)]">Gunakan akun Google atau email yang sudah terdaftar.</p>
    <GoogleLoginButton disabled={isLoading} onError={setLoginError} />
    <div className="access-divider" aria-hidden="true">atau dengan email</div>
    {loginError && <div id="login-error" role="alert" className="access-error">{loginError}</div>}
    <form onSubmit={submit} className="mt-4 space-y-4" aria-busy={isLoading}>
      <label className="block space-y-2">
        <span className="text-sm font-semibold">Email</span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-2)]" aria-hidden="true" />
          <input type="email" autoComplete="username" required value={email} onChange={event => { setEmail(event.target.value); setLoginError(null); }} placeholder="nama@contoh.id" aria-describedby={loginError ? 'login-error' : undefined} className="min-h-12 w-full rounded-[var(--radius-input)] border border-[var(--color-rule)] pl-10 pr-4 text-sm placeholder:text-[var(--color-ink-2)]" />
        </span>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold">Password</span>
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-2)]" aria-hidden="true" />
          <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => { setPassword(event.target.value); setLoginError(null); }} onKeyUp={event => setCapsLock(event.getModifierState('CapsLock'))} onBlur={() => setCapsLock(false)} placeholder="Password akun Anda" aria-describedby={capsLock ? 'caps-lock-hint' : loginError ? 'login-error' : undefined} className="min-h-12 w-full rounded-[var(--radius-input)] border border-[var(--color-rule)] pl-10 pr-12 text-sm placeholder:text-[var(--color-ink-2)]" />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPassword} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-ink-2)]">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>
      {capsLock && <p id="caps-lock-hint" role="status" className="text-sm text-[var(--color-ink-2)]">Caps Lock aktif. Periksa huruf besar pada password.</p>}
      <button type="submit" className="access-button" disabled={isLoading}>
        {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        {isLoading ? 'Memeriksa akun…' : 'Masuk ke portal'}
      </button>
    </form>
    <p className="mt-5 text-sm text-[var(--color-ink-2)]">Belum punya akun? <Link to="/register" className="font-semibold text-[var(--color-accent)] underline underline-offset-4">Daftar peserta</Link></p>
    {import.meta.env.DEV && <details className="mt-6 border-t border-[var(--color-rule)] pt-4">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">Mode demo pengembangan</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => demo('admin')} disabled={isLoading} className="access-button access-button--google"><ShieldCheck className="h-4 w-4" />Demo admin</button>
        <button type="button" onClick={() => demo('participant')} disabled={isLoading} className="access-button access-button--google"><UserCheck className="h-4 w-4" />Demo peserta</button>
      </div>
    </details>}
    <p className="mt-6 text-xs text-[var(--color-ink-2)]">Dengan masuk, Anda menyetujui <Link to="/terms" className="underline underline-offset-2">ketentuan penggunaan</Link> dan <Link to="/privacy" className="underline underline-offset-2">kebijakan privasi</Link>.</p>
  </AccessLayout>;
}
