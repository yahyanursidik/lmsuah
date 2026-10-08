import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { startGoogleLogin } from '../../lib/google-auth';

export function GoogleLoginButton({ disabled = false, onError }: { disabled?: boolean; onError: (message: string) => void }) {
  const [pending, setPending] = useState(false);
  const start = async () => {
    if (pending) return;
    setPending(true);
    onError('');
    try {
      await startGoogleLogin();
    } catch (error) {
      onError(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'Login Google belum dapat dihubungi. Periksa koneksi dan coba lagi.');
      setPending(false);
    }
  };
  return <button type="button" className="access-button access-button--google" disabled={disabled || pending} onClick={start} aria-busy={pending}>
    {pending ? <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <span className="google-mark" aria-hidden="true">G</span>}
    {pending ? 'Menghubungkan Google…' : 'Lanjutkan dengan Google'}
  </button>;
}
