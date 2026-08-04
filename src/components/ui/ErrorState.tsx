import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Gagal Memuat Data',
  message = 'Terjadi kesalahan sistem saat mengambil data. Silakan coba lagi nanti.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/50 p-8 text-center', className)}>
      <div className="rounded-full bg-red-100 p-3 text-red-600">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-red-950">{title}</h4>
      <p className="mt-1 text-sm text-red-700 max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-5 border-red-300 text-red-900 hover:bg-red-100">
          <RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi
        </Button>
      )}
    </div>
  );
}
