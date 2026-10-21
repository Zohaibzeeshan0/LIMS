'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth, DEMO_USERS } from '@/context/AuthContext';
import { CityPharmaLogo } from '@/components/ui/CityPharmaLogo';
import {
  Menu,
  Bell,
  User,
  LogOut,
  UserCheck,
  CheckCircle2,
  ChevronDown,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenAccessionModal?: () => void;
}

import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/audit.service';
import { samplingService } from '@/services/sampling.service';
import { Sample } from '@/types/lims';
import { parseAuditItem, FormattedAuditItem } from '@/lib/auditFormatter';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'urgent' | 'warning' | 'info';
  read: boolean;
  link?: string;
  staffName?: string;
  staffRole?: string;
  actionBadge?: string;
  details?: string;
}

const DEFAULT_STAFF_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'default-notif-1',
    title: 'Batch Priority Notice',
    description: 'Sample SMP-0034 | Batch CP-AMX-204 scheduled for release review.',
    timestamp: '2h ago',
    type: 'urgent',
    read: false,
    link: '/samples',
  },
  {
    id: 'default-notif-2',
    title: 'Intake Verification Pending',
    description: 'Sample SMP-0033 | Raw Material Paracetamol awaiting QC intake signoff.',
    timestamp: '5h ago',
    type: 'warning',
    read: false,
    link: '/samples',
  },
];

