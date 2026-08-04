import { Lock } from 'lucide-react';
import { Button } from './Button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface UnauthorizedStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function UnauthorizedState({
  title = 'Akses Ditolak',
  message = 'Anda tidak memiliki hak akses (permission) untuk membuka halaman ini.',
  className,
}: UnauthorizedStateProps) {
  return (
    <div className={cn('flex min-h-[60vh] flex-col items-center justify-center p-8 text-center', className)}>
      <div className="rounded-full bg-amber-100 p-4 text-amber-700">
        <Lock className="h-10 w-10" />
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-md">{message}</p>
      <div className="mt-6 flex gap-3">
        <Link to="/">
          <Button variant="primary">Kembali ke Beranda</Button>
        </Link>
        <Link to="/login">
          <Button variant="outline">Ganti Akun</Button>
        </Link>
      </div>
    </div>
  );
}
