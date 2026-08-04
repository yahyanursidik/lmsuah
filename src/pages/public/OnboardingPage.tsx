import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [agreedTOS, setAgreedTOS] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTOS) {
      setError('Anda harus menyetujui Syarat & Ketentuan');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Simpan consent
      await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType: 'TOS', version: '1.0.0' }),
      });

      // 2. Update profile
      if (name.trim()) {
        await fetch('/api/profile/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
      }

      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal menyelesaikan onboarding');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-slate-900 text-center">Selamat Datang di LMS Kajian YTS</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Lengkapi data profil Anda dan setujui Syarat & Ketentuan untuk melanjutkan.
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Nama Lengkap
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama Anda"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex items-start gap-3 mt-2">
            <input
              id="tos"
              type="checkbox"
              checked={agreedTOS}
              onChange={(e) => setAgreedTOS(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="tos" className="text-sm text-slate-600">
              Saya menyetujui <span className="font-semibold text-slate-900">Syarat & Ketentuan</span> serta <span className="font-semibold text-slate-900">Kebijakan Privasi</span> LMS Kajian YTS.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-emerald-700 py-3 font-semibold text-white transition-all hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Selesaikan Pendaftaran'}
          </button>
        </form>
      </div>
    </div>
  );
}
