import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'slate';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80 font-medium',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    info: 'bg-sky-50 text-sky-700 border-sky-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    slate: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border transition-colors select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
    case 'RELEASED':
    case 'QUALIFIED':
    case 'WITHIN_SPEC':
    case 'CONCLUDED':
    case 'COMPLETED':
      return <Badge variant="success">{status.replace(/_/g, ' ')}</Badge>;

    case 'REJECTED':
    case 'OUT_OF_SPEC':
    case 'OUT_OF_SERVICE':
      return <Badge variant="danger">{status.replace(/_/g, ' ')}</Badge>;

    case 'QUARANTINE':
    case 'CALIBRATION_DUE':
    case 'PENDING':
    case 'REVIEW_PENDING':
    case 'INVESTIGATING':
    case 'CONDITIONAL':
      return <Badge variant="warning">{status.replace(/_/g, ' ')}</Badge>;

    case 'TESTING_IN_PROGRESS':
    case 'IN_PROGRESS':
    case 'IN_ANALYSIS':
    case 'ASSIGNED':
    case 'SUBMITTED':
    case 'RECEIVED':
      return <Badge variant="info">{status.replace(/_/g, ' ')}</Badge>;

    case 'DRAFT':
    case 'REGISTERED':
      return <Badge variant="slate">{status.replace(/_/g, ' ')}</Badge>;

    case 'CANCELLED':
      return <Badge variant="default">{status.replace(/_/g, ' ')}</Badge>;

    case 'STAT':
    case 'STABILITY':
      return <Badge variant="purple">{status.replace(/_/g, ' ')}</Badge>;

    case 'URGENT':
      return <Badge variant="danger">{status}</Badge>;

    default:
      return <Badge variant="default">{status ? status.replace(/_/g, ' ') : '—'}</Badge>;
  }
}
