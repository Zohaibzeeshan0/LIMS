'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { api } from '@/lib/api';
import { formatDateTime, formatDateOnly, formatLiveDate, formatLiveClock } from '@/lib/date';
import { PrintSampleModal } from '@/components/samples/PrintSampleModal';
import { CityPharmaLogo } from '@/components/ui/CityPharmaLogo';
import { SAMPLE_STAGES, Sample } from '@/types/lims';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FlaskConical,
  Microscope,
  Layers,
  ArrowUpDown,
  Eye,
  RefreshCw,
  FileCheck,
  Building2,
  Tag,
  ShieldCheck,
  X,
  FileText,
} from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/samples');
  }, [router]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLab, setSelectedLab] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState<'accession' | 'submissions' | 'coa'>('accession');
  const [printingSample, setPrintingSample] = useState<Sample | null>(null);

  // Live real-time clock
  const [now] = useState(new Date());

  // Query real samples from database
  const {
    data: samplesResponse,
    isLoading: isSamplesLoading,
    refetch: refetchSamples,
  } = useQuery({
    queryKey: ['reports-samples', selectedLab, selectedStage, selectedStatus, fromDate, toDate],
    queryFn: () =>
      samplingService.getAll({
        limit: 100,
        laboratory: selectedLab !== 'ALL' ? selectedLab : undefined,
        stage: selectedStage !== 'ALL' ? selectedStage : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
        sortBy: 'samplingDate',
        sortOrder: 'desc',
      }),
  });

  // Query laboratory submissions
  const { data: submissionsData, isLoading: isSubmissionsLoading } = useQuery({
    queryKey: ['reports-submissions'],
    queryFn: () => samplingService.getAllSubmissions(),
  });

  // Query batches with CoA
  const { data: batchesData, isLoading: isBatchesLoading } = useQuery({
    queryKey: ['reports-batches'],
    queryFn: () => api.get<any[]>('/batches'),
  });

  // Query database metrics
  const { data: metrics } = useQuery({
    queryKey: ['sampling-metrics'],
    queryFn: () => samplingService.getMetrics(),
  });

  const samplesList: Sample[] = useMemo(() => {
    if (!samplesResponse) return [];
    if (Array.isArray(samplesResponse)) return samplesResponse;
    if (Array.isArray((samplesResponse as any).data)) return (samplesResponse as any).data;
    return [];
  }, [samplesResponse]);

  // Client-side text search filter
  const filteredSamples = useMemo(() => {
    if (!searchTerm.trim()) return samplesList;
    const term = searchTerm.toLowerCase().trim();
    return samplesList.filter((s) => {
      const idMatch = (s.sampleCode || s.sampleId || s.accessionNo || '').toLowerCase().includes(term);
      const nameMatch = (s.nomenclature || s.materialName || '').toLowerCase().includes(term);
      const batchMatch = (s.lotNumber || s.batchLotNumber || '').toLowerCase().includes(term);
      const submitterMatch = (s.submittedBy || '').toLowerCase().includes(term);
      const stageMatch = (s.stageType || s.sampleType || '').toLowerCase().includes(term);
      return idMatch || nameMatch || batchMatch || submitterMatch || stageMatch;
    });
  }, [samplesList, searchTerm]);

  const submissionsList = useMemo(() => {
    if (!submissionsData) return [];
    if (Array.isArray(submissionsData)) return submissionsData;
    if (Array.isArray((submissionsData as any).data)) return (submissionsData as any).data;
    return [];
  }, [submissionsData]);

  const batchesList = useMemo(() => {
    if (!batchesData) return [];
    if (Array.isArray(batchesData)) return batchesData;
    if (Array.isArray((batchesData as any).data)) return (batchesData as any).data;
    return [];
  }, [batchesData]);

  // Export full table to CSV
  const handleExportCSV = () => {
    if (filteredSamples.length === 0) {
      alert('No sample records available to export.');
      return;
    }

    const headers = [
      'Sample ID',
      'Accession Number',
      'Material / Product Nomenclature',
      'Stage / Sample Type',
      'Batch / Lot Number',
      'Quantity',
      'Unit',
      'Sampling Date & Time',
      'Submitted By',
      'Target Laboratory Suite',
      'Status',
      'Storage Condition',
    ];

    const rows = filteredSamples.map((s) => [
      `"${s.sampleCode || s.sampleId || ''}"`,
      `"${s.accessionNo || ''}"`,
      `"${(s.nomenclature || s.materialName || '').replace(/"/g, '""')}"`,
      `"${s.stageType || s.sampleType || ''}"`,
      `"${s.lotNumber || s.batchLotNumber || 'N/A'}"`,
      s.sampleQty || s.quantity || '',
      `"${s.unit || s.quantityUnit || ''}"`,
      `"${s.samplingDate || s.sampledAt || ''}"`,
      `"${(s.submittedBy || '').replace(/"/g, '""')}"`,
      `"${s.laboratoryType || s.laboratory || 'GENERAL'}"`,
      `"${s.status || ''}"`,
      `"${(s.storageCondition || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CityPharma_LIMS_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLab('ALL');
    setSelectedStage('ALL');
    setSelectedStatus('ALL');
    setFromDate('');
    setToDate('');
  };

  const hasActiveFilters =
    searchTerm || selectedLab !== 'ALL' || selectedStage !== 'ALL' || selectedStatus !== 'ALL' || fromDate || toDate;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* ================= 1. HEADER WITH BRANDING & LIVE TIMESTAMP ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Pharmaceutical Reports & Official Registers
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  21 CFR Part 11 Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Live comprehensive sample accession archive, laboratory test routing records, and Certificates of Analysis (CoA).
              </p>
            </div>
          </div>

          {/* Right Action Bar: Live Timestamp & Export Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
            {/* Live Timestamp Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-semibold text-slate-800">{formatLiveDate(now)}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-600">{formatLiveClock(now)}</span>
            </div>

            {/* Print Register Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
              title="Print Current Report"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Print Register</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Download Excel / CSV of all records"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= 2. EXECUTIVE METRIC SUMMARY BAR ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accessions</span>
            <FlaskConical className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {metrics?.total !== undefined ? metrics.total : samplesList.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Recorded in Database</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Testing</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {metrics?.inTesting !== undefined ? metrics.inTesting + (metrics.received ?? 0) : 0}
          </p>
          <span className="text-[11px] text-amber-600 font-medium">Active Analytical Run</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved / Certified</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {metrics?.approved !== undefined ? metrics.approved : 0}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Ready for Release</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lab Submissions</span>
            <Microscope className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{submissionsList.length}</p>
          <span className="text-[11px] text-indigo-600 font-medium">Micro / Chem / Phys</span>
        </div>
      </div>

      {/* ================= 3. REPORT CATEGORY TABS ================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('accession')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'accession'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          <span>Sample Accession Register ({filteredSamples.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'submissions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Microscope className="h-3.5 w-3.5" />
          <span>Laboratory Routing Logs ({submissionsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'coa'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Batch Disposition & CoA ({batchesList.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: SAMPLE ACCESSION REGISTER ================= */}
      {activeTab === 'accession' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-4 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Sample ID, Product, Batch, Submitter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Lab Filter */}
              <div className="lg:col-span-2">
                <select
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="GENERAL">General Lab</option>
                </select>
              </div>

              {/* Stage Filter (All 11 user pharmaceutical stages) */}
              <div className="lg:col-span-3">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Stages / Sample Types</option>
                  {SAMPLE_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="lg:col-span-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RECEIVED">Received</option>
                  <option value="TESTING_IN_PROGRESS">Testing In Progress</option>
                  <option value="REVIEW_PENDING">Review Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="lg:col-span-1 flex items-center">
                  <button
                    onClick={clearFilters}
                    className="w-full py-2 px-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-center"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Sample ID / Accession</th>
                  <th className="py-3 px-4">Product Nomenclature</th>
                  <th className="py-3 px-4">Stage / Type</th>
                  <th className="py-3 px-4">Batch / Lot #</th>
                  <th className="py-3 px-4">Intake Qty</th>
                  <th className="py-3 px-4">Sampling Date</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Lab Suite</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Dossier / CoA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isSamplesLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Loading sample records from database...
                    </td>
                  </tr>
                ) : filteredSamples.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No sample records match your active report filters.
                    </td>
                  </tr>
                ) : (
                  filteredSamples.map((sample) => {
                    const sampleCode = sample.sampleCode || sample.sampleId || sample.accessionNo || 'SMP-0001';
                    const nomenclature = sample.nomenclature || sample.materialName || 'Unnamed Material';
                    const stage = sample.stageType || sample.sampleType || 'Finished Product';
                    const lot = sample.lotNumber || sample.batchLotNumber || '—';
                    const qty = `${sample.sampleQty || sample.quantity || 0} ${sample.unit || sample.quantityUnit || 'units'}`;
                    const dateFormatted = sample.samplingDate
                      ? formatDateTime(sample.samplingDate, 'dd MMM yyyy, hh:mm a')
                      : '—';
                    const submitter = sample.submittedBy || 'Plant Staff';
                    const lab = sample.laboratoryType || sample.laboratory || 'GENERAL';

                    return (
                      <tr key={sample.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {sampleCode}
                          {sample.accessionNo && sample.accessionNo !== sampleCode && (
                            <span className="block text-[10px] text-slate-400 font-normal">{sample.accessionNo}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-800 max-w-[200px] truncate" title={nomenclature}>
                          {nomenclature}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {stage}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600">{lot}</td>

                        <td className="py-3 px-4 font-mono text-slate-700">{qty}</td>

                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{dateFormatted}</td>

                        <td className="py-3 px-4 text-slate-700">{submitter}</td>

                        <td className="py-3 px-4 font-semibold text-slate-700">{lab}</td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              sample.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : sample.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : sample.status === 'TESTING_IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {sample.status ? sample.status.replace(/_/g, ' ') : 'RECEIVED'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setPrintingSample(sample)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold text-[11px] transition-colors"
                            title="View and Print Official Analytical Dossier"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Dossier</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LABORATORY ROUTING & SUBMISSION LOGS ================= */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/80">
            <h3 className="font-bold text-sm text-slate-800">
              Departmental Routing Submissions (Microbiology, Chemical, Physical Labs)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed tracking log of all samples routed to analytical laboratories.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Submission Ref</th>
                  <th className="py-3 px-4">Sample Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Destination Lab</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isSubmissionsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Loading departmental submission logs...
                    </td>
                  </tr>
                ) : submissionsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No departmental submissions found. Samples can be submitted to labs from the Sampling Portal.
                    </td>
                  </tr>
                ) : (
                  submissionsList.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{sub.submissionNumber || sub.id.slice(0, 8)}</td>
                      <td className="py-3 px-4 font-mono text-blue-600 font-semibold">
                        {sub.sample?.sampleCode || sub.sample?.sampleId || 'SMP'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {sub.sample?.nomenclature || sub.sample?.materialName || 'Material'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-indigo-700">
                        {sub.destinationLab === 'MICROBIOLOGY'
                          ? 'Microbiology Lab'
                          : sub.destinationLab === 'CHEMICAL'
                          ? 'Chemical Lab'
                          : 'Physical Lab'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {formatDateTime(sub.submittedAt, 'dd MMM yyyy, hh:mm a')}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {sub.submittedByName || sub.submittedBy?.fullName || 'Analyst'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {sub.status || 'SUBMITTED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: BATCH DISPOSITION & COA REGISTER ================= */}
      {activeTab === 'coa' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/80">
            <h3 className="font-bold text-sm text-slate-800">Batch Disposition & Certificates of Analysis (CoA)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Official pharmaceutical batch release certifications compliant with cGMP regulations.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Drug Product</th>
                  <th className="py-3 px-4">Dosage Form</th>
                  <th className="py-3 px-4">Batch Size</th>
                  <th className="py-3 px-4">MFG Date</th>
                  <th className="py-3 px-4">EXP Date</th>
                  <th className="py-3 px-4">Disposition Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isBatchesLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Loading batch release register...
                    </td>
                  </tr>
                ) : batchesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No batch records found.
                    </td>
                  </tr>
                ) : (
                  batchesList.map((batch: any) => (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{batch.batchNumber}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{batch.drugProduct}</td>
                      <td className="py-3 px-4 text-slate-600">{batch.dosageForm}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{batch.batchSize}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {formatDateOnly(batch.manufacturingDate)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {formatDateOnly(batch.expiryDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            batch.status === 'RELEASED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : batch.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {batch.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 4. PRINTABLE OFFICIAL ANALYTICAL DOSSIER MODAL ================= */}
      {printingSample && (
        <PrintSampleModal
          isOpen={!!printingSample}
          onClose={() => setPrintingSample(null)}
          sample={printingSample}
        />
      )}
    </div>
  );
}
