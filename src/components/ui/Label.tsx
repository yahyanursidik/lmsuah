import React from 'react';
import { cn } from '@/lib/utils';

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-sm font-medium leading-none text-slate-700 select-none', className)} {...props}>
      {children}
    </label>
  );
}
