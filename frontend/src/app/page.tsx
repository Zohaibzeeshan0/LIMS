'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { samplingService } from '@/services/sampling.service';
import { auditService } from '@/services/audit.service';
import { parseAuditItem, FormattedAuditItem } from '@/lib/auditFormatter';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { cn } from '@/lib/utils';
import {
  formatLiveDate,
  formatShortLiveDate,
  formatLiveClock,
  getRecentDays,
} from '@/lib/date';
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Calendar,
  ChevronDown,
  GitBranch,
  Target,
  Bell,
  Check,
  Eye,
  QrCode,
  FileEdit,
  Lock,
  ArrowRight,
  TrendingUp,
  Radio,
  Boxes,
  Microscope,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Live real-time clock state (updates every second)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedRangeKey, setSelectedRangeKey] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [activeDateRange, setActiveDateRange] = useState<string>('');

  useEffect(() => {
    setActiveDateRange(formatLiveDate(new Date()));
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // RBAC: Dashboard access is strictly reserved for ADMIN (Lab Manager / Administrator).
  // Other personnel (QC Analyst, Lab Technician, QA Manager, Auditor) are automatically directed to their assigned workspace.
  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.replace('/samples');
    }
  }, [user, authLoading, router]);

  if (!authLoading && user && user.role !== 'ADMIN') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200 shadow-xs">
          <Lock className="h-7 w-7" />
        </div>
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider mb-2">
          Role-Based Access Policy
        </span>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Executive Dashboard Restricted
        </h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
          The Executive Analytics Dashboard is reserved for Laboratory Administrators. You are signed in as{' '}
          <strong className="text-slate-800">{user.role.replace(/_/g, ' ')}</strong>. Redirecting you to your assigned operational workspace...
        </p>
        <div className="mt-5">
          <Link
            href="/samples"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <span>Go to My Operational Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Real database metrics query
  const { data: metrics } = useQuery({
    queryKey: ['sampling-metrics'],
    queryFn: () => samplingService.getMetrics(),
  });

  // Real recent samples query to display latest created samples
  const { data: recentSamplesData } = useQuery({
    queryKey: ['dashboard-recent-samples'],
    queryFn: () => samplingService.getAll({ limit: 6, sortBy: 'samplingDate', sortOrder: 'desc' }),
  });

  // Dynamically compute the last 7 calendar days leading to today
  const recentDays = useMemo(() => getRecentDays(7), [currentTime]);

  // 7-day grouped bar chart data for Samples Overview based on current live calendar
  const weeklyOverviewData = useMemo(() => [
    { day: recentDays[0].day, date: recentDays[0].date, received: 45, processing: 35, completed: 28 },
    { day: recentDays[1].day, date: recentDays[1].date, received: 60, processing: 48, completed: 36 },
    { day: recentDays[2].day, date: recentDays[2].date, received: 68, processing: 60, completed: 45 },
    { day: recentDays[3].day, date: recentDays[3].date, received: 70, processing: 62, completed: 48 },
    { day: recentDays[4].day, date: recentDays[4].date, received: 69, processing: 55, completed: 50 },
    { day: recentDays[5].day, date: recentDays[5].date, received: 80, processing: 85, completed: 65 },
    {
      day: `${recentDays[6].day}`,
      date: `${recentDays[6].date} (Today)`,
      received: metrics?.total !== undefined ? Math.max(metrics.total, 82) : 82,
      processing: metrics?.inTesting !== undefined ? Math.max(metrics.inTesting, 56) : 56,
      completed: metrics?.approved !== undefined ? Math.max(metrics.approved, 55) : 55,
    },
  ], [recentDays, metrics]);

  // Samples by Type breakdown data
  const sampleTypes = [
    { label: 'Raw Material', count: 42, pct: '17%', color: '#0088FE' },
    { label: 'Packaging Material', count: 38, pct: '15%', color: '#00C49F' },
    { label: 'In-Process', count: 54, pct: '22%', color: '#06B6D4' },
    { label: 'Finished Product', count: 76, pct: '31%', color: '#8884D8' },
    { label: 'Stability', count: 28, pct: '11%', color: '#FFBB28' },
    { label: 'Microbiology', count: 10, pct: '4%', color: '#EC4899' },
  ];

  // Real or fallback Pending Samples Table data with Laboratory mapping
  const pendingSamples = useMemo(() => {
    const realList = Array.isArray(recentSamplesData)
      ? recentSamplesData
      : (recentSamplesData as any)?.data || [];

    if (realList.length > 0) {
      // Prioritize pending/in-process samples, then latest
      const sorted = [...realList].sort((a: any, b: any) => {
        const aPending = a.status !== 'APPROVED' && a.status !== 'REJECTED' ? 1 : 0;
        const bPending = b.status !== 'APPROVED' && b.status !== 'REJECTED' ? 1 : 0;
        return bPending - aPending;
      });

      return sorted.slice(0, 5).map((s: any) => {
        // Detect analytical laboratory: 'sef' | 'penicillin' | 'general'
        let labId = 'general';
        let labName = 'General Lab';
        let labBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

        const labType = (s.laboratoryType || s.laboratory?.code || '').toUpperCase();
        const labText = (s.laboratory?.name || s.samplingLocation || '').toUpperCase();

        if (labType === 'SAF' || labType === 'SEF' || labText.includes('SAF') || labText.includes('SEF') || labText.includes('CEPHALOSPORIN')) {
          labId = 'sef';
          labName = 'SEF Lab';
          labBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        } else if (labType === 'PENICILLIN' || labType === 'PEN' || labText.includes('PENICILLIN')) {
          labId = 'penicillin';
          labName = 'Penicillin Lab';
          labBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
        } else {
          labId = 'general';
          labName = 'General Lab';
          labBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        }

        return {
          uuid: s.id,
          id: s.sampleCode || s.sampleId || s.accessionNo || s.id || 'SMP-0001',
          type: s.stageType || s.sampleType || 'Finished Product',
          product: s.nomenclature || s.materialName || 'Pharmaceutical Sample',
          batch: s.lotNumber || s.batchLotNumber || s.batch?.batchNumber || s.batchNumber || 'CP-B9021',
          date: s.samplingDate ? formatShortLiveDate(new Date(s.samplingDate)) : formatShortLiveDate(),
          status: s.status === 'TESTING_IN_PROGRESS' ? 'In Process' : s.status ? s.status.replace(/_/g, ' ') : 'Pending',
          statusColor:
            s.status === 'APPROVED'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : s.status === 'REJECTED'
              ? 'bg-rose-100 text-rose-800 border-rose-200'
              : s.status === 'TESTING_IN_PROGRESS'
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : 'bg-amber-100 text-amber-800 border-amber-200',
          labId,
          labName,
          labBadgeColor,
        };
      });
    }

    return [
      {
        uuid: 'SMP-0034',
        id: 'SMP-0034',
        type: 'Finished Product',
        product: 'Amoxicillin 500mg',
        batch: 'CP-AMX-204',
        date: formatShortLiveDate(),
        status: 'Pending',
        statusColor: 'bg-amber-100 text-amber-800 border-amber-200',
        labId: 'penicillin',
        labName: 'Penicillin Lab',
        labBadgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      {
        uuid: 'SMP-0033',
        id: 'SMP-0033',
        type: 'Raw Material',
        product: 'Paracetamol API',
        batch: 'CP-PCM-901',
        date: formatShortLiveDate(),
        status: 'Pending',
        statusColor: 'bg-amber-100 text-amber-800 border-amber-200',
        labId: 'general',
        labName: 'General Lab',
        labBadgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        uuid: 'SMP-0032',
        id: 'SMP-0032',
        type: 'In-Process',
        product: 'Cefixime Granules',
        batch: 'CP-CEF-012',
        date: formatShortLiveDate(),
        status: 'In Process',
        statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
        labId: 'sef',
        labName: 'SEF Lab',
        labBadgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      },
      {
        uuid: 'SMP-0031',
        id: 'SMP-0031',
        type: 'Packaging Material',
        product: 'Blister Pack',
        batch: 'CP-BLS-88',
        date: formatShortLiveDate(),
        status: 'In Process',
        statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
        labId: 'general',
        labName: 'General Lab',
        labBadgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        uuid: 'SMP-0030',
        id: 'SMP-0030',
        type: 'Microbiology',
        product: 'Purified Water',
        batch: 'CP-WTR-04',
        date: formatShortLiveDate(),
        status: 'Completed',
        statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        labId: 'general',
        labName: 'General Lab',
        labBadgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      },
    ];
  }, [recentSamplesData]);

  // Laboratory Distribution data across Citi Pharma facilities
  const labDistribution = [
    { name: 'Cephalosporin (SEF) Lab', count: 104, rate: 98 },
    { name: 'Penicillin Laboratory', count: 82, rate: 95 },
    { name: 'General Pharma Lab', count: 62, rate: 100 },
    { name: 'Raw Material Section', count: 42, rate: 92 },
    { name: 'Finished Goods Section', count: 76, rate: 96 },
  ];

  // Real-time live audit logs from database (refreshes every 5 seconds)
  const { data: rawAuditLogs, isLoading: isAuditLoading } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: () => auditService.getAll({ limit: 40 }),
    refetchInterval: 5000,
  });

  const [activityFilter, setActivityFilter] = useState<'all' | 'staff'>('all');

  const formattedLogs: FormattedAuditItem[] = useMemo(() => {
    if (!rawAuditLogs) return [];
    const list = Array.isArray(rawAuditLogs) ? rawAuditLogs : (rawAuditLogs as any).data || [];
    return list.map(parseAuditItem);
  }, [rawAuditLogs]);

  const displayedLogs = useMemo(() => {
    if (activityFilter === 'staff') {
      return formattedLogs.filter((log) => log.isNonAdmin);
    }
    return formattedLogs;
  }, [formattedLogs, activityFilter]);

  // Active Urgent (2 Days SLA) and Immediate (24 Hours SLA) samples for Admin Notice
  const urgentAdminNotices = useMemo(() => {
    const list = Array.isArray(recentSamplesData)
      ? recentSamplesData
      : (recentSamplesData as any)?.data || [];

    const urgentList = list.filter(
      (s: any) =>
        (s.priority === 'STAT' || s.priority === 'URGENT') &&
        s.status !== 'APPROVED' &&
        s.status !== 'REJECTED'
    );

    return urgentList.map((s: any) => {
      let labId = 'general';
      let labName = 'General Lab';
      const labType = (s.laboratoryType || s.laboratory?.code || '').toUpperCase();
      if (labType === 'SAF' || labType === 'SEF') {
        labId = 'sef';
        labName = 'SEF Lab';
      } else if (labType === 'PENICILLIN' || labType === 'PEN') {
        labId = 'penicillin';
        labName = 'Penicillin Lab';
      }

      return {
        uuid: s.id,
        id: s.sampleCode || s.sampleId || s.accessionNo || s.id,
        product: s.nomenclature || s.materialName || 'Pharmaceutical Sample',
        batch: s.lotNumber || s.batchLotNumber || s.batch?.batchNumber || 'N/A',
        priority: s.priority as 'STAT' | 'URGENT',
        slaLabel: s.priority === 'STAT' ? '24 Hours SLA' : '2 Days SLA',
        labId,
        labName,
      };
    });
  }, [recentSamplesData]);

  // Alert logs prioritizing Urgent and Critical Immediate events
  const priorityAlertLogs = useMemo(() => {
    return [...formattedLogs].sort((a, b) => {
      const aUrgent =
        a.actionRaw.includes('CRITICAL') || a.actionRaw.includes('URGENT') || a.actionRaw.includes('STAT')
          ? 1
          : 0;
      const bUrgent =
        b.actionRaw.includes('CRITICAL') || b.actionRaw.includes('URGENT') || b.actionRaw.includes('STAT')
          ? 1
          : 0;
      return bUrgent - aUrgent;
    });
  }, [formattedLogs]);

  return (
    <div className="space-y-6 font-sans pb-10">
      
      {/* Top Header: Dashboard title, welcome message, and LIVE date dropdown button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Laboratory Dashboard
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              QC Central Unit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time cGMP sample throughput and pharmaceutical laboratory operations.
          </p>
        </div>

        {/* Live Date & Real-Time Clock Selector Button on the Right */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Real-time Ticking Clock Pill with Live Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-xs font-bold">{formatLiveClock(currentTime)}</span>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Live</span>
          </div>

          {/* Live Date Selector Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200 shadow-xs text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              title="Current Live System Date"
            >
              <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{activeDateRange || formatLiveDate(currentTime)}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {isDateMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsDateMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200 p-2 z-40 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Calendar Range Options
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRangeKey('today');
                      setActiveDateRange(formatLiveDate(currentTime));
                      setIsDateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center justify-between"
                  >
                    <span>Today ({formatShortLiveDate(currentTime)})</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">Active Live</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRangeKey('yesterday');
                      const y = new Date(currentTime);
                      y.setDate(y.getDate() - 1);
                      setActiveDateRange(`Yesterday (${formatShortLiveDate(y)})`);
                      setIsDateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>Yesterday</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRangeKey('week');
                      setActiveDateRange('Last 7 Days');
                      setIsDateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>Last 7 Days</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRangeKey('month');
                      setActiveDateRange('This Month');
                      setIsDateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>This Month</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Executive Priority Action Notice Banner for Lab Administration */}
      {urgentAdminNotices.length > 0 && (
        <div className="rounded-2xl border border-rose-300 bg-linear-to-r from-rose-50 via-amber-50/70 to-orange-50 p-4 shadow-xs animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
                    Admin Priority Notice
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {urgentAdminNotices.length} Expedited {urgentAdminNotices.length === 1 ? 'Sample Requires' : 'Samples Require'} Lab Testing
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Immediate (24 Hours SLA) and Urgent (2 Days SLA) samples detected in active laboratory workflow.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {urgentAdminNotices.slice(0, 3).map((s) => (
                <Link
                  key={s.id}
                  href={`/samples?lab=${s.labId}&sampleId=${encodeURIComponent(s.uuid || s.id)}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:scale-102',
                    s.priority === 'STAT'
                      ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                      : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  )}
                  title={`Open ${s.id} in ${s.labName}`}
                >
                  <span>{s.id}</span>
                  <span className="text-[10px] opacity-90 font-medium">({s.priority === 'STAT' ? '24h SLA' : '2d SLA'})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row 1: 4 Executive KPI Cards with Accent Borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Samples */}
        <div className="enterprise-card rounded-2xl p-4.5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80 shadow-2xs group-hover:scale-105 transition-transform">
              <FlaskConical className="h-6 w-6 text-blue-600 stroke-[1.8]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Samples</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {metrics?.total !== undefined ? metrics.total : 248}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mt-0.5">
                <span className="bg-emerald-50 px-1 py-0.2 rounded text-[10px] font-bold">↑ 12%</span>
                <span className="text-slate-400 font-normal">vs last week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Received Samples */}
        <div className="enterprise-card rounded-2xl p-4.5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs group-hover:scale-105 transition-transform">
              <Clock className="h-6 w-6 text-amber-600 stroke-[1.8]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Received Samples</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {metrics?.received !== undefined ? metrics.received : 64}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mt-0.5">
                <span className="bg-emerald-50 px-1 py-0.2 rounded text-[10px] font-bold">↑ 8%</span>
                <span className="text-slate-400 font-normal">vs last week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Active Batches */}
        <div className="enterprise-card rounded-2xl p-4.5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs group-hover:scale-105 transition-transform">
              <Boxes className="h-6 w-6 text-indigo-600 stroke-[1.8]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Active Batches</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {metrics?.inTesting !== undefined ? (metrics.inTesting + (metrics.received ?? 0)) : 56}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 mt-0.5">
                <span className="bg-indigo-50 px-1 py-0.2 rounded text-[10px] font-bold">↑ 14%</span>
                <span className="text-slate-400 font-normal">in workflow</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Approved Samples */}
        <div className="enterprise-card rounded-2xl p-4.5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 stroke-[1.8]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Approved Samples</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {metrics?.approved !== undefined ? metrics.approved : 182}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mt-0.5">
                <span className="bg-emerald-50 px-1 py-0.2 rounded text-[10px] font-bold">↑ 15%</span>
                <span className="text-slate-400 font-normal">vs last week</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Samples Overview Chart (5 cols) + Samples by Type Donut (4 cols) + Recent Alerts (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Card 1: Samples Overview (Grouped Bar Chart) */}
        <div className="lg:col-span-5 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Samples Overview</h2>
              </div>
              
              {/* Legend matching Image 1 */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0066FF]" />
                  <span>Received</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#00C49F]" />
                  <span>In Process</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#8884D8]" />
                  <span>Completed</span>
                </div>
              </div>
            </div>

            {/* Custom Responsive SVG Grouped Bar Chart */}
            <div className="w-full h-56 pt-2">
              <div className="h-full flex flex-col justify-between">
                
                {/* Chart Area with Gridlines */}
                <div className="relative flex-1 flex items-end justify-between px-2 pb-2 border-b border-slate-200">
                  {/* Grid lines (100, 80, 60, 40, 20, 0) */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400">
                    <div className="border-b border-slate-100 flex items-center justify-between pr-1">
                      <span>100</span>
                    </div>
                    <div className="border-b border-slate-100 flex items-center justify-between pr-1">
                      <span>80</span>
                    </div>
                    <div className="border-b border-slate-100 flex items-center justify-between pr-1">
                      <span>60</span>
                    </div>
                    <div className="border-b border-slate-100 flex items-center justify-between pr-1">
                      <span>40</span>
                    </div>
                    <div className="border-b border-slate-100 flex items-center justify-between pr-1">
                      <span>20</span>
                    </div>
                    <div className="flex items-center justify-between pr-1">
                      <span>0</span>
                    </div>
                  </div>

                  {/* 7 Grouped Bar Columns */}
                  <div className="w-full flex justify-between items-end pl-6 pr-1 z-10 h-full">
                    {weeklyOverviewData.map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                        <div className="flex items-end gap-1">
                          {/* Received Bar (Blue) */}
                          <div
                            style={{ height: `${item.received * 1.5}px` }}
                            className="w-2 sm:w-2.5 bg-[#0066FF] rounded-t-xs hover:brightness-110 transition-all duration-300"
                            title={`Received: ${item.received}`}
                          />
                          {/* In Process Bar (Teal) */}
                          <div
                            style={{ height: `${item.processing * 1.5}px` }}
                            className="w-2 sm:w-2.5 bg-[#00C49F] rounded-t-xs hover:brightness-110 transition-all duration-300"
                            title={`In Process: ${item.processing}`}
                          />
                          {/* Completed Bar (Purple) */}
                          <div
                            style={{ height: `${item.completed * 1.5}px` }}
                            className="w-2 sm:w-2.5 bg-[#8884D8] rounded-t-xs hover:brightness-110 transition-all duration-300"
                            title={`Completed: ${item.completed}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* X-Axis Day Labels matching Image 1 */}
                <div className="flex justify-between pl-6 pr-1 pt-2 text-[10px] text-slate-500 font-medium text-center">
                  {weeklyOverviewData.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <span>{item.day}</span>
                      <span className="text-[9px] text-slate-400">{item.date}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Samples by Type (Donut Chart & Legend) */}
        <div className="lg:col-span-4 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Samples by Type</h2>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
              
              {/* Donut Graphic with center text */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* SVG Slices styled in concentric donut */}
                  {/* Finished Product 31% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#8884D8"
                    strokeWidth="14"
                    strokeDasharray="74 165"
                    strokeDashoffset="0"
                  />
                  {/* In-Process 22% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#06B6D4"
                    strokeWidth="14"
                    strokeDasharray="52 187"
                    strokeDashoffset="-74"
                  />
                  {/* Raw Material 17% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#0088FE"
                    strokeWidth="14"
                    strokeDasharray="40 199"
                    strokeDashoffset="-126"
                  />
                  {/* Packaging Material 15% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#00C49F"
                    strokeWidth="14"
                    strokeDasharray="36 203"
                    strokeDashoffset="-166"
                  />
                  {/* Stability 11% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#FFBB28"
                    strokeWidth="14"
                    strokeDasharray="26 213"
                    strokeDashoffset="-202"
                  />
                  {/* Microbiology 4% */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#EC4899"
                    strokeWidth="14"
                    strokeDasharray="10 229"
                    strokeDashoffset="-228"
                  />
                </svg>

                {/* Center of Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-slate-800 leading-tight">248</span>
                  <span className="text-[10px] text-slate-400 font-medium">Total Samples</span>
                </div>
              </div>

              {/* Legend List matching Image 1 */}
              <div className="flex-1 w-full space-y-2 text-xs">
                {sampleTypes.map((type, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-[11px] text-slate-700 font-medium">{type.label}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-800">
                      {type.count} ({type.pct})
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Card 3: Recent Alerts */}
        <div className="lg:col-span-3 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Recent Alerts</h2>
              </div>
              <Link href="/samples" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                View All
              </Link>
            </div>

            <div className="space-y-3.5">
              {priorityAlertLogs.length > 0 ? (
                priorityAlertLogs
                  .slice(0, 4)
                  .map((alert) => {
                    const isCritical = alert.actionRaw.includes('CRITICAL') || alert.actionRaw.includes('STAT');
                    const isUrgent = alert.actionRaw.includes('URGENT');

                    return (
                      <div key={alert.id} className="flex items-start gap-3">
                        <div
                          className={cn(
                            'h-7 w-7 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-2xs',
                            isCritical
                              ? 'bg-rose-600 animate-pulse'
                              : isUrgent
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          )}
                        >
                          !
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">{alert.userName}</p>
                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${alert.roleBadge.badgeClass}`}>
                                {alert.roleBadge.label}
                              </span>
                              {isCritical && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white uppercase">
                                  24h SLA
                                </span>
                              )}
                              {isUrgent && !isCritical && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white uppercase">
                                  2d SLA
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">{alert.relativeTime}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate mt-0.5" title={alert.details}>
                            <span
                              className={cn(
                                'font-semibold',
                                isCritical ? 'text-rose-600' : isUrgent ? 'text-amber-600' : 'text-blue-600'
                              )}
                            >
                              {alert.actionLabel.label}:
                            </span>{' '}
                            {alert.details}
                          </p>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      !
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">Priority Batch Notice</p>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">Live</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Sample: SMP-0034 | Batch: CP-AMX-204
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      !
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">Intake Verification Pending</p>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">Live</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Sample: SMP-0033 | Raw Material Paracetamol
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">Batch Release Approved</p>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">Live</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Sample: SMP-0021 | Purified Water System
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Pending Samples Table (7 cols) + Top Tests with progress bars (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Card 1: Pending Samples Table */}
        <div className="lg:col-span-8 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Pending Samples</h2>
              </div>
              <Link href="/samples" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                View All
              </Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-2.5 px-2.5 font-medium whitespace-nowrap">Sample ID</th>
                    <th className="py-2.5 px-2.5 font-medium whitespace-nowrap">Laboratory</th>
                    <th className="py-2.5 px-2.5 font-medium whitespace-nowrap">Sample Type</th>
                    <th className="py-2.5 px-2.5 font-medium">Product</th>
                    <th className="py-2.5 px-2.5 font-medium whitespace-nowrap">Batch No</th>
                    <th className="py-2.5 px-2.5 font-medium whitespace-nowrap">Received Date</th>
                    <th className="py-2.5 px-2.5 font-medium whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-2.5 font-medium text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingSamples.map((sample) => {
                    const sampleUrl = `/samples?lab=${sample.labId}&sampleId=${encodeURIComponent(sample.uuid || sample.id)}`;

                    return (
                      <tr key={sample.id} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="py-3 px-2.5 font-semibold text-slate-800 font-mono text-[11px] whitespace-nowrap">
                          <Link
                            href={sampleUrl}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                            title={`Open ${sample.id} in ${sample.labName}`}
                          >
                            {sample.id}
                          </Link>
                        </td>
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <Link
                            href={`/samples?lab=${sample.labId}`}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${sample.labBadgeColor} hover:opacity-80 transition-opacity`}
                            title={`Filter ${sample.labName}`}
                          >
                            {sample.labName}
                          </Link>
                        </td>
                        <td className="py-3 px-2.5 text-slate-600 whitespace-nowrap">{sample.type}</td>
                        <td className="py-3 px-2.5 font-medium text-slate-800">{sample.product}</td>
                        <td className="py-3 px-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">{sample.batch}</td>
                        <td className="py-3 px-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">{sample.date}</td>
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${sample.statusColor}`}
                          >
                            {sample.status}
                          </span>
                        </td>
                        <td className="py-3 px-2.5 text-right whitespace-nowrap">
                          <Link
                            href={sampleUrl}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs group-hover:shadow-xs"
                            title={`View sample dossier in ${sample.labName}`}
                          >
                            <span>View</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 2: Laboratory Distribution */}
        <div className="lg:col-span-4 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Laboratory Distribution</h2>
              </div>
              <Link href="/samples" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                View All
              </Link>
            </div>

            {/* List Headers */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pb-2 border-b border-slate-100">
              <span className="w-1/2">Laboratory Section</span>
              <span className="w-16 text-center">Samples</span>
              <span className="flex-1 text-right">Throughput</span>
            </div>

            {/* Laboratory Items with Progress Bars */}
            <div className="space-y-4 pt-3">
              {labDistribution.map((lab, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs gap-2">
                  <span className="w-1/2 font-medium text-slate-800 truncate">{lab.name}</span>
                  <span className="w-16 text-center text-slate-600 font-semibold">{lab.count}</span>
                  
                  {/* Progress bar matching Image 1 green meter */}
                  <div className="flex-1 flex items-center justify-end gap-2">
                    <span className="text-[11px] font-semibold text-slate-700 w-8 text-right">
                      {lab.rate}%
                    </span>
                    <div className="w-20 sm:w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${lab.rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Row 4: Quick Actions (4 cols) + Lab Activity Log (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Card 1: Quick Actions */}
        <div className="lg:col-span-4 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Quick Actions</h2>
              </div>
            </div>

            {/* 4 Action Buttons with Enterprise Styling */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:border-blue-500 hover:bg-blue-50/60 transition-all text-center group shadow-2xs cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-blue-100/60 text-blue-600 group-hover:scale-105 transition-transform">
                  <QrCode className="h-5 w-5 stroke-[1.8]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-2 leading-tight">
                  Register
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">Sample</span>
              </button>

              <button
                onClick={() => router.push('/samples?lab=sef')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:border-indigo-500 hover:bg-indigo-50/60 transition-all text-center group shadow-2xs cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-indigo-100/60 text-indigo-600 group-hover:scale-105 transition-transform">
                  <Microscope className="h-5 w-5 stroke-[1.8]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-2 leading-tight">
                  SEF Lab
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">Cephalosporin</span>
              </button>

              <button
                onClick={() => router.push('/samples')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:border-emerald-500 hover:bg-emerald-50/60 transition-all text-center group shadow-2xs cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-emerald-100/60 text-emerald-600 group-hover:scale-105 transition-transform">
                  <GitBranch className="h-5 w-5 stroke-[1.8]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-2 leading-tight">
                  Batches
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">All Records</span>
              </button>

              <button
                onClick={() => router.push('/samples?lab=penicillin')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:border-sky-500 hover:bg-sky-50/60 transition-all text-center group shadow-2xs cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-sky-100/60 text-sky-600 group-hover:scale-105 transition-transform">
                  <FlaskConical className="h-5 w-5 stroke-[1.8]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-2 leading-tight">
                  Penicillin
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">QC Lab</span>
              </button>

            </div>
          </div>
        </div>

        {/* Card 2: Lab Activity Log (Live Real-Time Operational Audit Feed - Expanded 8 Columns) */}
        <div className="lg:col-span-8 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-3 gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                <h2 className="font-bold text-sm text-slate-900">Lab Activity Log</h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Live
                </span>
              </div>

              {/* Activity Filter: All vs Non-Admin Staff Only */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActivityFilter('all')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activityFilter === 'all'
                      ? 'bg-white text-slate-800 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter('staff')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activityFilter === 'staff'
                      ? 'bg-amber-500 text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Staff
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-84 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-2.5 px-3 font-medium whitespace-nowrap">Time & Date</th>
                    <th className="py-2.5 px-3 font-medium whitespace-nowrap">Personnel & Role</th>
                    <th className="py-2.5 px-3 font-medium whitespace-nowrap">Activity</th>
                    <th className="py-2.5 px-3 font-medium">Change Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isAuditLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Loading real-time operational activity...
                      </td>
                    </tr>
                  ) : displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No activity found for this filter.
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.slice(0, 15).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block font-mono text-[11px]">
                            {log.timeDisplay}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {log.dateDisplay}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-xs">
                            {log.userName}
                          </div>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${log.roleBadge.badgeClass}`}>
                            {log.roleBadge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${log.actionLabel.colorClass}`}>
                            {log.actionLabel.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-slate-800 font-medium text-[11px] leading-tight">
                            {log.details}
                          </p>
                          {log.reason && log.reason !== log.details && (
                            <span className="text-[10px] text-slate-400 italic block mt-0.5">
                              Reason: {log.reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Accession Modal for Quick Registration */}
      <NewSampleModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

    </div>
  );
}
