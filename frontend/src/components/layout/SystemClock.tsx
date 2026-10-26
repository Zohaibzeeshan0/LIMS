'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SystemClockProps {
  className?: string;
  showDate?: boolean;
  showTimezone?: boolean;
  compactOnMobile?: boolean;
  layout?: 'horizontal' | 'stacked';
}

const PLANT_TIMEZONE = 'Asia/Karachi';

// Formatter configurations for cGMP Plant Timezone (PKT, UTC+5)
const timeOptions: Intl.DateTimeFormatOptions = {
  timeZone: PLANT_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
};

const dateOptions: Intl.DateTimeFormatOptions = {
  timeZone: PLANT_TIMEZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const compactDateOptions: Intl.DateTimeFormatOptions = {
  timeZone: PLANT_TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

/**
 * SystemClock Component
 * 
 * Provides an official, real-time cGMP-compliant plant clock synchronized
 * to Asia/Karachi (PKT, UTC+5). Prevents Next.js hydration mismatches
 * and automatically updates every 1000ms with cleanup on unmount.
 */
export function SystemClock({
  className,
  showDate = true,
  showTimezone = true,
  compactOnMobile = true,
  layout = 'horizontal',
}: SystemClockProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    setMounted(true);
    // Real-time ticking every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Formatted Time String (hh:mm:ss AM/PM in PKT)
  const formattedTime = useMemo(() => {
    if (!mounted) {
      return '--:--:-- --';
    }
    try {
      return new Intl.DateTimeFormat('en-US', timeOptions).format(currentTime);
    } catch {
      return currentTime.toLocaleTimeString();
    }
  }, [currentTime, mounted]);

  // Formatted Full Date String (e.g., Thu, 22 Oct 2026 in PKT)
  const formattedDate = useMemo(() => {
    if (!mounted) {
      return '---, -- --- ----';
    }
    try {
      return new Intl.DateTimeFormat('en-GB', dateOptions).format(currentTime);
    } catch {
      return currentTime.toLocaleDateString();
    }
  }, [currentTime, mounted]);

  // Formatted Compact Date String for smaller displays (e.g., 22 Oct 2026)
  const formattedCompactDate = useMemo(() => {
    if (!mounted) {
      return '-- --- ----';
    }
    try {
      return new Intl.DateTimeFormat('en-GB', compactDateOptions).format(currentTime);
    } catch {
      return '';
    }
  }, [currentTime, mounted]);

  // Stacked Layout (Date on top, Time underneath)
  if (layout === 'stacked') {
    return (
      <div
        className={cn(
          'flex flex-col justify-center text-left select-none leading-tight py-0.5',
          className
        )}
        title="City Pharma Official cGMP Plant Time (Asia/Karachi, PKT / UTC+5) • 21 CFR Part 11 Synchronized"
        suppressHydrationWarning
      >
        {/* Top: Date */}
        {showDate && (
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap">
            <Calendar className="h-3 w-3 text-sky-600 shrink-0" />
            <span suppressHydrationWarning className="hidden sm:inline">{formattedDate}</span>
            <span suppressHydrationWarning className="sm:hidden">{formattedCompactDate}</span>
          </div>
        )}

        {/* Bottom: Time with Live Indicator and PKT */}
        <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span
            className="font-mono text-xs sm:text-sm font-bold tracking-tight text-slate-900 tabular-nums"
            suppressHydrationWarning
          >
            {formattedTime}
          </span>
          {showTimezone && (
            <span
              className="px-1 py-0.2 rounded text-[9px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 tracking-wider shrink-0"
              title="Pakistan Standard Time (UTC+5)"
            >
              PKT
            </span>
          )}
        </div>
      </div>
    );
  }

  // Horizontal Pill Layout
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-xl',
        'bg-slate-900/95 text-white border border-slate-700/80 shadow-2xs backdrop-blur-md',
        'transition-all hover:border-slate-600 select-none',
        className
      )}
      title="City Pharma Official cGMP Plant Time (Asia/Karachi, PKT / UTC+5) • 21 CFR Part 11 Synchronized"
      suppressHydrationWarning
    >
      {/* Date Display */}
      {showDate && (
        <>
          {/* Full date with weekday on extra-large screens */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-300 font-medium">
            <Calendar className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span suppressHydrationWarning className="whitespace-nowrap">{formattedDate}</span>
          </div>

          {/* Clean compact date on medium/laptop screens */}
          <div className="hidden sm:flex xl:hidden items-center gap-1 text-[11px] text-slate-300 font-medium">
            <Calendar className="h-3 w-3 text-sky-400 shrink-0" />
            <span suppressHydrationWarning className="whitespace-nowrap">{formattedCompactDate}</span>
          </div>

          {/* Divider */}
          <span className="hidden sm:inline-block h-3.5 w-px bg-slate-700/80" />
        </>
      )}

      {/* Live Pulsing Indicator */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>

      {/* Digital Ticking Clock */}
      <div className="flex items-center gap-1.5">
        <span
          className="font-mono text-xs sm:text-[13px] font-bold tracking-tight text-white tabular-nums whitespace-nowrap"
          suppressHydrationWarning
        >
          {formattedTime}
        </span>
      </div>

      {/* Timezone Badge */}
      {showTimezone && (
        <span
          className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 tracking-wider shrink-0"
          title="Pakistan Standard Time (UTC+5)"
        >
          PKT
        </span>
      )}
    </div>
  );
}

export default SystemClock;
