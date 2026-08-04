import React from 'react';
import { cn } from '@/lib/utils';

export function Heading1({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn('text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl', className)} {...props}>
      {children}
    </h1>
  );
}

export function Heading2({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl', className)} {...props}>
      {children}
    </h2>
  );
}

export function Heading3({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-slate-900', className)} {...props}>
      {children}
    </h3>
  );
}

export function TextBody({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-slate-700 leading-relaxed sm:text-base', className)} {...props}>
      {children}
    </p>
  );
}

export function TextMuted({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-slate-500 sm:text-sm', className)} {...props}>
      {children}
    </p>
  );
}
