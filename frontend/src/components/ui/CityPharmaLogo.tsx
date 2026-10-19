'use client';

import React, { useState } from 'react';

export interface CityPharmaLogoProps {
  /**
   * Layout display variant:
   * - 'full': Mark + "Citi Pharma" title + "Care to Cure" tagline
   * - 'compact': Mark + "Citi Pharma" + "LIMS" badge
   * - 'mark-only': Just the circular brand mark
   * - 'print': Specialized high-contrast layout for official printable dossiers
   */
  variant?: 'full' | 'compact' | 'mark-only' | 'print';
  /**
   * Size presets:
   * - 'sm': 32px mark
   * - 'md': 42px mark (standard for sidebar/navbar)
   * - 'lg': 52px mark (standard for login screen)
   * - 'xl': 64px mark
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Color theme:
   * - 'light': Dark text on light surface
   * - 'dark': Crisp white text on dark navy surface
   */
  theme?: 'light' | 'dark';
  /**
   * Optional custom image source for official uploaded asset.
   */
  src?: string;
  /**
   * Optional custom subtitle or tagline override
   */
  subtitle?: string;
  /**
   * Additional className
   */
  className?: string;
}

/**
 * Clean SVG Emblem matching official Citi Pharma mark
 * (Dual gradient swooshes forming a circular seal)
 */
export function CityPharmaEmblem({
  size = 42,
  className = '',
  isPrint = false,
}: {
  size?: number;
  className?: string;
  isPrint?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="Citi Pharma Brand Mark"
    >
      <defs>
        <linearGradient id="citiBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A3E0" />
          <stop offset="100%" stopColor="#0066B2" />
        </linearGradient>
        <linearGradient id="citiGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A859" />
          <stop offset="100%" stopColor="#007A3D" />
        </linearGradient>
      </defs>

      {/* Left Blue Swoosh */}
      <path
        d="M 48 10 C 24 10 10 28 10 50 C 10 72 24 90 48 90 C 32 80 24 66 24 50 C 24 34 32 20 48 10 Z"
        fill={isPrint ? '#0f172a' : 'url(#citiBlueGrad)'}
      />

      {/* Right Green Swoosh */}
      <path
        d="M 52 10 C 76 10 90 28 90 50 C 90 72 76 90 52 90 C 68 80 76 66 76 50 C 76 34 68 20 52 10 Z"
        fill={isPrint ? '#0f172a' : 'url(#citiGreenGrad)'}
      />

      {/* Center Medical Diamond / Sparkle */}
      <circle cx="50" cy="50" r="6" fill={isPrint ? '#0f172a' : '#0066B2'} />
    </svg>
  );
}

/**
 * CityPharmaLogo
 * Official brand logo component matching exact Citi Pharma brand standards:
 * - "Citi Pharma" typography
 * - "Care to Cure" tagline
 * - Supports official image /images/city-pharma-logo.png seamlessly
 * - Supports theme="dark" for dark navy sidebar and theme="light" for light panels
 */
export function CityPharmaLogo({
  variant = 'compact',
  size = 'md',
  theme = 'light',
  src,
  subtitle,
  className = '',
}: CityPharmaLogoProps) {
  const candidateSrc = src || '/images/city-pharma-logo.png';
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    sm: { markSize: 32, textClass: 'text-sm', subClass: 'text-[9px]' },
    md: { markSize: 42, textClass: 'text-base', subClass: 'text-[10px]' },
    lg: { markSize: 52, textClass: 'text-xl', subClass: 'text-xs' },
    xl: { markSize: 64, textClass: 'text-2xl', subClass: 'text-sm' },
  };

  const { markSize, textClass, subClass } = sizeMap[size] || sizeMap.md;
  const isPrint = variant === 'print';
  const isDark = theme === 'dark';

  const renderMark = () => {
    if (!imageError) {
      return (
        <div
          className="relative shrink-0 flex items-center justify-center overflow-hidden"
          style={{ width: markSize, height: markSize }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={candidateSrc}
            alt="Citi Pharma Brand Mark"
            className="w-full h-full object-contain drop-shadow-xs"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    return (
      <CityPharmaEmblem
        size={markSize}
        isPrint={isPrint}
        className="transition-transform duration-200 group-hover:scale-102"
      />
    );
  };

  if (variant === 'mark-only') {
    return <div className={`inline-flex items-center ${className}`}>{renderMark()}</div>;
  }

  if (variant === 'print') {
    return (
      <div className={`flex items-center gap-3.5 ${className}`}>
        {renderMark()}
        <div className="flex flex-col">
          <span className="font-black text-xl tracking-tight text-slate-900 font-sans">
            Citi Pharma
          </span>
          <span className="text-xs font-semibold text-teal-800 tracking-wide font-sans">
            {subtitle || 'Care to Cure'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Laboratory Information Management System • 21 CFR Part 11 Compliant
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {renderMark()}
      <div className="flex flex-col leading-tight min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`font-black tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            } ${textClass}`}
          >
            Citi Pharma
          </span>
          <span
            className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${
              isDark
                ? 'bg-blue-900/60 text-blue-200 border-blue-700/60'
                : 'bg-blue-50 text-blue-700 border-blue-200/80'
            }`}
          >
            LIMS
          </span>
        </div>

        <p
          className={`font-medium tracking-wide mt-0.5 truncate ${
            isDark ? 'text-blue-200/80' : 'text-slate-500'
          } ${subClass}`}
        >
          {subtitle || 'Care to Cure'}
        </p>
      </div>
    </div>
  );
}

export default CityPharmaLogo;
