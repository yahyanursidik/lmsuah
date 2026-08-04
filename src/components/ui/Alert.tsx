import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'destructive';
  title?: string;
}

export function Alert({ className, variant = 'info', title, children, ...props }: AlertProps) {
  const baseStyles = 'relative w-full rounded-lg border p-4 font-sans [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-slate-950';

  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-900 [&>svg]:text-blue-600',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900 [&>svg]:text-emerald-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-900 [&>svg]:text-amber-600',
    destructive: 'bg-red-50 border-red-200 text-red-900 [&>svg]:text-red-600',
  };

  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    destructive: AlertCircle,
  };

  const Icon = icons[variant];

  return (
    <div className={cn(baseStyles, variants[variant], className)} role="alert" {...props}>
      <Icon className="h-5 w-5" />
      {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
