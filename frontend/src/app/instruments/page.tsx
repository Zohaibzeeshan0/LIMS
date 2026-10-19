'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, formatRelativeTime } from '@/lib/date';
import {
  Gauge,
  PlusCircle,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  Building,
  Wrench,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export default function InstrumentsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/samples');
  }, [router]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedInstrument, setSelectedInstrument] = useState<any | null>(null);
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [isNewInstModalOpen, setIsNewInstModalOpen] = useState(false);

  // Form states for Log Calibration
  const [certNumber, setCertNumber] = useState('');
  const [standardUsed, setStandardUsed] = useState('');
  const [passed, setPassed] = useState(true);
  const [calRemarks, setCalRemarks] = useState('');

  // Form states for New Instrument
  const [eqCode, setEqCode] = useState('');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [laboratoryRoom, setLaboratoryRoom] = useState('');
  const [calFrequency, setCalFrequency] = useState(90);

  const { data: instruments, isLoading } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api.get<any[]>('/instruments'),
  });

  const instrumentList: any[] = React.useMemo(() => {
    if (!instruments) return [];
    if (Array.isArray(instruments)) return instruments;
    if (Array.isArray((instruments as any).data)) return (instruments as any).data;
    return [];
  }, [instruments]);

  // Calibration Mutation
  const logCalMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/instruments/${selectedInstrument.id}/calibration`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsCalModalOpen(false);
      setCertNumber('');
      setStandardUsed('');
      setCalRemarks('');
    },
  });

  // Create Instrument Mutation
  const createInstMutation = useMutation({
    mutationFn: (data: any) => api.post('/instruments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      setIsNewInstModalOpen(false);
      setEqCode('');
      setName('');
      setModel('');
      setSerialNumber('');
      setManufacturer('');
      setLaboratoryRoom('');
    },
  });

  const handleOpenCalModal = (inst: any) => {
    setSelectedInstrument(inst);
    const rand = Math.floor(1000 + Math.random() * 9000);
    setCertNumber(`CAL-2026-${rand}`);
    setStandardUsed('NIST Traceable Reference Standards (Grade A Cert #ST-8901)');
    setPassed(true);
    setCalRemarks('All diagnostic and accuracy parameters passed manufacturer tolerance limits.');
    setIsCalModalOpen(true);
  };

  const handleSubmitCal = (e: React.FormEvent) => {
    e.preventDefault();
    logCalMutation.mutate({
      certificateNumber: certNumber,
      standardUsed,
      passed,
      remarks: calRemarks,
    });
  };

  const handleCreateInst = (e: React.FormEvent) => {
    e.preventDefault();
    createInstMutation.mutate({
      equipmentCode: eqCode,
      name,
      model,
      serialNumber,
      manufacturer,
      laboratoryRoom,
      calibrationFrequencyDays: Number(calFrequency),
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-950 tracking-tight flex items-center gap-2">
            <Gauge className="h-6 w-6 text-teal-700" />
            <span>Analytical Instruments & Metrology</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Equipment qualification status (IQ/OQ/PQ), NIST-traceable calibrations, and maintenance schedules
          </p>
        </div>

        <Button
          onClick={() => setIsNewInstModalOpen(true)}
          variant="primary"
          className="bg-navy-900 hover:bg-navy-800 text-white shadow-xs"
        >
          <PlusCircle className="h-4 w-4 text-teal-400" />
          <span>Register Instrument</span>
        </Button>
      </div>

      {/* Phase 2 Roadmap Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-teal-800 shadow-xs shrink-0 mt-0.5">
          <ShieldCheck className="h-4 w-4 text-teal-700" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-navy-950">Future Module: Metrology & NIST Calibration (Phase 2 Roadmap)</span>
            <span className="text-[10px] font-bold text-navy-700 bg-white px-2 py-0.5 rounded border border-slate-200/80 uppercase">
              Phase 2 Scope
            </span>
          </div>
          The Sampling module is currently the fully active certified module for City Pharma LIMS v1.0. This view demonstrates the metrology and calibration tracking suite.
        </div>
      </div>

      {/* Instruments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 py-16 text-center text-slate-400">Loading equipment inventory...</div>
        ) : (
          instrumentList.map((inst) => {
            const isDueSoon = inst.isDueSoon;
            const isOverdue = inst.isOverdue;

            return (
              <div
                key={inst.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar with Code & Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-sm font-bold text-primary-800 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200/60">
                        {inst.equipmentCode}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{inst.name}</h3>
                      <p className="text-xs text-slate-500">{inst.manufacturer} • Model: {inst.model}</p>
                    </div>
                    <StatusBadge status={inst.status} />
                  </div>

                  {/* Metadata Specs */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Serial Number</span>
                      <span className="font-mono font-medium text-slate-700">{inst.serialNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Room / Lab</span>
                      <span className="font-medium text-slate-700">{inst.laboratoryRoom}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Frequency</span>
                      <span className="font-medium text-slate-700">Every {inst.calibrationFrequencyDays} days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Tests Executed</span>
                      <span className="font-mono font-medium text-slate-700">{inst._count?.sampleTests || 0} runs</span>
                    </div>
                  </div>

                  {/* Calibration Due Banner */}
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isOverdue
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : isDueSoon
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Next Calibration:</span>
                    </div>
                    <span className="font-semibold font-mono">
                      {formatDateTime(inst.nextCalibrationDue, 'dd MMM yyyy')}
                    </span>
                  </div>

                  {/* Recent Calibration Logs */}
                  {inst.calibrationLogs && inst.calibrationLogs.length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      <div className="flex items-center justify-between text-slate-400 font-semibold mb-1">
                        <span>Latest Certificate:</span>
                        <span className="font-mono text-slate-600 font-medium">
                          {inst.calibrationLogs[0].certificateNumber}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant={isDueSoon || isOverdue ? 'primary' : 'outline'}
                    onClick={() => handleOpenCalModal(inst)}
                    className="w-full text-xs h-8"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Log Calibration Certificate</span>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Log Calibration Modal */}
      {selectedInstrument && (
        <Modal
          isOpen={isCalModalOpen}
          onClose={() => setIsCalModalOpen(false)}
          title={`Log Metrology Calibration: ${selectedInstrument.equipmentCode}`}
          subtitle={`Instrument: ${selectedInstrument.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitCal} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calibration Certificate Number *
              </label>
              <input
                type="text"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                placeholder="e.g. CAL-2026-0914"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference Standard Used (NIST / Compendial) *
              </label>
              <input
                type="text"
                value={standardUsed}
                onChange={(e) => setStandardUsed(e.target.value)}
                placeholder="Standard lot, manufacturer, certificate details..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calibration Result *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPassed(true)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    passed
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>PASS (QUALIFIED)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPassed(false)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    !passed
                      ? 'bg-rose-50 border-rose-400 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>FAIL (OUT OF SERVICE)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Technician Remarks & Measurement Uncertainties
              </label>
              <textarea
                rows={2}
                value={calRemarks}
                onChange={(e) => setCalRemarks(e.target.value)}
                placeholder="Calibration observed parameters..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
              Upon submission, the next calibration due date will automatically advance by{' '}
              <strong className="text-slate-800">{selectedInstrument.calibrationFrequencyDays} days</strong> and be logged to the immutable 21 CFR Part 11 audit trail.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsCalModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={logCalMutation.isPending}>
                Save & Qualify Instrument
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Register Instrument Modal */}
      <Modal
        isOpen={isNewInstModalOpen}
        onClose={() => setIsNewInstModalOpen(false)}
        title="Register New Analytical Equipment"
        subtitle="Add a new instrument to the laboratory metrology master registry"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateInst} className="space-y-3.5 text-xs sm:text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Equipment Tag / Code *
              </label>
              <input
                type="text"
                value={eqCode}
                onChange={(e) => setEqCode(e.target.value)}
                placeholder="e.g. GC-01, FT-IR-02"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calibration Frequency (Days) *
              </label>
              <input
                type="number"
                value={calFrequency}
                onChange={(e) => setCalFrequency(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Instrument Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PerkinElmer Spectrum Two FT-IR Spectrometer"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model *</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Spectrum Two"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number *</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="PK-2026-99"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer *</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="PerkinElmer"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Laboratory Room *</label>
              <input
                type="text"
                value={laboratoryRoom}
                onChange={(e) => setLaboratoryRoom(e.target.value)}
                placeholder="Spectroscopy Suite 302"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsNewInstModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createInstMutation.isPending}>
              Register Equipment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
