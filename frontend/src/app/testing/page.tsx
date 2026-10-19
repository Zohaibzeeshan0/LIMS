'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/date';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
  Gauge,
  UserCheck,
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  Beaker,
} from 'lucide-react';

export default function TestingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected test for recording results
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [numericResult, setNumericResult] = useState<string>('');
  const [textResult, setTextResult] = useState<string>('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [rawDataReference, setRawDataReference] = useState<string>('');
  const [comments, setComments] = useState<string>('');

  // Load all samples with tests
  const { data: samplesResponse, isLoading } = useQuery({
    queryKey: ['samples-for-testing'],
    queryFn: () => api.get<any>('/samples?limit=100'),
  });

  // Extract array safely whether backend returns direct array or paginated object
  const samplesList: any[] = React.useMemo(() => {
    if (!samplesResponse) return [];
    if (Array.isArray(samplesResponse)) return samplesResponse;
    if (Array.isArray(samplesResponse.data)) return samplesResponse.data;
    return [];
  }, [samplesResponse]);

  // Load available instruments
  const { data: instrumentsResponse } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api.get<any>('/instruments'),
  });

  const instruments: any[] = React.useMemo(() => {
    if (!instrumentsResponse) return [];
    if (Array.isArray(instrumentsResponse)) return instrumentsResponse;
    if (Array.isArray((instrumentsResponse as any).data)) return (instrumentsResponse as any).data;
    return [];
  }, [instrumentsResponse]);

  // Flatten sample tests for analytical worksheet table
  const allTests = React.useMemo(() => {
    return samplesList.flatMap((s) =>
      (s.tests || []).map((t: any) => ({
        ...t,
        sampleCode: s.sampleCode || s.sampleId,
        materialName: s.materialName || s.nomenclature,
        samplePriority: s.priority,
        batchNumber: s.batch?.batchNumber || s.lotNumber || s.batchLotNumber,
      }))
    );
  }, [samplesList]);

  // Filtered tests
  const filteredTests = React.useMemo(() => {
    return allTests.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (categoryFilter && t.testSpecification?.category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCode = t.sampleCode?.toLowerCase().includes(term);
        const matchName = t.materialName?.toLowerCase().includes(term);
        const matchTest = t.testSpecification?.name?.toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchTest) return false;
      }
      return true;
    });
  }, [allTests, statusFilter, categoryFilter, searchTerm]);

  // Mutation to record result
  const recordResultMutation = useMutation({
    mutationFn: (data: any) =>
      api.patch(`/tests/${activeTest.id}/record-result`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples-for-testing'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setActiveTest(null);
      setNumericResult('');
      setTextResult('');
      setRawDataReference('');
      setComments('');
    },
  });

  // Mutation to verify test
  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tests/${id}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples-for-testing'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    },
  });

  const openRecordModal = (test: any) => {
    setActiveTest(test);
    setNumericResult(test.numericResult !== null && test.numericResult !== undefined ? String(test.numericResult) : '');
    setTextResult(test.textResult || '');
    setSelectedInstrumentId(test.instrumentId || '');
    setRawDataReference(test.rawDataReference || '');
    setComments(test.comments || '');
  };

  // Instant Real-Time Specification Calculation
  const evaluatedStatus = React.useMemo(() => {
    if (!activeTest || numericResult === '') return null;
    const num = parseFloat(numericResult);
    if (isNaN(num)) return null;

    const min = activeTest.minLimit ?? activeTest.testSpecification.defaultMinLimit;
    const max = activeTest.maxLimit ?? activeTest.testSpecification.defaultMaxLimit;

    if (min !== null && min !== undefined && num < min) return 'OUT_OF_SPEC';
    if (max !== null && max !== undefined && num > max) return 'OUT_OF_SPEC';
    return 'WITHIN_SPEC';
  }, [activeTest, numericResult]);

  const handleSubmitResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTest) return;

    recordResultMutation.mutate({
      numericResult: numericResult !== '' ? parseFloat(numericResult) : undefined,
      textResult: textResult || undefined,
      instrumentId: selectedInstrumentId || undefined,
      rawDataReference,
      comments,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-950 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-teal-700" />
            <span>Analytical Testing & Worksheets</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Compendial worksheet calculations, chromatogram raw data references, and automated limit evaluations
          </p>
        </div>
      </div>

      {/* Phase 2 Roadmap Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-teal-800 shadow-xs shrink-0 mt-0.5">
          <ShieldCheck className="h-4 w-4 text-teal-700" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-navy-950">Future Module: Analytical QC Engine (Phase 2 Roadmap)</span>
            <span className="text-[10px] font-bold text-navy-700 bg-white px-2 py-0.5 rounded border border-slate-200/80 uppercase">
              Phase 2 Scope
            </span>
          </div>
          The Sampling module is currently the fully active certified module for City Pharma LIMS v1.0. This view demonstrates the planned USP/BP compendial calculation engine. Live results can be inspected below.
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search test name, sample code, material..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Test Statuses</option>
              <option value="PENDING">Pending Analysis</option>
              <option value="IN_ANALYSIS">In Analysis</option>
              <option value="COMPLETED">Completed (Awaiting QA)</option>
              <option value="VERIFIED">Verified & Signed Off</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Test Categories</option>
              <option value="CHROMATOGRAPHY">Chromatography (HPLC / GC)</option>
              <option value="PHYSICAL">Physical (Dissolution / LOD)</option>
              <option value="CHEMICAL">Chemical (pH / Titration)</option>
              <option value="MICROBIOLOGICAL">Microbiological & Endotoxin</option>
              <option value="STABILITY">Stability Protocol</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytical Worksheets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Test Monograph & Category</th>
                <th className="py-3.5 px-4">Sample & Lot Link</th>
                <th className="py-3.5 px-4">Compendial Limits</th>
                <th className="py-3.5 px-4">Observed Result</th>
                <th className="py-3.5 px-4">Status & Result</th>
                <th className="py-3.5 px-4">Instrument</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading worksheets...
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No tests matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => {
                  const spec = test.testSpecification;
                  const isVerified = test.status === 'VERIFIED';
                  const isCompleted = test.status === 'COMPLETED';

                  return (
                    <tr key={test.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{spec.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {spec.testCode} • {spec.pharmacopeiaMethod} • {spec.category}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-mono font-bold text-slate-800">{test.sampleCode}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {test.materialName}
                        </div>
                        {test.batchNumber && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            Lot: {test.batchNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {test.minLimit !== null ? (
                          <div className="text-slate-800 font-medium">
                            {test.minLimit} - {test.maxLimit} {test.unit}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic">Qualitative</div>
                        )}
                        {test.targetValue !== null && (
                          <div className="text-[10px] text-slate-400">Target: {test.targetValue} {test.unit}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {test.numericResult !== null && test.numericResult !== undefined ? (
                          <div className="font-mono text-sm font-bold text-slate-900">
                            {test.numericResult} {test.unit}
                          </div>
                        ) : test.textResult ? (
                          <div className="text-xs text-slate-700">{test.textResult}</div>
                        ) : (
                          <span className="text-slate-400 italic">Not entered</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <StatusBadge status={test.resultStatus} />
                          <div>
                            <StatusBadge status={test.status} />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {test.instrument ? (
                          <div className="text-xs font-medium text-slate-700">
                            <span className="font-mono">{test.instrument.equipmentCode}</span>
                            <div className="text-[10px] text-slate-400">{test.instrument.name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openRecordModal(test)}
                            className="h-7 text-xs"
                          >
                            {test.status === 'COMPLETED' || test.status === 'VERIFIED'
                              ? 'Edit Result'
                              : 'Input Result'}
                          </Button>

                          {isCompleted && !isVerified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyMutation.mutate(test.id)}
                              className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Verify</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Test Result Modal with Live Auto-Evaluation */}
      {activeTest && (
        <Modal
          isOpen={!!activeTest}
          onClose={() => setActiveTest(null)}
          title={`Analytical Result Input: ${activeTest.testSpecification.name}`}
          subtitle={`Sample: ${activeTest.sampleCode} • ${activeTest.materialName}`}
          maxWidth="xl"
        >
          <form onSubmit={handleSubmitResult} className="space-y-4">
            {/* Compendial Specification Reference Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Pharmacopeial Specification:</span>
                <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {activeTest.testSpecification.pharmacopeiaMethod}
                </span>
              </div>
              <div className="flex items-baseline gap-4 mt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Min Limit</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {activeTest.minLimit ?? 'N/A'} {activeTest.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Target</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {activeTest.targetValue ?? 'N/A'} {activeTest.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Max Limit</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {activeTest.maxLimit ?? 'N/A'} {activeTest.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Numeric Result Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantitative Numeric Result ({activeTest.unit || 'units'}) *
              </label>
              <input
                type="number"
                step="any"
                value={numericResult}
                onChange={(e) => setNumericResult(e.target.value)}
                placeholder="Enter observed numerical assay value..."
                className="w-full text-sm font-mono px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>

            {/* LIVE DYNAMIC EVALUATION BANNER */}
            {evaluatedStatus === 'WITHIN_SPEC' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium animate-in fade-in duration-150">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">WITHIN SPECIFICATION (PASS)</p>
                  <p className="text-[11px] text-emerald-700">
                    Result {numericResult} {activeTest.unit} satisfies compendial limits ({activeTest.minLimit} - {activeTest.maxLimit}).
                  </p>
                </div>
              </div>
            )}

            {evaluatedStatus === 'OUT_OF_SPEC' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-150">
                <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-700">OUT OF SPECIFICATION (OOS DETECTED)</p>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    Result <strong>{numericResult} {activeTest.unit}</strong> falls outside acceptable limits (
                    {activeTest.minLimit} - {activeTest.maxLimit}). Submitting will automatically trigger an Out-of-Specification incident report and Phase 1 lab investigation!
                  </p>
                </div>
              </div>
            )}

            {/* Instrument Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Analytical Instrument Used *
              </label>
              <select
                value={selectedInstrumentId}
                onChange={(e) => setSelectedInstrumentId(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium"
              >
                <option value="">Select calibrated lab instrument...</option>
                {instruments?.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.equipmentCode} — {inst.name} ({inst.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Raw Data Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Raw Data File / Chromatogram Sequence Ref *
              </label>
              <input
                type="text"
                value={rawDataReference}
                onChange={(e) => setRawDataReference(e.target.value)}
                placeholder="e.g. Agilent OpenLab Sequence #2026-SEQ-044; Vial 12"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none font-mono"
                required
              />
            </div>

            {/* Qualitative Notes / Comments */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Analyst Notes / System Suitability Verification
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="System suitability passed (RSD < 1.0%, theoretical plates > 2000)..."
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setActiveTest(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={evaluatedStatus === 'OUT_OF_SPEC' ? 'danger' : 'primary'}
                isLoading={recordResultMutation.isPending}
              >
                <span>Save Result & Sign Electronically</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
