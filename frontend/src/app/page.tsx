'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { samplingService } from '@/services/sampling.service';
import { auditService } from '@/services/audit.service';
import { parseAuditItem, FormattedAuditItem } from '@/lib/auditFormatter';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { api } from '@/lib/api';
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
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
  Microscope,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  X,
  Boxes,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      router.replace('/laboratories');
    }
  }, [user, authLoading, router]);

  if (!authLoading && user && user.role !== 'ADMIN') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
        <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-500 font-medium">Entering Analytical Laboratories Portal...</span>
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
    queryFn: () => samplingService.getAll({ limit: 100, sortBy: 'samplingDate', sortOrder: 'desc' }),
  });

  // Dedicated query to fetch ALL active expedited (Immediate / STAT & Urgent) samples
  const { data: expeditedSamplesData } = useQuery({
    queryKey: ['active-expedited-urgent-samples'],
    queryFn: () =>
      samplingService.getAll({
        priority: 'STAT,URGENT',
        limit: 100,
        sortBy: 'samplingDate',
        sortOrder: 'desc',
      }),
    refetchInterval: 5000,
  });

  // Real active batches query
  const { data: batchesData } = useQuery({
    queryKey: ['dashboard-batches-list'],
    queryFn: () => api.get<any[]>('/batches'),
  });

  const activeBatchesCount = useMemo(() => {
    if (metrics?.activeBatches !== undefined) {
      return metrics.activeBatches;
    }
    if (batchesData) {
      const list = Array.isArray(batchesData) ? batchesData : (batchesData as any)?.data || [];
      const active = list.filter((b: any) => b.status === 'QUARANTINE' || b.status === 'CONDITIONAL' || b.status !== 'RELEASED');
      return active.length || list.length;
    }
    return 0;
  }, [batchesData, metrics]);

  // Dynamically compute the last 7 calendar days leading to today
  const recentDays = useMemo(() => getRecentDays(7), [currentTime]);

  // Real sample records list from API
  const realSamplesList = useMemo(() => {
    if (!recentSamplesData) return [];
    return Array.isArray(recentSamplesData)
      ? recentSamplesData
      : (recentSamplesData as any)?.data || [];
  }, [recentSamplesData]);

  // Total samples count across all registries
  const totalSamplesCount = useMemo(() => {
    if (metrics?.total !== undefined) return metrics.total;
    return realSamplesList.length;
  }, [metrics?.total, realSamplesList.length]);

  // 7-day grouped bar chart data dynamically computed from real database samples
  const weeklyOverviewData = useMemo(() => {
    return recentDays.map((d, index) => {
      const isToday = index === recentDays.length - 1;

      // Match samples by calendar date (using d.fullDate)
      const daySamples = realSamplesList.filter((s: any) => {
        const rawDate = s.samplingDate || s.createdAt;
        if (!rawDate) return false;
        try {
          const sampleDate = new Date(rawDate);
          return sampleDate.toDateString() === d.fullDate.toDateString();
        } catch {
          return false;
        }
      });

      const dayReceived = daySamples.filter((s: any) => {
        const st = (s.status || '').toUpperCase();
        return st === 'RECEIVED' || st.includes('ASSIGNMENT') || st.includes('QUEUED');
      }).length;

      const dayProcessing = daySamples.filter((s: any) => {
        const st = (s.status || '').toUpperCase();
        return st === 'TESTING_IN_PROGRESS' || st.includes('PROGRESS') || st.includes('REVIEW');
      }).length;

      const dayCompleted = daySamples.filter((s: any) => {
        const st = (s.status || '').toUpperCase();
        return st === 'APPROVED' || st === 'RELEASED';
      }).length;

      // For today, incorporate live metrics if present
      const received = isToday && metrics?.received !== undefined ? metrics.received : dayReceived;
      const processing = isToday && metrics?.inTesting !== undefined ? metrics.inTesting : dayProcessing;
      const completed = isToday && metrics?.approved !== undefined ? metrics.approved : dayCompleted;

      return {
        day: d.day,
        date: isToday ? `${d.date} (Today)` : d.date,
        received,
        processing,
        completed,
      };
    });
  }, [recentDays, realSamplesList, metrics]);

  // Find max value in weeklyOverviewData to scale bars dynamically
  const maxWeeklyVal = useMemo(() => {
    const allVals = weeklyOverviewData.flatMap((d) => [d.received, d.processing, d.completed]);
    const max = Math.max(0, ...allVals);
    if (max <= 10) return 10;
    if (max <= 25) return 25;
    if (max <= 50) return 50;
    if (max <= 100) return 100;
    return Math.ceil(max / 50) * 50;
  }, [weeklyOverviewData]);

  // Dynamic 6 gridlines for the grouped bar chart
  const gridLabels = useMemo(() => {
    return [
      maxWeeklyVal,
      Math.round(maxWeeklyVal * 0.8),
      Math.round(maxWeeklyVal * 0.6),
      Math.round(maxWeeklyVal * 0.4),
      Math.round(maxWeeklyVal * 0.2),
      0,
    ];
  }, [maxWeeklyVal]);

  // Samples by Type breakdown dynamically computed from real database samples
  const sampleTypes = useMemo(() => {
    const categories = [
      {
        key: 'RAW_MATERIAL',
        label: 'Raw Material',
        color: '#0088FE',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('RAW') || t === 'RM';
        },
      },
      {
        key: 'PACKAGING_MATERIAL',
        label: 'Packaging Material',
        color: '#00C49F',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('PACK') || t === 'PM';
        },
      },
      {
        key: 'IN_PROCESS',
        label: 'In-Process',
        color: '#06B6D4',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('PROCESS') || t === 'IP';
        },
      },
      {
        key: 'FINISHED_PRODUCT',
        label: 'Finished Product',
        color: '#8884D8',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return (
            t.includes('FINISH') ||
            t === 'FP' ||
            (!t.includes('RAW') &&
              !t.includes('PACK') &&
              !t.includes('PROCESS') &&
              !t.includes('STABIL') &&
              !t.includes('MICRO') &&
              realSamplesList.length > 0)
          );
        },
      },
      {
        key: 'STABILITY',
        label: 'Stability',
        color: '#FFBB28',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('STABIL') || t === 'STB';
        },
      },
      {
        key: 'MICROBIOLOGY',
        label: 'Microbiology',
        color: '#EC4899',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('MICRO') || t === 'MB';
        },
      },
    ];

    const total = realSamplesList.length;

    return categories.map((cat) => {
      const count = realSamplesList.filter(cat.match).length;
      const pctNum = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        label: cat.label,
        count,
        pct: `${pctNum}%`,
        color: cat.color,
        ratio: total > 0 ? count / total : 0,
      };
    });
  }, [realSamplesList]);

  // Compute SVG arc slices dynamically for the donut chart
  const donutSlices = useMemo(() => {
    if (totalSamplesCount === 0) return [];

    let accumulated = 0;
    const C = 238.76;

    return sampleTypes
      .filter((t) => t.count > 0)
      .map((t) => {
        const dashLength = t.ratio * C;
        const dasharray = `${dashLength.toFixed(1)} ${(C - dashLength).toFixed(1)}`;
        const dashoffset = (-accumulated).toFixed(1);
        accumulated += dashLength;

        return {
          label: t.label,
          color: t.color,
          dasharray,
          dashoffset,
        };
      });
  }, [sampleTypes, totalSamplesCount]);

  // Interface for dashboard pending sample items
  interface DashboardPendingSample {
    uuid: string;
    id: string;
    type: string;
    product: string;
    batch: string;
    date: string;
    status: string;
    rawStatus: string;
    assignedToId?: string | null;
    assignedTo?: any;
    version?: number;
    priority?: string;
    rawSample?: any;
    statusColor: string;
    labId: string;
    labName: string;
    labBadgeColor: string;
  }

  // Real database Pending Samples Table data with Laboratory mapping
  const pendingSamples = useMemo<DashboardPendingSample[]>(() => {
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

      return sorted.map((s: any): DashboardPendingSample => {
        // Detect analytical laboratory: 'sef' | 'penicillin' | 'general'
        let labId = 'general';
        let labName = 'General Lab';
        let labBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

        const labType = (s.laboratoryType || s.laboratory?.code || '').toUpperCase();
        const labText = (s.laboratory?.name || s.samplingLocation || '').toUpperCase();

        if (labType === 'SAF' || labType === 'SEF' || labType === 'CP' || labText.includes('SAF') || labText.includes('SEF') || labText.includes('CEPHALOSPORIN')) {
          labId = 'cephalosporin';
          labName = 'Cephalosporin Lab';
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
          rawStatus: s.status || 'PENDING_ASSIGNMENT',
          assignedToId: s.assignedToId,
          assignedTo: s.assignedTo,
          version: s.version,
          priority: s.priority || 'ROUTINE',
          rawSample: s,
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

    return [];
  }, [recentSamplesData]);

  // Pagination for Pending Samples table (10 items per page)
  const [samplePage, setSamplePage] = useState(1);
  const samplePageSize = 10;

  const totalSamplePages = useMemo(() => {
    return Math.max(1, Math.ceil(pendingSamples.length / samplePageSize));
  }, [pendingSamples.length, samplePageSize]);

  const paginatedSamples = useMemo(() => {
    const start = (samplePage - 1) * samplePageSize;
    return pendingSamples.slice(start, start + samplePageSize);
  }, [pendingSamples, samplePage, samplePageSize]);


  // Real-time live audit logs from database (refreshes every 5 seconds)
  const { data: rawAuditLogs, isLoading: isAuditLoading } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: () => auditService.getAll({ limit: 100 }),
    refetchInterval: 5000,
  });

  const [auditPage, setAuditPage] = useState(1);
  const auditPageSize = 10;

  const formattedLogs: FormattedAuditItem[] = useMemo(() => {
    if (!rawAuditLogs) return [];
    const list = Array.isArray(rawAuditLogs) ? rawAuditLogs : (rawAuditLogs as any).data || [];
    return list.map(parseAuditItem);
  }, [rawAuditLogs]);

  const displayedLogs = formattedLogs;

  const totalAuditPages = useMemo(() => {
    return Math.max(1, Math.ceil(displayedLogs.length / auditPageSize));
  }, [displayedLogs.length, auditPageSize]);

  const paginatedLogs = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return displayedLogs.slice(start, start + auditPageSize);
  }, [displayedLogs, auditPage, auditPageSize]);

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
        </div>

        {/* Calendar Date Range Filter Selector */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
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


      {/* Analytical Laboratory Suites Showcase (General Lab, Cephalosporin Lab, Penicillin Lab) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
              <span>Analytical Laboratory Suites</span>
            </h2>
          </div>
          <Link
            href="/samples"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>View All Registries</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Lab 1: General Lab */}
          <Link
            href="/samples?lab=general"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
                  <FlaskConical className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">General Lab</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.byLab?.general !== undefined ? metrics.byLab.general : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                GL
              </span>
            </div>
          </Link>

          {/* Lab 2: Cephalosporin Lab */}
          <Link
            href="/samples?lab=cephalosporin"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-2xs shrink-0">
                  <ShieldAlert className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Cephalosporin Lab</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.byLab?.cephalosporin !== undefined ? metrics.byLab.cephalosporin : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                CEPH
              </span>
            </div>
          </Link>

          {/* Lab 3: Penicillin Lab */}
          <Link
            href="/samples?lab=penicillin"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-2xs shrink-0">
                  <Microscope className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Penicillin Lab</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.byLab?.penicillin !== undefined ? metrics.byLab.penicillin : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                PEN
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Row 1: 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* Card 1: Total Samples */}
        <Link
          href="/samples"
          className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          title="Click to view all samples in registry"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
                <FlaskConical className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Total Samples</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  {metrics?.total !== undefined ? metrics.total : 0}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              ALL
            </span>
          </div>
        </Link>

        {/* Card 2: Received Samples */}
        <Link
          href="/samples?status=RECEIVED"
          className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          title="Click to view all received samples"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs shrink-0">
                <Clock className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Received Samples</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  {metrics?.received !== undefined ? metrics.received : 0}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              QUEUED
            </span>
          </div>
        </Link>

        {/* Card 3: Active Batches */}
        <Link
          href="/batches"
          className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          title="Click to view active batches"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs shrink-0">
                <Boxes className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Active Batches</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  {activeBatchesCount}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
              MFG
            </span>
          </div>
        </Link>

        {/* Card 4: Approved Samples */}
        <Link
          href="/samples?status=APPROVED"
          className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          title="Click to view approved samples"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs shrink-0">
                <CheckCircle2 className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Approved Samples</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  {metrics?.approved !== undefined ? metrics.approved : 0}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              CoA
            </span>
          </div>
        </Link>

      </div>

      {/* Row 2: Samples Overview Chart (70% width) + Samples by Type Donut (30% width) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
        
        {/* Card 1: Samples Overview (Grouped Bar Chart - 70% width) */}
        <div className="lg:col-span-7 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
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
                  {/* Grid lines dynamically scaled */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400">
                    {gridLabels.map((val, idx) => (
                      <div key={idx} className="border-b border-slate-100 flex items-center justify-between pr-1">
                        <span>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* 7 Grouped Bar Columns */}
                  <div className="w-full flex justify-between items-end pl-6 pr-1 z-10 h-full">
                    {weeklyOverviewData.map((item, idx) => {
                      const getBarHeight = (count: number) => {
                        if (count <= 0) return '0px';
                        return `${Math.max(4, Math.min(140, Math.round((count / maxWeeklyVal) * 140)))}px`;
                      };

                      return (
                        <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                          <div className="flex items-end gap-1.5">
                            {/* Received Bar (Blue) */}
                            <div
                              style={{ height: getBarHeight(item.received) }}
                              className="w-2.5 sm:w-3.5 bg-[#0066FF] rounded-t-xs hover:brightness-110 transition-all duration-300"
                              title={`Received: ${item.received}`}
                            />
                            {/* In Process Bar (Teal) */}
                            <div
                              style={{ height: getBarHeight(item.processing) }}
                              className="w-2.5 sm:w-3.5 bg-[#00C49F] rounded-t-xs hover:brightness-110 transition-all duration-300"
                              title={`In Process: ${item.processing}`}
                            />
                            {/* Completed Bar (Purple) */}
                            <div
                              style={{ height: getBarHeight(item.completed) }}
                              className="w-2.5 sm:w-3.5 bg-[#8884D8] rounded-t-xs hover:brightness-110 transition-all duration-300"
                              title={`Completed: ${item.completed}`}
                            />
                          </div>
                        </div>
                      );
                    })}
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

        {/* Card 2: Samples by Type (Donut Chart & Legend - 30% width) */}
        <div className="lg:col-span-3 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Samples by Type</h2>
              </div>
            </div>

            <div className="flex flex-col xl:flex-row items-center gap-4 xl:gap-5 pt-1">
              
              {/* Donut Graphic with center text */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {totalSamplesCount === 0 ? (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="14"
                    />
                  ) : (
                    donutSlices.map((slice) => (
                      <circle
                        key={slice.label}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="14"
                        strokeDasharray={slice.dasharray}
                        strokeDashoffset={slice.dashoffset}
                        className="transition-all duration-500"
                      />
                    ))
                  )}
                </svg>

                {/* Center of Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-slate-800 leading-tight">
                    {totalSamplesCount}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Total Samples</span>
                </div>
              </div>

              {/* Legend List matching Image 1 */}
              <div className="flex-1 w-full space-y-1.5 text-xs">
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

      </div>

      {/* Row 3: Pending Samples Table (Full Screen Width) */}
      <div className="w-full enterprise-card rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-900">Pending Samples</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {pendingSamples.length}
              </span>
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
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Sample ID</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Laboratory</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Sample Type</th>
                  <th className="py-2.5 px-3 font-medium">Product</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Batch No</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Received Date</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSamples.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <FlaskConical className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5]" />
                        <p className="font-semibold text-slate-600 text-sm">No Pending Samples Found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Database is currently reset. Accession your first sample using + Accession New Sample to begin testing.
                        </p>
                        <div className="mt-4">
                          <Link
                            href="/samples?action=new"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                          >
                            <span>+ Accession New Sample</span>
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSamples.map((sample) => {
                    const sampleUrl = `/samples?lab=${sample.labId}&sampleId=${encodeURIComponent(sample.uuid || sample.id)}`;

                    return (
                      <tr key={sample.id} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="py-3 px-3 font-semibold text-slate-800 font-mono text-[11px] whitespace-nowrap">
                          <Link
                            href={sampleUrl}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                            title={`Open ${sample.id} in ${sample.labName}`}
                          >
                            {sample.id}
                          </Link>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Link
                            href={`/samples?lab=${sample.labId}`}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${sample.labBadgeColor} hover:opacity-80 transition-opacity`}
                            title={`Filter ${sample.labName}`}
                          >
                            {sample.labName}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{sample.type}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{sample.product}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">{sample.batch}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{sample.date}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${sample.statusColor}`}
                          >
                            {sample.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={sampleUrl}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs group-hover:shadow-xs"
                              title={`View sample dossier in ${sample.labName}`}
                            >
                              <span>View</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pendingSamples.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-medium">
                <span>
                  Showing <strong className="text-slate-800 font-semibold">{Math.min((samplePage - 1) * samplePageSize + 1, pendingSamples.length)}</strong> to{' '}
                  <strong className="text-slate-800 font-semibold">{Math.min(samplePage * samplePageSize, pendingSamples.length)}</strong> of{' '}
                  <strong className="text-slate-800 font-semibold">{pendingSamples.length}</strong> samples
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={samplePage <= 1}
                  onClick={() => setSamplePage((prev) => Math.max(prev - 1, 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer shadow-2xs"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalSamplePages }, (_, idx) => idx + 1)
                    .filter((p) => {
                      if (totalSamplePages <= 5) return true;
                      if (p === 1 || p === totalSamplePages) return true;
                      return Math.abs(p - samplePage) <= 1;
                    })
                    .map((pageNum, index, arr) => {
                      const showEllipsisBefore = index > 0 && pageNum - arr[index - 1] > 1;
                      return (
                        <React.Fragment key={pageNum}>
                          {showEllipsisBefore && (
                            <span className="px-1 text-slate-400 text-xs">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSamplePage(pageNum)}
                            className={cn(
                              'h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer',
                              samplePage === pageNum
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            )}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={samplePage >= totalSamplePages}
                  onClick={() => setSamplePage((prev) => Math.min(prev + 1, totalSamplePages))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer shadow-2xs"
                  aria-label="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lab Activity Log (Live Real-Time Operational Audit Feed - Full Screen Width) */}
      <div className="w-full enterprise-card rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600 shrink-0" />
              <h2 className="font-bold text-sm text-slate-900">Lab Activity Log</h2>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
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
                  paginatedLogs.map((log) => (
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

          {/* Clean Pagination Controls */}
          {displayedLogs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3.5 mt-3 border-t border-slate-100 gap-2.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-slate-900 font-bold">{(auditPage - 1) * auditPageSize + 1}</strong> to{' '}
                  <strong className="text-slate-900 font-bold">{Math.min(auditPage * auditPageSize, displayedLogs.length)}</strong> of{' '}
                  <strong className="text-slate-900 font-bold">{displayedLogs.length}</strong> activity records
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  10 per page
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((prev) => Math.max(prev - 1, 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer shadow-2xs"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalAuditPages }, (_, idx) => idx + 1)
                    .filter((p) => {
                      if (totalAuditPages <= 5) return true;
                      if (p === 1 || p === totalAuditPages) return true;
                      return Math.abs(p - auditPage) <= 1;
                    })
                    .map((pageNum, index, arr) => {
                      const showEllipsisBefore = index > 0 && pageNum - arr[index - 1] > 1;
                      return (
                        <React.Fragment key={pageNum}>
                          {showEllipsisBefore && (
                            <span className="px-1 text-slate-400 text-xs">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setAuditPage(pageNum)}
                            className={cn(
                              'h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer',
                              auditPage === pageNum
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            )}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={auditPage >= totalAuditPages}
                  onClick={() => setAuditPage((prev) => Math.min(prev + 1, totalAuditPages))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer shadow-2xs"
                  aria-label="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
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
