'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  FlaskConical,
  FileText,
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Microscope,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const LABORATORIES = [
  {
    id: 'cephalosporin',
    name: 'Cephalosporin Lab',
    shortLabel: 'Cephalosporin Lab',
    code: 'SAF',
    href: '/samples?lab=cephalosporin',
    icon: Microscope,
  },
  {
    id: 'penicillin',
    name: 'Penicillin Lab',
    shortLabel: 'Penicillin Lab',
    code: 'PENICILLIN',
    href: '/samples?lab=penicillin',
    icon: ShieldAlert,
  },
  {
    id: 'general',
    name: 'General Lab',
    shortLabel: 'General Lab',
    code: 'GENERAL',
    href: '/samples?lab=general',
    icon: FlaskConical,
  },
];

function SidebarInner({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const role = user?.role || 'QC_ANALYST';

  const activeLabQuery = searchParams.get('lab')?.toLowerCase();
  const isOnSamples = pathname.startsWith('/samples');
  const [isSamplingExpanded, setIsSamplingExpanded] = useState(true);

  // Sidebar navigation items
  const menuItems: Array<{
    name: string;
    href: string;
    icon: any;
    adminOnly?: boolean;
    roles?: string[];
    hasSubmenu?: boolean;
    badge?: string;
  }> = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      adminOnly: true,
    },
    {
      name: 'Samples',
      href: '/samples',
      icon: FileText,
      hasSubmenu: true,
      badge: '3 Labs',
    },
  ];

  // Filter items by role so users only see their authorized tools
  const visibleItems = menuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.roles && !item.roles.includes(role) && !isAdmin) return false;
    return true;
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0B1A30]/80 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 lg:z-30 w-64 bg-[#0B1A30] text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 overflow-hidden shadow-2xl border-r border-[#152744]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header — Dark Navy with Citi Pharma Logo + LIMS */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-[#0B1A30]">
          <Link href={isAdmin ? '/' : '/samples'} className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 shrink-0 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/15 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src="/city-pharma-logo.png"
                alt="Citi Pharma Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  Citi Pharma
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0066FF] text-white shadow-2xs">
                  LIMS
                </span>
              </div>
              <span className="text-[11px] text-sky-200/80 font-medium tracking-wide mt-0.5">
                Care to Cure
              </span>
            </div>
          </Link>

          {/* Close button for mobile screens */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto custom-scrollbar">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isDashboard = item.href === '/';
            const isActive = isDashboard
              ? pathname === '/'
              : pathname.startsWith(item.href);

            if (item.name === 'Samples') {
              return (
                <div key={item.name} className="space-y-1">
                  <div
                    onClick={() => setIsSamplingExpanded(!isSamplingExpanded)}
                    className={cn(
                      'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 select-none',
                      isActive
                        ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/25 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'h-4 w-4 transition-colors shrink-0',
                          isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                        )}
                      />
                      <span>Samples</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-slate-300'
                        )}
                      >
                        3 Labs
                      </span>
                      {isSamplingExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-white/80" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-white/80" />
                      )}
                    </div>
                  </div>

                  {/* 3 Laboratory Sub-items */}
                  {isSamplingExpanded && (
                    <div className="pl-3.5 space-y-1 py-1 border-l border-white/15 ml-4 animate-in fade-in duration-150">
                      {LABORATORIES.map((lab) => {
                        const LabIcon = lab.icon;
                        const isLabActive =
                          isOnSamples &&
                          (activeLabQuery === lab.id ||
                            (lab.id === 'cephalosporin' &&
                              (activeLabQuery === 'cephalosporin' ||
                                activeLabQuery === 'saf' ||
                                activeLabQuery === 'sef' ||
                                activeLabQuery === 'cp')) ||
                            (!activeLabQuery && lab.id === 'general'));

                        return (
                          <Link
                            key={lab.id}
                            href={lab.href}
                            onClick={() => onClose && onClose()}
                            className={cn(
                              'group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                              isLabActive
                                ? 'bg-white/20 text-white font-bold border border-white/25 shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <LabIcon
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0',
                                  isLabActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-blue-300'
                                )}
                              />
                              <span className="truncate">{lab.name}</span>
                            </div>
                          </Link>
                        );
                      })}

                      <Link
                        href="/samples?lab=all"
                        onClick={() => onClose && onClose()}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] transition-colors',
                          isOnSamples && activeLabQuery === 'all'
                            ? 'text-white font-bold bg-white/20'
                            : 'text-slate-400 hover:text-white'
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>All Samples Registry</span>
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose && onClose()}
                className={cn(
                  'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors shrink-0',
                      isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>

      </aside>
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <aside className="fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B1A30] border-r border-[#152744]" />
      }
    >
      <SidebarInner {...props} />
    </Suspense>
  );
}

export default Sidebar;
