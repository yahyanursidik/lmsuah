import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ElementType;
  className?: string;
}

export function EmptyState({
  title = 'Belum Ada Data',
  description = 'Tidak ada informasi atau materi yang tersedia saat ini.',
  actionLabel,
  onAction,
  icon: Icon = FolderOpen,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-8 text-center bg-slate-50/50', className)}>
      <div className="rounded-full bg-slate-100 p-3 text-slate-400">
        <Icon className="h-8 w-8" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
