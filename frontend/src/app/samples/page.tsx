'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { samplingService, SamplingFilters } from '@/services/sampling.service';
import { useDebounce } from '@/hooks/useDebounce';
import { Sample, SampleType, Priority, SampleStatus, SAMPLE_STAGES } from '@/types/lims';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { EditSampleModal } from '@/components/samples/EditSampleModal';
import { PrintSampleModal } from '@/components/samples/PrintSampleModal';
import { SubmitSampleModal } from '@/components/samples/SubmitSampleModal';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  FlaskConical,
  Microscope,
  ShieldAlert,
  PlusCircle,
  Search,
  Filter,
  QrCode,
  ArrowRight,
  UserCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  X,
  Layers,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  Eye,
  Edit3,
  Printer,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  Tag,
  Hash,
  FileText,
  User,
} from 'lucide-react';

const LAB_TABS = [
  {
    id: 'sef',
    key: 'SAF' as const,
    name: 'SEF Lab',
    shortLabel: 'SEF Lab',
    heading: 'Sampling / SEF Lab',
    icon: Microscope,
  },
  {
    id: 'penicillin',
    key: 'PENICILLIN' as const,
    name: 'Penicillin Lab',
    shortLabel: 'Penicillin Lab',
    heading: 'Sampling / Penicillin Lab',
    icon: ShieldAlert,
  },
  {
    id: 'general',
    key: 'GENERAL' as const,
    name: 'General Lab',
    shortLabel: 'General Lab',
    heading: 'Sampling / General Lab',
    icon: FlaskConical,
  },
];