function NavbarInner({ onToggleSidebar }: NavbarProps) {
  const { user, loginAs, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Stored read alerts in sessionStorage
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem('cp_admin_read_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Query live real-time audit logs from database (refreshes every 5 seconds)
  const { data: rawAuditLogs } = useQuery({
    queryKey: ['navbar-audit-alerts'],
    queryFn: () => auditService.getAll({ limit: 25 }),
    refetchInterval: 5000,
  });

  // Query live active Urgent samples (refreshes every 5 seconds for real-time analyst notification)
  const { data: urgentSamplesRes } = useQuery({
    queryKey: ['navbar-urgent-samples'],
    queryFn: () => samplingService.getAll({ priority: 'URGENT', limit: 20 }),
    refetchInterval: 5000,
  });

  const activeUrgentSamples: Sample[] = React.useMemo(() => {
    if (!urgentSamplesRes) return [];
    if (Array.isArray(urgentSamplesRes)) return urgentSamplesRes;
    if (Array.isArray((urgentSamplesRes as any).data)) return (urgentSamplesRes as any).data;
    return [];
  }, [urgentSamplesRes]);

  // Parse and filter non-admin actions (staff below admin) PLUS Critical & Urgent sample notices
  const nonAdminAlerts: FormattedAuditItem[] = React.useMemo(() => {
    if (!rawAuditLogs) return [];
    const list = Array.isArray(rawAuditLogs) ? rawAuditLogs : (rawAuditLogs as any).data || [];
    return list
      .map(parseAuditItem)
      .filter((item: FormattedAuditItem) =>
        item.isNonAdmin ||
        item.actionRaw.includes('CRITICAL') ||
        item.actionRaw.includes('URGENT') ||
        item.actionRaw.includes('STAT')
      );
  }, [rawAuditLogs]);

  // Notifications for BOTH Analyst and Admin: real-time urgent sample alerts and workflow activity
  const notifications: NotificationItem[] = React.useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Real-time active Urgent samples (dispatched to Analyst and Admin)
    activeUrgentSamples.forEach((sample) => {
      const sampleIdKey = `urgent-${sample.id}`;
      const code = sample.sampleCode || sample.sampleId || 'SMP';
      const name = sample.nomenclature || sample.materialName || 'Product';
      const lot = sample.lotNumber || sample.batchLotNumber || 'N/A';
      list.push({
        id: sampleIdKey,
        title: `⚡ URGENT TESTING (1 Hr - 2 Days SLA)`,
        description: `Sample ${code}: ${name} (Batch: ${lot}) requires expedited analytical testing.`,
        timestamp: 'Active SLA',
        type: 'urgent',
        read: readAlertIds.includes(sampleIdKey),
        link: `/samples?sampleId=${sample.id}`,
        actionBadge: '1 Hr - 2 Days',
      });
    });

    // 2. Audit Trail Events (urgent priority alerts for all, non-admin actions for Admin)
    if (nonAdminAlerts.length > 0) {
      nonAdminAlerts.forEach((item) => {
        const isUrgentAction =
          item.actionRaw.includes('URGENT') ||
          item.actionRaw.includes('CRITICAL') ||
          item.actionRaw.includes('STAT');

        // Non-admin staff receives urgent alerts; Admin receives both urgent alerts and staff activity
        if (!isAdmin && !isUrgentAction) {
          return;
        }

        list.push({
          id: item.id,
          title: item.actionRaw.includes('CRITICAL')
            ? `🚨 CRITICAL (1 Hr - 2 Days SLA): ${item.userName}`
            : item.actionRaw.includes('URGENT')
            ? `⚡ URGENT (1 Hr - 2 Days SLA): ${item.userName}`
            : `${item.userName} (${item.roleBadge.label})`,
          description: `${item.actionLabel.label}: ${item.details}`,
          timestamp: `${item.relativeTime} • ${item.timeDisplay}`,
          type: (isUrgentAction || item.actionRaw.includes('STATUS') || item.actionRaw.includes('UPDATE') ? 'urgent' : 'warning') as 'urgent' | 'warning',
          read: readAlertIds.includes(item.id),
          link: '/samples',
          staffName: item.userName,
          staffRole: item.roleBadge.label,
          actionBadge: item.actionLabel.label,
          details: item.details,
        });
      });
    }

    if (list.length === 0) {
      return [
        {
          id: 'empty-notif',
          title: 'All Systems Normal',
          description: 'No active urgent samples or pending workflow alerts.',
          timestamp: 'Live',
          type: 'info',
          read: true,
          link: '/samples',
        },
      ];
    }

    return list;
  }, [isAdmin, activeUrgentSamples, nonAdminAlerts, readAlertIds]);

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.read && n.id !== 'empty-notif').length;
  }, [notifications]);

  const markAllRead = () => {
    if (isAdmin) {
      const allIds = nonAdminAlerts.map((a) => a.id);
      setReadAlertIds(allIds);
      try {
        sessionStorage.setItem('cp_admin_read_alerts', JSON.stringify(allIds));
      } catch {}
    }
  };

  // Get display name & role title
  const displayName = user?.fullName || 'Muhammad Ali';
  const displayRole = user?.role === 'ADMIN' ? 'Lab Manager' : (user?.role ? user.role.replace(/_/g, ' ') : 'Lab Manager');

  return (
    <header className="sticky top-0 z-40 w-full lg:pl-64 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        
        {/* Left: Hamburger Menu + Page Title matching reference */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Laboratory Information Management System
            </h1>
          </div>
        </div>

        {/* Right: Urgent Alert Pill + Notification Bell + User Profile Avatar */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Active Urgent Alert Pill (Visible at the very top of Navbar) */}
          {activeUrgentSamples.length > 0 && (
            <Link
              href="/samples"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs transition-all cursor-pointer animate-pulse"
              title="Urgent Samples Requiring 1 Hr - 2 Days SLA Testing"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                {activeUrgentSamples.length} Urgent ({activeUrgentSamples.length === 1 ? '1 Hr - 2 Days' : `${activeUrgentSamples.length} Samples`})
              </span>
            </Link>
          )}

          {/* Notification Bell with red badge */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsUserMenuOpen(false);
              }}
              className="relative p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute 0 top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotifOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        {isAdmin ? 'Staff Activity Alerts' : 'Recent Alerts'}
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.link || '#'}
                        onClick={() => {
                          if (isAdmin && !readAlertIds.includes(item.id)) {
                            const updated = [...readAlertIds, item.id];
                            setReadAlertIds(updated);
                            try {
                              sessionStorage.setItem('cp_admin_read_alerts', JSON.stringify(updated));
                            } catch {}
                          }
                          setIsNotifOpen(false);
                        }}
                        className={`block p-2.5 rounded-xl border transition-colors ${
                          item.read
                            ? 'bg-white border-slate-100 hover:bg-slate-50'
                            : 'bg-amber-50/70 border-amber-200/90 hover:bg-amber-100/70 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-xs ${
                                item.read ? 'font-semibold text-slate-800' : 'font-bold text-amber-950'
                              }`}
                            >
                              {item.title}
                            </span>
                            {!item.read && (
                              <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 mt-1 leading-snug">
                          {item.description}
                        </p>
                      </Link>
                    ))}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Laboratory Facility: Central QC Unit</span>
                    <span className="text-blue-600 font-medium">Real-Time Sync</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile Avatar matching Image 1: Blue circle with User icon + Muhammad Ali / Lab Manager */}
          <div className="relative">
            <button
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsNotifOpen(false);
              }}
              className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 leading-tight capitalize">
                  {displayRole}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile & Persona Switcher Dropdown */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Current User Profile
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{user?.fullName || displayName}</p>
                    <p className="text-xs text-slate-500 font-mono">{user?.email || 'admin@citipharma.com'}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      <UserCheck className="h-3 w-3 text-blue-600" />
                      <span>{user?.department || 'Quality Control'} • {user?.employeeId || 'CP-EMP-001'}</span>
                    </div>
                  </div>

                  {/* Switch Persona for Live Testing */}
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                      Profiles
                    </p>
                    <div className="space-y-1">
                      {DEMO_USERS.map((demo) => {
                        const isCurrent = user?.email === demo.email;
                        return (
                          <button
                            key={demo.role}
                            onClick={() => {
                              loginAs(demo.role);
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                              isCurrent
                                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-slate-900">{demo.name}</div>
                              <div className="text-[10px] text-slate-500">{demo.title}</div>
                            </div>
                            {isCurrent && (
                              <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out from Workstation</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

export function Navbar(props: NavbarProps) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 w-full lg:pl-64 bg-white border-b border-slate-200/80 shadow-xs h-16 flex items-center px-4" />
      }
    >
      <NavbarInner {...props} />
    </Suspense>
  );
}
