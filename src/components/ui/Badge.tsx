import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'emerald';
  dot?: boolean;
}

export function Badge({ className, variant = 'default', dot = false, children, ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-hidden';

  const variants = {
    default: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    emerald: 'bg-emerald-600 text-white border border-emerald-700 shadow-2xs',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
    outline: 'text-slate-700 border border-slate-200 bg-white',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200',
  };

  const dotColors = {
    default: 'bg-emerald-500',
    emerald: 'bg-white',
    secondary: 'bg-slate-400',
    outline: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    destructive: 'bg-rose-500',
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      <span>{children}</span>
    </div>
  );
}