function SamplesPageInner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Permissions check: ADMIN, QA_MANAGER, and QC_ANALYST can edit records
  const canEdit = user?.role === 'ADMIN' || user?.role === 'QA_MANAGER' || user?.role === 'QC_ANALYST';

  // Active laboratory from search query param (defaults to 'general')
  const labParam = searchParams.get('lab')?.toLowerCase() || 'general';
  const isAllLabs = labParam === 'all';
  const activeLab =
    LAB_TABS.find(
      (l) => l.id === labParam || (l.id === 'sef' && (labParam === 'saf' || labParam === 'sef'))
    ) || LAB_TABS[2]; // Default: General Lab

  // Dedicated Search & Filter states as per specification:
  // 1. Search by Sample ID
  // 2. Search by nomenclature
  // 3. Search by batch/lot number
  // 4. Filter by date range (startDate, endDate)
  // 5. Filter by stage/type
  // 6. Pagination & Sorting
  const [sampleIdSearch, setSampleIdSearch] = useState('');
  const [nomenclatureSearch, setNomenclatureSearch] = useState('');
  const [batchSearch, setBatchSearch] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination & Sorting state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('samplingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounced search terms for smooth server queries
  const debouncedSampleId = useDebounce(sampleIdSearch, 300);
  const debouncedNomenclature = useDebounce(nomenclatureSearch, 300);
  const debouncedBatch = useDebounce(batchSearch, 300);

  // Modals state
  const [isAccessionModalOpen, setIsAccessionModalOpen] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);
  const [printingSample, setPrintingSample] = useState<Sample | null>(null);
  const [submittingSample, setSubmittingSample] = useState<Sample | null>(null);

  // Switch laboratory function
  const selectLaboratory = (labId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lab', labId);
    setPage(1); // Reset to page 1 on lab switch
    router.push(`/samples?${params.toString()}`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSampleIdSearch('');
    setNomenclatureSearch('');
    setBatchSearch('');
    setStartDateFilter('');
    setEndDateFilter('');
    setStageFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    sampleIdSearch ||
    nomenclatureSearch ||
    batchSearch ||
    startDateFilter ||
    endDateFilter ||
    stageFilter ||
    statusFilter
  );

  // Fetch live sample metrics (with count by laboratory)
  const { data: metrics } = useQuery({
    queryKey: ['sampling-metrics'],
    queryFn: () => samplingService.getMetrics(),
  });

  // Query laboratory records with server-side filtering, sorting, and pagination
  const queryFilters: SamplingFilters = useMemo(
    () => ({
      laboratory: isAllLabs ? undefined : activeLab.key,
      sampleId: debouncedSampleId || undefined,
      nomenclature: debouncedNomenclature || undefined,
      batchNumber: debouncedBatch || undefined,
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
      sampleType: stageFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [
      isAllLabs,
      activeLab.key,
      debouncedSampleId,
      debouncedNomenclature,
      debouncedBatch,
      startDateFilter,
      endDateFilter,
      stageFilter,
      statusFilter,
      page,
      limit,
      sortBy,
      sortOrder,
    ]
  );

  const {
    data: responseData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['samples-paginated', queryFilters],
    queryFn: () => samplingService.getAll(queryFilters),
  });

  // Extract samples array and pagination metadata safely
  const samplesList: Sample[] = useMemo(() => {
    if (!responseData) return [];
    if (Array.isArray(responseData)) return responseData;
    if (Array.isArray((responseData as any).data)) return (responseData as any).data;
    return [];
  }, [responseData]);

  const meta = useMemo(() => {
    if (responseData && 'meta' in (responseData as any)) {
      return (responseData as any).meta;
    }
    return {
      total: samplesList.length,
      page,
      limit,
      totalPages: Math.ceil(samplesList.length / limit) || 1,
    };
  }, [responseData, samplesList.length, page, limit]);

  // Load single sample detail if selected
  const { data: sampleDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['sample', selectedSampleId],
    queryFn: () => (selectedSampleId ? samplingService.getById(selectedSampleId) : null),
    enabled: !!selectedSampleId,
  });

  // Status transition mutation with 21 CFR Part 11 electronic reason
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason: string }) =>
      samplingService.update(id, { status, reasonForChange: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['sample', selectedSampleId] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  // Compute live lab counts from metrics API
  const labCounts = useMemo(() => {
    const sefTotal = (metrics?.byLab as any)?.sef ?? (metrics?.byLab as any)?.saf ?? 0;
    return {
      sef: sefTotal,
      saf: sefTotal,
      penicillin: metrics?.byLab?.penicillin ?? 0,
      general: metrics?.byLab?.general ?? 0,
      total: metrics?.total ?? 0,
    };
  }, [metrics]);

  // Handle column header sorting
  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-teal-600 font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-teal-600 font-bold" />
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Laboratory Selection Panel — Three Professional Clickable Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Select Analytical Unit
            </span>
            <span className="text-[10px] text-slate-400">• Click any laboratory to filter records</span>
          </div>

          {/* Quick toggle for All Facilities */}
          <button
            type="button"
            onClick={() => selectLaboratory('all')}
            className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors border flex items-center gap-1.5 cursor-pointer',
              isAllLabs
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Laboratories ({labCounts.total})</span>
          </button>
        </div>

        {/* 3 Clickable Laboratory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {LAB_TABS.map((lab) => {
            const Icon = lab.icon;
            const isSelected = !isAllLabs && activeLab.id === lab.id;
            const count = labCounts[lab.id as keyof typeof labCounts] || 0;

            return (
              <button
                key={lab.id}
                type="button"
                onClick={() => selectLaboratory(lab.id)}
                aria-pressed={isSelected}
                className={cn(
                  'relative group flex items-center justify-between p-4 rounded-2xl text-left transition-all duration-200 border cursor-pointer',
                  isSelected
                    ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                )}
              >
                {/* Active indicator bar */}
                {isSelected && (
                  <span className="absolute top-0 left-6 right-6 h-0.5 bg-blue-600 rounded-b-full" />
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center transition-colors shadow-2xs shrink-0',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      className={cn(
                        'text-sm font-bold tracking-tight',
                        isSelected ? 'text-blue-950 font-bold' : 'text-slate-900'
                      )}
                    >
                      {lab.name}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      {count} Samples
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs shrink-0">
                  {isSelected ? (
                    <span className="font-semibold text-blue-700 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>Viewing Lab</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 group-hover:text-blue-700 font-medium flex items-center gap-1">
                      <span>Select Lab</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Page Title Header: Selected Laboratory in Heading & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-6 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{isAllLabs ? 'Sampling / All Laboratories' : activeLab.heading}</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => setIsAccessionModalOpen(true)}
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 text-white" />
            <span>Add New Sample</span>
          </Button>
        </div>
      </div>

      {/* 3. Comprehensive Business Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-navy-900" />
            <span className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Search & Filter Sampling Records
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100/70 border border-rose-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Row 1: Dedicated Search Inputs (Sample ID, Nomenclature, Batch/Lot) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search by Sample ID */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Hash className="h-3 w-3 text-slate-400" />
              <span>Search Sample ID</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={sampleIdSearch}
                onChange={(e) => {
                  setSampleIdSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. SMP-2026-0001"
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 font-mono text-slate-800 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              {sampleIdSearch && (
                <button
                  type="button"
                  onClick={() => setSampleIdSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search by Nomenclature */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3 text-slate-400" />
              <span>Search Nomenclature</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={nomenclatureSearch}
                onChange={(e) => {
                  setNomenclatureSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. Paracetamol, Amoxicillin..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              {nomenclatureSearch && (
                <button
                  type="button"
                  onClick={() => setNomenclatureSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search by Batch / Lot No. */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3 text-slate-400" />
              <span>Search Batch / Lot No.</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={batchSearch}
                onChange={(e) => {
                  setBatchSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. CP-2026-B892, HAP-..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-mono rounded-lg border border-slate-200 text-slate-800 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              {batchSearch && (
                <button
                  type="button"
                  onClick={() => setBatchSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Granular Filters (Date Range, Stage/Type, Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white"
            />
          </div>

          {/* Filter by Stage / Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Stage / Type
            </label>
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium"
            >
              <option value="">All Stages & Types</option>
              {SAMPLE_STAGES.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Workflow Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium"
            >
              <option value="">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="LOGGED">Logged</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="TESTING_IN_PROGRESS">Testing In Progress</option>
              <option value="REVIEW_PENDING">Review Pending</option>
              <option value="APPROVED">Approved / Released</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Professional Sampling Records Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Top Bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-navy-950 uppercase tracking-wider">
              {isAllLabs ? 'All Sampling Records' : `${activeLab.name} Records`}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({meta.total} {meta.total === 1 ? 'record' : 'records'} total)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span>Show:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 text-xs rounded border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-navy-900"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>

            <span className="text-[11px] font-mono text-slate-400 border-l pl-3 border-slate-200">
              {isAllLabs ? 'FACILITY_ALL' : `SUITE_${activeLab.key}`}
            </span>
          </div>
        </div>

        {/* Scrollable Data Table Container */}
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-slate-600 uppercase tracking-wider font-bold select-none">
                {/* 1. A. No. */}
                <th
                  onClick={() => handleSort('accessionNo')}
                  className="py-3 px-3.5 w-[95px] min-w-[95px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>A. No.</span>
                    {renderSortIcon('accessionNo')}
                  </div>
                </th>

                {/* 2. Date & Time */}
                <th
                  onClick={() => handleSort('samplingDate')}
                  className="py-3 px-3.5 w-[140px] min-w-[140px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Date & Time</span>
                    {renderSortIcon('samplingDate')}
                  </div>
                </th>

                {/* 3. Nomenclature */}
                <th
                  onClick={() => handleSort('nomenclature')}
                  className="py-3 px-3.5 min-w-[220px] max-w-xs cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Nomenclature</span>
                    {renderSortIcon('nomenclature')}
                  </div>
                </th>

                {/* 4. Sample ID */}
                <th
                  onClick={() => handleSort('sampleCode')}
                  className="py-3 px-3.5 w-[130px] min-w-[130px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Sample ID</span>
                    {renderSortIcon('sampleCode')}
                  </div>
                </th>

                {/* 5. Stage / Type */}
                <th
                  onClick={() => handleSort('sampleType')}
                  className="py-3 px-3.5 w-[135px] min-w-[135px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Stage / Type</span>
                    {renderSortIcon('sampleType')}
                  </div>
                </th>

                {/* 6. Qty. of Sample */}
                <th
                  onClick={() => handleSort('sampleQty')}
                  className="py-3 px-3.5 w-[110px] min-w-[110px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Qty. of Sample</span>
                    {renderSortIcon('sampleQty')}
                  </div>
                </th>

                {/* 7. Batch No. / Lot No. */}
                <th
                  onClick={() => handleSort('lotNumber')}
                  className="py-3 px-3.5 w-[135px] min-w-[135px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Batch No. / Lot No.</span>
                    {renderSortIcon('lotNumber')}
                  </div>
                </th>

                {/* 8. MFG Date */}
                <th
                  onClick={() => handleSort('mfgDate')}
                  className="py-3 px-3.5 w-[105px] min-w-[105px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>MFG Date</span>
                    {renderSortIcon('mfgDate')}
                  </div>
                </th>

                {/* 9. EXP Date */}
                <th
                  onClick={() => handleSort('expDate')}
                  className="py-3 px-3.5 w-[105px] min-w-[105px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>EXP Date</span>
                    {renderSortIcon('expDate')}
                  </div>
                </th>

                {/* 10. Submitted By */}
                <th
                  onClick={() => handleSort('submittedBy')}
                  className="py-3 px-3.5 min-w-[150px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Submitted By</span>
                    {renderSortIcon('submittedBy')}
                  </div>
                </th>

                {/* 11. Received By */}
                <th className="py-3 px-3.5 min-w-[140px]">
                  <span>Received By</span>
                </th>

                {/* 12. Actions */}
                <th className="py-3 px-3.5 min-w-[145px] text-right">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* State A: Loading State */}
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-14" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-44" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-5 bg-slate-200 rounded-full w-20" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-3.5 px-3.5 text-right"><div className="h-6 bg-slate-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : isError ? (
                /* State B: Error State */
                <tr>
                  <td colSpan={12} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                      <div className="flex items-center justify-center gap-2 font-bold text-sm">
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                        <span>Failed to Load Sampling Records</span>
                      </div>
                      <p className="text-xs text-rose-600">
                        {(error as any)?.message || 'An error occurred while communicating with the City Pharma LIMS API.'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                        className="text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        <span>Retry Loading</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : samplesList.length === 0 ? (
                /* State C: Empty State */
                <tr>
                  <td colSpan={12} className="py-14 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                        <FlaskConical className="h-6 w-6 text-slate-400" />
                      </div>
                      <h4 className="text-sm font-bold text-navy-950">No Sampling Records Found</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {hasActiveFilters
                          ? 'No samples match the active search criteria or filters. Try adjusting your search term, date range, or stage.'
                          : `No analytical samples have been registered for ${isAllLabs ? 'any laboratory' : activeLab.name} yet.`}
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {hasActiveFilters ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleResetFilters}
                            className="text-xs border-slate-200 text-slate-700"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            <span>Clear All Filters</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setIsAccessionModalOpen(true)}
                            className="bg-navy-900 text-white text-xs font-semibold"
                          >
                            <PlusCircle className="h-3.5 w-3.5 text-teal-400 mr-1" />
                            <span>Add New Sample</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                /* State D: Data Rows */
                samplesList.map((sample) => {
                  const mfgFormatted = sample.mfgDate
                    ? formatDateTime(sample.mfgDate, 'dd/MM/yyyy')
                    : sample.batch?.manufacturingDate
                    ? formatDateTime(sample.batch.manufacturingDate, 'dd/MM/yyyy')
                    : '—';

                  const expFormatted = sample.expDate
                    ? formatDateTime(sample.expDate, 'dd/MM/yyyy')
                    : sample.batch?.expiryDate
                    ? formatDateTime(sample.batch.expiryDate, 'dd/MM/yyyy')
                    : '—';

                  const batchLotText = sample.lotNumber || sample.batch?.batchNumber || '—';
                  const submittedText = sample.submittedBy || 'Plant Production';
                  const receivedText = sample.accessionedBy?.fullName || sample.assignedTo?.fullName || 'QC Intake Officer';

                  return (
                    <tr
                      key={sample.id}
                      onClick={() => setSelectedSampleId(sample.id)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      {/* 1. A. No. (Readable serial number, not primary key) */}
                      <td className="py-3 px-3.5 font-mono font-bold text-navy-950 group-hover:text-teal-700 text-xs">
                        {sample.accessionNo || 'A-0001'}
                      </td>

                      {/* 2. Date & Time */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatDateTime(sample.samplingDate, 'dd/MM/yyyy HH:mm')}
                      </td>

                      {/* 3. Nomenclature */}
                      <td className="py-3 px-3.5 min-w-[220px] max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1 group-hover:text-navy-950">
                          {sample.nomenclature || sample.materialName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {sample.sourceSupplier || 'City Pharma Formulations'}
                        </div>
                        {sample.submissions && sample.submissions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {sample.submissions.slice(0, 2).map((s) => (
                              <span
                                key={s.id}
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-teal-50 text-teal-800 border border-teal-200"
                              >
                                <Send className="h-2 w-2" />
                                <span>
                                  {s.destinationLab === 'MICROBIOLOGY'
                                    ? 'Microbiology'
                                    : s.destinationLab === 'CHEMICAL'
                                    ? 'Chemical'
                                    : 'Physical'}
                                </span>
                                <span className="text-slate-400 font-medium">({s.status})</span>
                              </span>
                            ))}
                            {sample.submissions.length > 2 && (
                              <span className="text-[9px] text-slate-400 font-medium">
                                +{sample.submissions.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 4. Sample ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-teal-800 whitespace-nowrap">
                        <div>{sample.sampleCode}</div>
                        <div className="text-[10px] font-normal text-slate-400 flex items-center gap-1 mt-0.5">
                          <QrCode className="h-2.5 w-2.5 text-slate-400" />
                          <span className="truncate">{sample.barcode || `CP-${sample.sampleCode}`}</span>
                        </div>
                      </td>

                      {/* 5. Stage / Type */}
                      <td className="py-3 px-3.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 inline-block whitespace-nowrap">
                          {sample.stageType || (sample.sampleType ? sample.sampleType.replace(/_/g, ' ') : '—')}
                        </span>
                      </td>

                      {/* 6. Qty. of Sample */}
                      <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                        {sample.sampleQty} {sample.unit}
                      </td>

                      {/* 7. Batch No. / Lot No. */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200/70 inline-block whitespace-nowrap">
                          {batchLotText}
                        </span>
                      </td>

                      {/* 8. MFG Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {mfgFormatted}
                      </td>

                      {/* 9. EXP Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {expFormatted}
                      </td>

                      {/* 10. Submitted By */}
                      <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[160px] truncate" title={submittedText}>
                        {submittedText}
                      </td>

                      {/* 11. Received By */}
                      <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[150px] truncate" title={receivedText}>
                        {receivedText}
                      </td>

                      {/* 12. Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* View Record Details */}
                          <button
                            type="button"
                            title="View Record Dossier"
                            onClick={() => setSelectedSampleId(sample.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-navy-950 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Submit / Route Workflow Action */}
                          <button
                            type="button"
                            title="Submit Sample to Testing Workflow (Microbiology, Chemical, Physical)"
                            onClick={() => setSubmittingSample(sample)}
                            className="p-1.5 rounded-lg text-teal-700 hover:text-teal-950 hover:bg-teal-50 transition-colors cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Record (Permissions checked) */}
                          <button
                            type="button"
                            title={
                              canEdit
                                ? 'Edit Sample Record'
                                : 'Permission required: QA Manager, QC Analyst, or Admin'
                            }
                            disabled={!canEdit}
                            onClick={() => setEditingSample(sample)}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              canEdit
                                ? 'text-teal-700 hover:text-teal-900 hover:bg-teal-50 cursor-pointer'
                                : 'text-slate-300 cursor-not-allowed'
                            )}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Print Record */}
                          <button
                            type="button"
                            title="Print Official Record Dossier"
                            onClick={() => setPrintingSample(sample)}
                            className="p-1.5 rounded-lg text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar (Server-Side) */}
        <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white text-xs">
          <div className="text-slate-500">
            {meta.total > 0 ? (
              <span>
                Showing <strong className="text-slate-800">{(meta.page - 1) * meta.limit + 1}</strong> to{' '}
                <strong className="text-slate-800">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </strong>{' '}
                of <strong className="text-slate-800">{meta.total}</strong> records
              </span>
            ) : (
              <span>0 records</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Previous Button */}
            <button
              type="button"
              disabled={meta.page <= 1 || isLoading}
              onClick={() => setPage(Math.max(1, page - 1))}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors',
                meta.page <= 1 || isLoading
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            {/* Page number indicators */}
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const pageNumber = i + 1;
              const isCurrent = meta.page === pageNumber;
              return (
                <button
                  key={`page-${pageNumber}`}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer',
                    isCurrent
                      ? 'bg-navy-900 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}

            {meta.totalPages > 5 && (
              <span className="text-slate-400 px-1">...</span>
            )}

            {/* Next Button */}
            <button
              type="button"
              disabled={meta.page >= meta.totalPages || isLoading}
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors',
                meta.page >= meta.totalPages || isLoading
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
              )}
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. View Record Details Dossier Modal */}
      {selectedSampleId && (
        <Modal
          isOpen={!!selectedSampleId}
          onClose={() => setSelectedSampleId(null)}
          title={`Sample Record Dossier: ${sampleDetail?.accessionNo || sampleDetail?.sampleCode || 'Loading...'}`}
          subtitle={`Material: ${sampleDetail?.nomenclature || sampleDetail?.materialName || ''}`}
          maxWidth="3xl"
        >
          {isDetailLoading ? (
            <div className="py-12 text-center text-slate-400">Loading full sample records...</div>
          ) : sampleDetail ? (
            <div className="space-y-6">
              {/* Top Banner with Barcode, Laboratory Assignment & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-navy-900 text-white">
                      {sampleDetail.accessionNo || 'A-0001'}
                    </span>
                    <span className="text-base font-bold font-mono text-navy-950">
                      {sampleDetail.sampleCode}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                      {sampleDetail.laboratory ? `${sampleDetail.laboratory} LAB` : 'GENERAL LAB'}
                    </span>
                    <StatusBadge status={sampleDetail.status} />
                    <StatusBadge status={sampleDetail.priority} />
                  </div>
                  <div className="font-mono text-xs tracking-widest text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200 inline-block mt-1">
                    * {sampleDetail.barcode || `CP-${sampleDetail.sampleCode}`} *
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPrintingSample(sampleDetail);
                    }}
                    className="text-xs border-slate-300 text-slate-700"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    <span>Print Dossier</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSubmittingSample(sampleDetail);
                    }}
                    className="text-xs border-teal-300 bg-teal-50/60 text-teal-800 hover:bg-teal-100 font-semibold"
                  >
                    <Send className="h-3.5 w-3.5 mr-1 text-teal-700" />
                    <span>Submit to Workflow</span>
                  </Button>

                  {canEdit && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setEditingSample(sampleDetail);
                      }}
                      className="bg-navy-900 text-white text-xs font-semibold"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-teal-400 mr-1" />
                      <span>Edit Record</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Exact 12 Business Fields Display */}
              <div>
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-teal-700" />
                  <span>Analytical Intake Record Fields</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">A. No. (Serial No.)</span>
                    <span className="font-mono font-bold text-navy-950">{sampleDetail.accessionNo || 'A-0001'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date & Time</span>
                    <span className="font-mono text-slate-800">{formatDateTime(sampleDetail.samplingDate, 'dd/MM/yyyy HH:mm')}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nomenclature</span>
                    <span className="font-bold text-navy-950 line-clamp-1">{sampleDetail.nomenclature || sampleDetail.materialName}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sample ID</span>
                    <span className="font-mono font-bold text-teal-800">{sampleDetail.sampleCode}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stage / Type</span>
                    <span className="font-medium text-slate-800">
                      {sampleDetail.stageType || (sampleDetail.sampleType ? sampleDetail.sampleType.replace(/_/g, ' ') : '—')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Qty. of Sample</span>
                    <span className="font-mono text-slate-800">{sampleDetail.sampleQty} {sampleDetail.unit}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Batch No. / Lot No.</span>
                    <span className="font-mono font-bold text-slate-800">{sampleDetail.lotNumber || sampleDetail.batch?.batchNumber || 'N/A'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">MFG Date</span>
                    <span className="font-mono text-slate-800">
                      {sampleDetail.mfgDate ? formatDateTime(sampleDetail.mfgDate, 'dd/MM/yyyy') : '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">EXP Date</span>
                    <span className="font-mono text-slate-800">
                      {sampleDetail.expDate ? formatDateTime(sampleDetail.expDate, 'dd/MM/yyyy') : '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Submitted By</span>
                    <span className="text-slate-800 truncate block">{sampleDetail.submittedBy || 'Plant Production'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Received By</span>
                    <span className="text-slate-800 truncate block">{sampleDetail.accessionedBy?.fullName || sampleDetail.assignedTo?.fullName || 'QC Intake Officer'}</span>
                  </div>
                </div>
              </div>

              {/* Status Transition Action */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="text-xs">
                  <span className="font-bold text-navy-950 block">Update Workflow Status</span>
                  <span className="text-slate-500 text-[11px]">Requires 21 CFR Part 11 Electronic Justification</span>
                </div>

                <select
                  value={sampleDetail.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    const reason = prompt(
                      '21 CFR Part 11: Reason for status change:',
                      'Progressing analytical testing'
                    );
                    if (reason) {
                      updateStatusMutation.mutate({
                        id: sampleDetail.id,
                        status: newStatus,
                        reason,
                      });
                    }
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:ring-1 focus:ring-navy-900"
                >
                  <option value="RECEIVED">Received</option>
                  <option value="LOGGED">Logged</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="TESTING_IN_PROGRESS">Testing In Progress</option>
                  <option value="REVIEW_PENDING">Review Pending</option>
                  <option value="APPROVED">Approved / Released</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Destination Laboratory Routing Submissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-teal-700" />
                    <span>Laboratory Routing Submissions ({sampleDetail.submissions?.length || 0})</span>
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSubmittingSample(sampleDetail)}
                    className="text-[11px] h-7 px-2.5 border-teal-300 text-teal-800 bg-teal-50 hover:bg-teal-100 font-semibold"
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
                    <span>Route Sample</span>
                  </Button>
                </div>

                {(!sampleDetail.submissions || sampleDetail.submissions.length === 0) ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                    No destination laboratory routing records found. Click &quot;Route Sample&quot; to submit to Microbiology, Chemical, or Physical Lab.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sampleDetail.submissions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-navy-950">
                              {sub.destinationLab === 'MICROBIOLOGY'
                                ? 'Microbiology Lab'
                                : sub.destinationLab === 'CHEMICAL'
                                ? 'Chemical Lab'
                                : 'Physical Lab'}
                            </span>
                            <StatusBadge status={sub.status} />
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Submitted by <strong>{sub.submittedByName || sub.submittedBy?.fullName || 'Authorized Analyst'}</strong> on{' '}
                            {formatDateTime(sub.submissionDate, 'dd/MM/yyyy HH:mm')}
                          </div>
                          {sub.remarks && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded mt-1 border border-slate-200/60">
                              <span className="font-semibold text-slate-500">Remarks:</span> {sub.remarks}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Tests Worksheets */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Compendial Test Worksheets ({sampleDetail.tests?.length || 0})</span>
                </h4>
                <div className="space-y-2">
                  {sampleDetail.tests?.map((test: any) => (
                    <div
                      key={test.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{test.testSpecification.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Method: {test.testSpecification.pharmacopeiaMethod} • Spec:{' '}
                          {test.minLimit !== null ? `${test.minLimit} - ${test.maxLimit} ${test.unit || ''}` : 'Qualitative'}
                        </div>
                        {test.numericResult !== null && (
                          <div className="mt-1 font-mono text-xs">
                            Observed Result: <strong className="text-slate-900">{test.numericResult} {test.unit}</strong>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={test.resultStatus} />
                        <StatusBadge status={test.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chain of Custody Timeline */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-teal-700" />
                  <span>Chain of Custody (21 CFR Part 11 Audit Trail)</span>
                </h4>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {sampleDetail.chainOfCustody || 'Sample initial intake registered.'}
                </pre>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* 7. Edit Sample Record Modal (Permissions Enforced) */}
      <EditSampleModal
        isOpen={!!editingSample}
        onClose={() => setEditingSample(null)}
        sample={editingSample}
      />

      {/* 8. Print-Friendly Sample Record Modal */}
      <PrintSampleModal
        isOpen={!!printingSample}
        onClose={() => setPrintingSample(null)}
        sample={printingSample}
      />

      {/* 9. Submit Sample Workflow Modal */}
      <SubmitSampleModal
        isOpen={!!submittingSample}
        onClose={() => setSubmittingSample(null)}
        sample={submittingSample}
      />

      {/* 10. Accession Modal pre-targeted with current active laboratory */}
      <NewSampleModal
        isOpen={isAccessionModalOpen}
        onClose={() => setIsAccessionModalOpen(false)}
        defaultLaboratory={isAllLabs ? 'GENERAL' : activeLab.key}
        onSampleCreated={(newSample) => {
          handleResetFilters();
          setSelectedSampleId(newSample.id);
        }}
      />
    </div>
  );
}

export default function SamplesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-slate-400">Loading sampling records...</div>
      }
    >
      <SamplesPageInner />
    </Suspense>
  );
}
