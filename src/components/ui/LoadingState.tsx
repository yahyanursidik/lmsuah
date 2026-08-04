import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Memuat data...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      {label && <p className="mt-3 text-sm text-slate-500 font-medium">{label}</p>}
    </div>
  );
}
