import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'emerald';
  dot?: boolean;
}

export function Badge({ className, variant = 'default', dot = false, children, ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-hidden';

  const variants = {
    default: 'bg-emerald-900/10 text-emerald-900 border border-emerald-900/20',
    emerald: 'bg-emerald-800 text-white border border-emerald-700 shadow-xs',
    secondary: 'bg-stone-100 text-stone-800 border border-stone-200/80',
    outline: 'text-slate-800 border border-slate-300 bg-white/50',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    destructive: 'bg-rose-50 text-rose-800 border border-rose-200',
  };

  const dotColors = {
    default: 'bg-emerald-700',
    emerald: 'bg-emerald-300',
    secondary: 'bg-stone-500',
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
