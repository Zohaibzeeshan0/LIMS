import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'navy' | 'teal' | 'emerald' | 'amber' | 'rose' | 'sky';
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const iconBg = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200/50',
    navy: 'bg-navy-50 text-navy-900 border border-navy-200/60',
    teal: 'bg-teal-50 text-teal-700 border border-teal-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200/50',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200/50',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200/50',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-teal-400'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-950">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-semibold inline-flex items-center',
                  trend.isPositive ? 'text-emerald-700' : 'text-rose-600'
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>}
        </div>

        <div className={cn('p-2.5 rounded-xl shrink-0', iconBg[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
