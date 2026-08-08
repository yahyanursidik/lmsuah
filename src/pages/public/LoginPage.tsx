/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * Hallmark · genre: modern-minimal · macrostructure: Split Access · design-system: design.md · designed-as-app
 */
import { useState, type FormEvent } from 'react';
import { useLogin } from '@refinedev/core';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

import { SEOHead } from '../../components/public/SEOHead';

const getLoginError = (error: unknown) =>
  error instanceof Error ? error.message : 'Gagal masuk. Periksa kembali data akun Anda.';

export function LoginPage() {
  const { mutate: login, isPending: isLoading } = useLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const isDemoAvailable = import.meta.env.DEV;

  const completeLogin = (credentials: { email?: string; password?: string; providerName?: string }) => {
    setLoginError(null);
    login(credentials, {
      onSuccess: (data) => {
        if (data?.redirectTo) navigate(data.redirectTo);
      },
      onError: (error: unknown) => setLoginError(getLoginError(error)),
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setLoginError('Email dan password wajib diisi.');
      return;
    }
    completeLogin({ email: email.trim(), password });
  };

  const handleDemoLogin = (role: 'admin' | 'participant') => {
    const credentials = role === 'admin'
      ? { email: 'admin@abutaidar.id', password: 'admin123' }
      : { email: 'peserta@abutaidar.id', password: 'peserta123' };
    setEmail(credentials.email);
    setPassword(credentials.password);
    completeLogin(credentials);
  };

  return (
    <div className="bg-[var(--color-paper)] px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <SEOHead
        title="Masuk Portal Kajian"
        description="Masuk ke portal pembelajaran Ustadz Abu Haidar As-Sundawy hafizhahullah."
      />

      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke beranda
        </Link>

        <div className="grid min-w-0 overflow-hidden rounded-[var(--radius-panel)] border border-stone-200 bg-white shadow-xl lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="relative min-w-0 bg-emerald-950 px-6 py-8 text-white sm:px-10 sm:py-10 lg:flex lg:min-h-[42rem] lg:flex-col lg:justify-between lg:px-12 lg:py-12" aria-labelledby="welcome-title">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src="/logo-abu-haidar.jpg"
                  alt="Logo Kajian Ustadz Abu Haidar"
                  className="h-12 w-12 rounded-xl border border-amber-400/40 object-cover"
                />
                <div>
                  <p className="text-sm font-bold text-white">Portal Kajian UAH</p>
                  <p className="text-xs text-emerald-200">Pembelajaran terstruktur</p>
                </div>
              </div>

              <h1 id="welcome-title" className="mt-10 min-w-0 break-words text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                Lanjutkan perjalanan belajar Anda.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-100/80 sm:text-base">
                Akses program kajian, materi pertemuan, jadwal, dan catatan belajar melalui satu akun.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: BookOpenCheck, title: 'Materi tersusun', text: 'Program dan pertemuan dalam satu alur.' },
                { icon: CalendarDays, title: 'Jadwal terpantau', text: 'Agenda kajian mudah ditemukan kembali.' },
                { icon: MapPin, title: 'Lokasi jelas', text: 'Informasi majelis tersedia sebelum berangkat.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3 border-t border-emerald-800/70 pt-3 lg:border-t-0 lg:pt-0">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-200/70">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="min-w-0 px-5 py-7 sm:px-10 sm:py-10 lg:px-14 lg:py-12" aria-labelledby="login-title">
            <div className="mx-auto max-w-md">
              <div>
                <p className="text-sm font-semibold text-emerald-800">Selamat datang kembali</p>
                <h2 id="login-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Masuk ke akun</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan akun portal atau pilih akses demo untuk melihat pengalaman setiap peran.</p>
              </div>

              {loginError && (
                <div role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nama@contoh.id"
                      className="min-h-12 w-full rounded-[var(--radius-input)] border border-stone-300 bg-stone-50 pl-10 pr-4 text-sm text-slate-950 outline-none placeholder:text-slate-400 hover:border-stone-400 focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={isLoading}
                    />
                  </span>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Password</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Masukkan password"
                      className="min-h-12 w-full rounded-[var(--radius-input)] border border-stone-300 bg-stone-50 pl-10 pr-12 text-sm text-slate-950 outline-none placeholder:text-slate-400 hover:border-stone-400 focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-stone-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-input)] bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  {isLoading ? 'Memeriksa akun…' : 'Masuk ke portal'}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-slate-400" aria-hidden="true">
                <span className="h-px flex-1 bg-stone-200" />
                <span>atau</span>
                <span className="h-px flex-1 bg-stone-200" />
              </div>

              <button
                type="button"
                onClick={() => completeLogin({ providerName: 'google' })}
                disabled={isLoading}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-input)] border border-stone-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 font-bold text-slate-700" aria-hidden="true">G</span>
                Masuk dengan Google
              </button>

              {isDemoAvailable && <div className="mt-7 border-t border-stone-200 pt-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-slate-900">Jelajahi mode demo</h3>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">Pilih peran untuk masuk tanpa mengetik kredensial.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => handleDemoLogin('admin')} disabled={isLoading} className="flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 active:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-55">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Demo admin
                  </button>
                  <button type="button" onClick={() => handleDemoLogin('participant')} disabled={isLoading} className="flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs font-bold text-slate-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 active:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-55">
                    <UserCheck className="h-4 w-4" aria-hidden="true" /> Demo peserta
                  </button>
                </div>
              </div>}

              <p className="mt-7 text-center text-xs leading-5 text-slate-500">
                Dengan masuk, Anda menyetujui <Link to="/terms" className="font-semibold text-emerald-800 hover:underline">ketentuan penggunaan</Link> dan <Link to="/privacy" className="font-semibold text-emerald-800 hover:underline">kebijakan privasi</Link>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
