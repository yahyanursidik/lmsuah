import { signIn } from './auth-client';
import { readJsonResponse } from './api-response';

export const GOOGLE_CALLBACK_PATH = '/auth/complete';

export function googleLoginError(code: string | null): string | null {
  if (!code) return null;
  if (code === 'access_denied') return 'Login Google dibatalkan. Anda dapat mencoba lagi atau masuk dengan email.';
  if (code === 'account_not_linked') return 'Akun Google belum dapat dihubungkan. Masuk dengan email dan password akun Anda.';
  return 'Login Google belum berhasil. Silakan coba lagi atau masuk dengan email dan password.';
}

export async function startGoogleLogin(): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/providers`, {
    credentials: 'include',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Layanan login Google belum dapat dihubungi. Silakan coba lagi.');
  const providers = await readJsonResponse(response, '/api/auth/providers');
  if (!providers.google) throw new Error('Login Google belum tersedia. Silakan masuk menggunakan email dan password.');

  const { data, error } = await signIn.social({
    provider: 'google',
    callbackURL: new URL(GOOGLE_CALLBACK_PATH, window.location.origin).href,
    errorCallbackURL: new URL('/login', window.location.origin).href,
    disableRedirect: true,
  }, { timeout: 15000 });
  if (error) throw new Error('Login Google belum berhasil dimulai. Silakan coba lagi.');
  if (!data?.url) throw new Error('Tautan login Google tidak tersedia. Silakan coba lagi.');
  const destination = new URL(data.url);
  if (destination.protocol !== 'https:' || destination.hostname !== 'accounts.google.com') {
    throw new Error('Tautan login Google tidak valid. Silakan gunakan email dan password.');
  }
  try { localStorage.removeItem('lms_demo_user'); } catch { /* OAuth also works with storage blocked. */ }
  window.location.assign(destination.href);
}
