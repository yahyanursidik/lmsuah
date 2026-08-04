import React, { useState } from 'react';
import { useLogin } from '@refinedev/core';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { SEOHead } from '../../components/public/SEOHead';

export function LoginPage() {
  const { mutate: login, isPending: isLoading } = useLogin();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!email || !password) {
      setLoginError('Mohon isi email dan password.');
      return;
    }

    login(
      { email, password },
      {
        onSuccess: (data) => {
          if (data?.redirectTo) {
            navigate(data.redirectTo);
          }
        },
        onError: (err: any) => {
          setLoginError(err?.message || 'Gagal masuk. Periksa email & password Anda.');
        },
      }
    );
  };

  const handleDemoAdmin = () => {
    setEmail('admin@abutaidar.id');
    setPassword('admin123');
    setLoginError(null);
    login(
      { email: 'admin@abutaidar.id', password: 'admin123' },
      {
        onSuccess: (data) => {
          if (data?.redirectTo) navigate(data.redirectTo);
        },
      }
    );
  };

  const handleDemoPeserta = () => {
    setEmail('peserta@abutaidar.id');
    setPassword('peserta123');
    setLoginError(null);
    login(
      { email: 'peserta@abutaidar.id', password: 'peserta123' },
      {
        onSuccess: (data) => {
          if (data?.redirectTo) navigate(data.redirectTo);
        },
      }
    );
  };

  const handleGoogleLogin = () => {
    login({ providerName: 'google' });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-stone-100/60">
      <SEOHead
        title="Masuk Akun"
        description="Halaman masuk portal pembelajaran syar'i Ustadz Abu Haidar As-Sundawy hafizhahullah."
      />

      <div className="w-full max-w-md space-y-6">
        
        {/* Main Card */}
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-xl space-y-6">
          
          {/* Header & Logo */}
          <div className="text-center space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-black border border-amber-500/40 p-1 shadow-md">
              <img
                src="/logo-abu-haidar.jpg"
                alt="Logo Ustadz Abu Haidar"
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Masuk Portal Kajian</h1>
              <p className="text-xs text-slate-500 mt-1">
                Ustadz Abu Haidar As-Sundawy (hafizhahullah)
              </p>
            </div>
          </div>

          {/* Quick Demo Login Buttons */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 text-center">
              ⚡ Akses Cepat Mode Demo
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDemoAdmin}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-800/30 bg-emerald-900 px-3 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-950 active:scale-98 transition-all min-h-[44px]"
              >
                <ShieldCheck size={16} className="text-amber-400 shrink-0" />
                <span>Demo Admin</span>
              </button>

              <button
                type="button"
                onClick={handleDemoPeserta}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-100 px-3 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-stone-200 active:scale-98 transition-all min-h-[44px]"
              >
                <UserCheck size={16} className="text-emerald-700 shrink-0" />
                <span>Demo Peserta</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center border-t border-stone-200 pt-2">
            <span className="bg-white px-3 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
              Atau Masuk Akun
            </span>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-xs text-red-700 font-medium">
              ⚠️ {loginError}
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@abutaidar.id atau peserta@abutaidar.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:border-emerald-800 focus:bg-white focus:outline-none transition-all min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-10 py-2.5 text-xs font-medium text-slate-900 focus:border-emerald-800 focus:bg-white focus:outline-none transition-all min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-slate-700 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-950 active:scale-98 transition-all min-h-[44px] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <span>Masuk Akun</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Social Google Login Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-stone-50 transition-all min-h-[44px]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Masuk dengan Google</span>
            </button>
          </div>

          {/* Credentials Info Box */}
          <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 space-y-2 text-[11px] text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              🔑 Kredensial Demo Pengujian:
            </div>
            <div className="space-y-1 font-mono">
              <div className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded border border-stone-200">
                <span>Admin: <strong>admin@abutaidar.id</strong></span>
                <span className="text-stone-400">Pass: admin123</span>
              </div>
              <div className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded border border-stone-200">
                <span>Peserta: <strong>peserta@abutaidar.id</strong></span>
                <span className="text-stone-400">Pass: peserta123</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500">
          <Link to="/" className="font-semibold text-emerald-900 hover:underline">
            ← Kembali ke Beranda Majelis
          </Link>
        </div>

      </div>
    </div>
  );
}
