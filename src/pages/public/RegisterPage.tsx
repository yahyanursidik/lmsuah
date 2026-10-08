import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  ShieldAlert,
  User,
} from 'lucide-react';
import { SEOHead } from '../../components/public/SEOHead';
import { registerParticipant } from '@/lib/userStore';
import { AccessLayout } from '../../components/auth/AccessLayout';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNum, setPhoneNum] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Captcha state
  const [captcha, setCaptcha] = useState(() => ({
    num1: Math.floor(Math.random() * 9) + 1,
    num2: Math.floor(Math.random() * 9) + 1,
  }));
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const regenerateCaptcha = () => {
    setCaptcha({
      num1: Math.floor(Math.random() * 9) + 1,
      num2: Math.floor(Math.random() * 9) + 1,
    });
    setCaptchaAnswer('');
  };

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Strength indicator
  const passwordLengthOk = password.length >= 6;
  const canUseLocalFallback = import.meta.env.DEV;
  

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Alamat email tidak valid.');
      return;
    }
    if (!phoneNum.trim() || phoneNum.length < 8) {
      setErrorMsg('Nomor WhatsApp / HP tidak valid.');
      return;
    }
    if (!passwordLengthOk) {
      setErrorMsg('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }
    
    // Validate Captcha
    if (!captchaAnswer.trim() || parseInt(captchaAnswer) !== captcha.num1 + captcha.num2) {
      setErrorMsg('Jawaban verifikasi keamanan (Captcha) salah.');
      regenerateCaptcha();
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('Anda harus menyetujui ketentuan layanan.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Coba pendaftaran via backend API
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phoneNum.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        setIsSuccess(true);
        setIsLoading(false);
        return;
      }

      const message = data?.error?.message || data?.message || 'Pendaftaran belum berhasil diproses.';
      setErrorMsg(message);
      setIsLoading(false);
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Pendaftaran gagal. Coba beberapa saat lagi.';
      if (!canUseLocalFallback) {
        setErrorMsg(message);
        setIsLoading(false);
        return;
      }
    }

    // 2. Fallback localStore register hanya untuk development/offline demo
    const localRes = registerParticipant({
      name: name.trim(),
      email: email.trim(),
      phone: phoneNum.trim(),
      password,
    });

    setIsLoading(false);

    if (!localRes.success) {
      setErrorMsg(localRes.message || 'Gagal mendaftar.');
      return;
    }

    setIsSuccess(true);
  };

  return (
    <AccessLayout title="Belajar bersama, selangkah demi selangkah." description="Buat akun peserta untuk mengikuti program kajian, menyimpan catatan, dan melihat progres belajar Anda.">
      <SEOHead title="Pendaftaran Peserta Mandiri" description="Daftar dengan email atau Google di Portal Kajian Ustadz Abu Haidar As-Sundawy." />
      <nav className="access-tabs" aria-label="Akses akun"><Link to="/login">Masuk</Link><Link to="/register" aria-current="page">Daftar akun</Link></nav>
              {isSuccess ? (
                <div className="py-8 text-center space-y-5">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">Pendaftaran Berhasil!</h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      Akun Anda atas nama <span className="font-bold text-slate-900">{name}</span> (<span className="text-emerald-800 font-semibold">{email}</span>) telah terdaftar di sistem.
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 text-left space-y-1">
                    <p className="font-bold">Langkah Selanjutnya:</p>
                    <p>Silakan masuk dengan email dan password yang telah Anda buat untuk mengakses dashboard portal peserta.</p>
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-input)] bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      Masuk ke portal <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Selamat bergabung</p>
                    <h2 id="register-form-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Buat akun peserta</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Sudah punya akun? <Link to="/login" className="font-bold text-emerald-800 hover:underline">Masuk</Link>.
                    </p>
                  </div>

                  {errorMsg && (
                    <div role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {errorMsg}
                    </div>
                  )}

                  <div className="mt-5"><GoogleLoginButton disabled={isLoading} onError={setErrorMsg} /><p className="mt-2 text-xs text-[var(--color-ink-2)]">Akun peserta dibuat saat pertama kali masuk dengan Google. Nomor telepon dapat dilengkapi di profil.</p></div>
                  <div className="access-divider" aria-hidden="true">atau daftar dengan email</div>
                  <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* Nama Lengkap */}
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Nama Lengkap *</span>
                      <span className="relative block">
                        <User className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Contoh: Ahmad Abdullah"
                          className="min-h-12 w-full rounded-[var(--radius-input)] border border-stone-300 bg-white pl-10 pr-3.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                        />
                      </span>
                    </label>

                    {/* Email */}
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Alamat Email *</span>
                      <span className="relative block">
                        <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nama@email.com"
                          className="min-h-12 w-full rounded-[var(--radius-input)] border border-stone-300 bg-white pl-10 pr-3.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                        />
                      </span>
                    </label>

                    {/* Nomor WhatsApp / HP */}
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Nomor WhatsApp / Telepon *</span>
                      <span className="relative block">
                        <Phone className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                        <input
                          type="tel"
                          required
                          value={phoneNum}
                          onChange={(e) => setPhoneNum(e.target.value)}
                          placeholder="081234567890"
                          className="min-h-12 w-full rounded-[var(--radius-input)] border border-stone-300 bg-white pl-10 pr-3.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                        />
                      </span>
                    </label>

                    {/* Password */}
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Password *</span>
                      <span className="relative block">
                        <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="min-h-12 w-full rounded-[var(--radius-input)] border border-stone-300 bg-white pl-10 pr-10 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </span>
                    </label>

                    {/* Konfirmasi Password */}
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Konfirmasi Password *</span>
                      <span className="relative block">
                        <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password"
                          className="min-h-12 w-full rounded-[var(--radius-input)] border border-stone-300 bg-white pl-10 pr-3.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                        />
                      </span>
                    </label>

                    {/* Math Captcha */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                      <label className="block space-y-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <ShieldAlert className="h-4 w-4 text-emerald-700" />
                          Verifikasi Keamanan (Anti Robot)
                        </span>
                        <span className="text-xs text-slate-500 block mb-2">Berapa hasil penjumlahan berikut?</span>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-12 items-center justify-center rounded-[var(--radius-input)] border border-stone-300 bg-white px-4 text-lg font-bold text-slate-800 shadow-sm">
                            {captcha.num1} + {captcha.num2} =
                          </div>
                          <input
                            type="number"
                            required
                            value={captchaAnswer}
                            onChange={(e) => setCaptchaAnswer(e.target.value)}
                            placeholder="?"
                            className="h-12 w-24 rounded-[var(--radius-input)] border border-stone-300 bg-white px-4 text-center text-lg font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                          />
                        </div>
                      </label>
                    </div>

                    {/* Syarat & Ketentuan Consent */}
                    <label className="flex items-start gap-3 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-stone-300 accent-emerald-800"
                      />
                      <span className="text-xs leading-5 text-slate-600">
                        Saya menyetujui <Link to="/terms" className="font-semibold text-emerald-800 hover:underline">ketentuan layanan</Link> dan <Link to="/privacy" className="font-semibold text-emerald-800 hover:underline">kebijakan privasi</Link> portal kajian.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-input)] bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                      {isLoading ? 'Mendaftarkan akun…' : 'Daftar Sekarang'}
                    </button>
                  </form>
                </>
              )}
    </AccessLayout>
  );
}
