'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { samplingService } from '@/services/sampling.service';
import { useDebounce } from '@/hooks/useDebounce';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { SAMPLE_STAGES, SEMI_BASE_STAGES, FORMULATION_STAGES, LabSection, getUserLabAccess, Sample } from '@/types/lims';
import { format } from 'date-fns';
import { formatDateTime } from '@/lib/date';
import QRCode from 'qrcode';
import { QrScannerModal, ScannedSampleData } from '@/components/samples/QrScannerModal';
import { SampleQrLabelModal } from '@/components/samples/SampleQrLabelModal';
import { SampleRoutingChitModal, SampleRoutingChitData } from '@/components/samples/SampleRoutingChitModal';
import {
  FlaskConical,
  Microscope,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  Tag,
  User,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  FileText,
  Building,
  Lock,
  Camera,
  ScanLine,
  Printer,
  Download,
  QrCode,
} from 'lucide-react';

// Zod Validation Schema enforcing cGMP / 21 CFR Part 11 requirements
const sampleFormSchema = z
  .object({
    laboratory: z.string().default('GENERAL'),
    samplingDateTime: z.string().min(1, 'Sampling Date & Time is required'),
    nomenclature: z
      .string()
      .min(3, 'Nomenclature / Material name must be at least 3 characters')
      .max(255, 'Nomenclature cannot exceed 255 characters'),
    idGenerationPolicy: z.enum(['AUTO', 'MANUAL']).default('AUTO').optional(),
    customSampleId: z.string().optional(),
    sampleType: z.string().min(1, 'Stage / Type is required'),
    customStage: z.string().optional(),
    sampleQty: z.coerce
      .number({ invalid_type_error: 'Quantity must be a valid number' })
      .positive('Quantity must be a positive number greater than 0'),
    unit: z.string().min(1, 'Quantity unit is required'),
    customUnit: z.string().optional(),
    batchId: z.string().optional(),
    lotNumber: z.string().optional(),
    mfgDate: z.string().optional(),
    expDate: z.string().optional(),
    submittedBy: z.string().min(2, 'Submitted By name is required'),
    receivedBy: z.string().min(2, 'Received By name is required'),
    samplingLocation: z.string().min(2, 'Sampling location / suite is required'),
    storageCondition: z.string().optional(),
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT']),
    testSpecificationIds: z.array(z.string()).optional(),
    remarks: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Never accept an expiry date earlier than the manufacturing date
    if (data.mfgDate && data.expDate) {
      const mfg = new Date(data.mfgDate);
      const exp = new Date(data.expDate);
      if (exp < mfg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expiry date cannot be earlier than manufacturing date',
          path: ['expDate'],
        });
      }
    }

    // 2. Validate custom stage if "Other" is selected
    if (data.sampleType === 'Other') {
      if (!data.customStage || data.customStage.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please specify the custom stage name when "Other" is selected',
          path: ['customStage'],
        });
      }
    }

    // 3. Validate custom unit if "Other" is selected
    if (data.unit === 'Other') {
      if (!data.customUnit || data.customUnit.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please specify custom unit when "Other" is selected',
          path: ['customUnit'],
        });
      }
    }
  });

type SampleFormValues = z.infer<typeof sampleFormSchema>;

interface NewSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLaboratory?: string;
  defaultSection?: LabSection;
  onSampleCreated?: (createdSample: any) => void;
  onProceedToSubmit?: (createdSample: any) => void;
}

export function NewSampleModal({
  isOpen,
  onClose,
  defaultLaboratory = 'GENERAL',
  defaultSection = 'semi-base',
  onSampleCreated,
  onProceedToSubmit,
}: NewSampleModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isRestrictedToLab = false;
  const effectiveLab = 'GENERAL';

  // Active lab section: Semi Base vs Formulation
  const [selectedSection, setSelectedSection] = useState<LabSection>(defaultSection);

  // Post-Creation Sample Routing Chit Modal state (end of sample addition)
  const [createdSampleForChit, setCreatedSampleForChit] = useState<any | null>(null);
  const [isCreatedChitOpen, setIsCreatedChitOpen] = useState(false);

  // Confirmation modal state for unsaved changes
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Success / Failure notification banner states
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    sampleCode: string;
    accessionNo?: string;
    nomenclature: string;
    laboratory: string;
  } | null>(null);

  // Real-time duplicate ID check states
  const [idCheckStatus, setIdCheckStatus] = useState<
    'idle' | 'checking' | 'available' | 'duplicate'
  >('idle');
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);

  // Fetch batches for selection
  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get<any[]>('/batches'),
    enabled: isOpen,
  });

  // Fetch active users for Received By selection
  const { data: usersList } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get<any[]>('/users'),
    enabled: isOpen,
  });

  // Live real-time clock state for sampling intake
  const [liveDate, setLiveDate] = useState<Date>(new Date());
  const [isLiveClock, setIsLiveClock] = useState<boolean>(true);

  // Helper to format local ISO string (YYYY-MM-DDTHH:mm:ss)
  const getLocalISOString = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 19);
  };

  const defaultValues: SampleFormValues = {
    laboratory: effectiveLab,
    samplingDateTime: getLocalISOString(),
    nomenclature: '',
    idGenerationPolicy: 'AUTO',
    customSampleId: '',
    sampleType: defaultSection === 'semi-base' ? SEMI_BASE_STAGES[0] : FORMULATION_STAGES[0],
    customStage: '',
    sampleQty: 100,
    unit: 'tablets',
    customUnit: '',
    batchId: '',
    lotNumber: '',
    mfgDate: '',
    expDate: '',
    submittedBy: user?.fullName ? `${user.fullName} (${user.department || 'Production'})` : 'Production Line Lead',
    receivedBy: user?.fullName ? `${user.fullName} (QC Intake Officer)` : 'QC Accession Desk',
    samplingLocation: 'Sampling Booth SB-01 (Grade D)',
    storageCondition: 'Controlled Room Temp 20-25°C',
    priority: 'ROUTINE',
    testSpecificationIds: [],
    remarks: '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SampleFormValues>({
    resolver: zodResolver(sampleFormSchema),
    defaultValues,
  });

  // Live ticking interval (updates every 1000ms while modal is open & live mode is on)
  useEffect(() => {
    if (!isOpen || !isLiveClock) return;
    const updateTime = () => {
      const now = new Date();
      setLiveDate(now);
      setValue('samplingDateTime', getLocalISOString(now), { shouldDirty: false });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isLiveClock, setValue]);

  // Update defaults when modal opens or laboratory switches
  useEffect(() => {
    if (isOpen) {
      setIsLiveClock(true);
      const now = new Date();
      setLiveDate(now);
      setSelectedSection(defaultSection);
      setValue('laboratory', effectiveLab);
      setValue('sampleType', defaultSection === 'semi-base' ? SEMI_BASE_STAGES[0] : FORMULATION_STAGES[0]);
      setValue('samplingDateTime', getLocalISOString(now));
      if (user?.fullName) {
        setValue('submittedBy', `${user.fullName} (${user.department || 'Production'})`);
        setValue('receivedBy', `${user.fullName} (QC Intake Officer)`);
      }
      setSubmitError(null);
      setSuccessInfo(null);
      setShowDiscardConfirm(false);
      setIdCheckStatus('idle');
      setDuplicateMessage(null);
    }
  }, [isOpen, defaultLaboratory, defaultSection, user, setValue, effectiveLab]);

  const watchedLab = watch('laboratory');
  const watchedPolicy = watch('idGenerationPolicy');
  const watchedCustomId = watch('customSampleId');
  const watchedSampleType = watch('sampleType');
  const watchedUnit = watch('unit');
  const watchedPriority = watch('priority') || 'ROUTINE';
  const watchedBatchId = watch('batchId');
  const debouncedManualId = useDebounce(watchedCustomId, 400);

  // Fetch next sequential Sample ID preview based on active lab & section
  const { data: nextIdData } = useQuery({
    queryKey: ['next-sample-id', watchedLab, selectedSection, watchedSampleType],
    queryFn: () =>
      samplingService.getNextSampleId({
        laboratory: watchedLab,
        section: selectedSection,
        stageType: watchedSampleType,
      }),
    enabled: isOpen,
    staleTime: 2000,
  });

  const nextAutoSampleCode = useMemo(() => {
    if (nextIdData?.sampleCode) return nextIdData.sampleCode;
    const sec = selectedSection === 'formulation' ? 'F' : 'SB';
    return `GL/${sec}-1`;
  }, [nextIdData, selectedSection]);

  // QR Code & Barcode Integration States
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isQrLabelModalOpen, setIsQrLabelModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const activeSampleCode = nextAutoSampleCode;
  const watchedNomenclature = watch('nomenclature');
  const watchedLotNumber = watch('lotNumber');
  const watchedMfgDate = watch('mfgDate');
  const watchedExpDate = watch('expDate');

  // Real-time dynamic QR code generation
  useEffect(() => {
    let isMounted = true;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const mfgStr = watchedMfgDate ? formatDateTime(watchedMfgDate, 'dd/MM/yyyy') : 'N/A';
    const expStr = watchedExpDate ? formatDateTime(watchedExpDate, 'dd/MM/yyyy') : 'N/A';
    const payload = `==============================
CITI PHARMA • LIMS
SAMPLE SLIP
==============================
Sample ID: ${activeSampleCode}
Product: ${watchedNomenclature || 'Pharmaceutical Sample'}
Section: ${selectedSection === 'semi-base' ? 'Semi Basics' : 'Formulation'}
Batch / Lot: ${watchedLotNumber || 'N/A'}
Mfg Date: ${mfgStr}
Exp Date: ${expStr}
Facility: General Laboratory
==============================
View Details: ${origin}/samples?sampleId=${encodeURIComponent(activeSampleCode)}`;

    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR Gen error:', err));

    return () => {
      isMounted = false;
    };
  }, [activeSampleCode, watchedNomenclature, watchedLotNumber, watchedMfgDate, watchedExpDate, watchedLab, selectedSection, scannedBarcode, liveDate]);

  // Handle scanned QR code / Barcode data to autofill form
  const handleScanResult = (data: ScannedSampleData) => {
    if (data.nomenclature) {
      setValue('nomenclature', data.nomenclature, { shouldValidate: true, shouldDirty: true });
    }
    if (data.lotNumber) {
      setValue('lotNumber', data.lotNumber, { shouldValidate: true, shouldDirty: true });
    }
    if (data.sampleQty) {
      setValue('sampleQty', data.sampleQty, { shouldValidate: true, shouldDirty: true });
    }
    if (data.unit) {
      setValue('unit', data.unit, { shouldValidate: true, shouldDirty: true });
    }
    if (data.mfgDate) {
      setValue('mfgDate', data.mfgDate.slice(0, 10), { shouldValidate: true, shouldDirty: true });
    }
    if (data.expDate) {
      setValue('expDate', data.expDate.slice(0, 10), { shouldValidate: true, shouldDirty: true });
    }
    if (data.sampleCode && !data.barcode) {
      setScannedBarcode(data.sampleCode);
    }
    if (data.stageType) {
      setValue('sampleType', data.stageType, { shouldValidate: true, shouldDirty: true });
    }
    if (data.barcode) {
      setScannedBarcode(data.barcode);
    }
  };

  // When a batch is selected from the dropdown, autofill Lot No., MFG Date, EXP Date
  useEffect(() => {
    if (watchedBatchId && batches) {
      const selectedBatch = batches.find((b) => b.id === watchedBatchId);
      if (selectedBatch) {
        setValue('lotNumber', selectedBatch.batchNumber || '');
        if (selectedBatch.manufacturingDate) {
          setValue('mfgDate', selectedBatch.manufacturingDate.substring(0, 10));
        }
        if (selectedBatch.expiryDate) {
          setValue('expDate', selectedBatch.expiryDate.substring(0, 10));
        }
        if (selectedBatch.drugProduct) {
          setValue('nomenclature', selectedBatch.drugProduct);
        }
      }
    }
  }, [watchedBatchId, batches, setValue]);

  // Real-time duplicate ID check when user types custom manual sample ID
  useEffect(() => {
    if (watchedPolicy === 'MANUAL' && debouncedManualId && debouncedManualId.trim().length >= 3) {
      setIdCheckStatus('checking');
      setDuplicateMessage(null);

      samplingService
        .checkSampleId(debouncedManualId.trim())
        .then((res) => {
          if (res.isAvailable) {
            setIdCheckStatus('available');
            setDuplicateMessage(null);
          } else {
            setIdCheckStatus('duplicate');
            setDuplicateMessage(
              `Sample ID '${debouncedManualId.trim()}' is already registered (Accession No: ${res.existingSample?.accessionNo || 'Existing'}).`
            );
          }
        })
        .catch(() => {
          setIdCheckStatus('idle');
        });
    } else {
      setIdCheckStatus('idle');
      setDuplicateMessage(null);
    }
  }, [watchedPolicy, debouncedManualId]);

  // Mutation to persist sample to PostgreSQL through NestJS backend API
  const createMutation = useMutation({
    mutationFn: (payload: any) => samplingService.create(payload),
    onSuccess: (newSample: any) => {
      queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['navbar-audit-alerts'] });

      setSuccessInfo({
        sampleCode: newSample.sampleCode,
        accessionNo: newSample.accessionNo,
        nomenclature: newSample.nomenclature || newSample.materialName,
        laboratory: newSample.laboratory || watchedLab,
      });

      if (onSampleCreated) {
        onSampleCreated(newSample);
      }

      // Automatically launch the generated QR Code and official container chit modal at end of sample addition
      const sampleForChit: Sample = {
        ...newSample,
        mfgDate: newSample.mfgDate || (newSample as any).manufacturingDate || watch('mfgDate') || null,
        expDate: newSample.expDate || (newSample as any).expiryDate || watch('expDate') || null,
      };
      setCreatedSampleForChit(sampleForChit);
      setIsCreatedChitOpen(true);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save sampling record to PostgreSQL database.';
      setSubmitError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  // Handle Form Submit
  const onSubmit = (formData: SampleFormValues) => {
    setSubmitError(null);

    const finalStage =
      formData.sampleType === 'Other'
        ? (formData.customStage?.trim() || 'Other')
        : formData.sampleType;

    const sectionTag = selectedSection === 'semi-base' ? '[Semi Basics]' : '[Formulation]';
    const finalStageWithTag = `${sectionTag} ${finalStage}`;

    const finalUnit =
      formData.unit === 'Other'
        ? (formData.customUnit?.trim() || 'units')
        : formData.unit;

    const payload: any = {
      laboratory: formData.laboratory,
      section: selectedSection,
      barcode: scannedBarcode || activeSampleCode,
      samplingDate: isLiveClock
        ? new Date().toISOString()
        : new Date(formData.samplingDateTime).toISOString(),
      nomenclature: formData.nomenclature.trim(),
      materialName: formData.nomenclature.trim(),
      stageType: finalStageWithTag,
      sampleType: finalStageWithTag,
      sampleCode: undefined, // Backend will auto-generate sequential ID
      sampleQty: Number(formData.sampleQty),
      unit: finalUnit.trim(),
      batchId: formData.batchId || undefined,
      lotNumber: formData.lotNumber?.trim() || undefined,
      mfgDate: formData.mfgDate || undefined,
      expDate: formData.expDate || undefined,
      submittedBy: formData.submittedBy.trim(),
      samplingLocation: formData.samplingLocation.trim(),
      storageCondition: formData.storageCondition?.trim() || 'Controlled Room Temp 20-25°C',
      priority: formData.priority,
      testSpecificationIds: formData.testSpecificationIds || [],
      remarks: [sectionTag, formData.remarks?.trim()].filter(Boolean).join(' '),
    };

    createMutation.mutate(payload);
  };

  // Safe Close Request: check for unsaved dirty changes
  const handleRequestClose = () => {
    if (isDirty && !successInfo) {
      setShowDiscardConfirm(true);
    } else {
      reset(defaultValues);
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    reset(defaultValues);
    onClose();
  };


  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title="Create Sampling Record"
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-sans">
          {/* Success Banner */}
          {successInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-sm text-emerald-950">
                  Sample Record Created Successfully!
                </h5>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Accession No. <strong>{successInfo.accessionNo || 'Generated'}</strong> • Sample ID{' '}
                  <strong className="font-mono">{successInfo.sampleCode}</strong> has been saved to
                  PostgreSQL in {successInfo.laboratory} Lab.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsQrLabelModalOpen(true)}
                    className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Sample QR Label</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Failure / Error Banner */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-sm text-rose-950">Submission Failed</h5>
                <p className="text-xs text-rose-700 mt-0.5">{submitError}</p>
              </div>
            </div>
          )}


          {scannedBarcode && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Scanned Barcode Linked: <strong className="font-mono">{scannedBarcode}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setScannedBarcode(null)}
                className="text-emerald-700 hover:text-emerald-900 text-[11px] underline ml-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Section 1: Laboratory Suite (General Lab) */}
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">Target Laboratory:</span>
              <span className="text-xs font-bold text-blue-900 bg-blue-100/70 px-2.5 py-0.5 rounded-md border border-blue-200">
                General Lab
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Standard Quality Control Suite</span>
          </div>

          {/* Section 2: Core Identifiers & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date & Time (Defaults to live current time with real-time second updates) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-navy-900" />
                  <span>Sampling Date & Time <span className="text-rose-500">*</span></span>
                </label>
                <div className="flex items-center gap-1.5">
                  {isLiveClock ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 -ml-2.5" />
                      LIVE CLOCK
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLiveClock(true);
                        const now = new Date();
                        setLiveDate(now);
                        setValue('samplingDateTime', getLocalISOString(now), { shouldDirty: true });
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>Sync Live</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type="datetime-local"
                  step="1"
                  {...register('samplingDateTime')}
                  onChange={(e) => {
                    setIsLiveClock(false);
                    setValue('samplingDateTime', e.target.value, { shouldValidate: true, shouldDirty: true });
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-xs font-mono rounded-lg border outline-none bg-white transition-all',
                    isLiveClock
                      ? 'border-emerald-300 ring-2 ring-emerald-500/10 text-emerald-950 font-semibold bg-emerald-50/20'
                      : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 text-slate-800'
                  )}
                />
              </div>

              {!isLiveClock && (
                <div className="flex items-center justify-end mt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveClock(true);
                      const now = new Date();
                      setLiveDate(now);
                      setValue('samplingDateTime', getLocalISOString(now), { shouldDirty: true });
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    Switch to Live
                  </button>
                </div>
              )}

              {errors.samplingDateTime && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.samplingDateTime.message}</span>
                </p>
              )}
            </div>

            {/* Sample ID (Auto-Generated) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <span>Sample ID <span className="text-rose-500">*</span></span>
              </label>

              <div className="px-3 py-2 text-xs font-mono rounded-lg border border-blue-200 bg-blue-50/70 text-blue-950 flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5 text-blue-900 text-sm">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>{nextAutoSampleCode}</span>
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-sans font-semibold border border-blue-200">
                  Auto-Generated
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Nomenclature (Required Text Field) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nomenclature / Drug Substance or Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('nomenclature')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none text-slate-900 font-medium"
            />
            {errors.nomenclature && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.nomenclature.message}</span>
              </p>
            )}
          </div>

          {/* Section 4: Lab Subsection (Semi Basics vs Formulation), Stage / Category, Batch / Lot No., Quantity & Units */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Laboratory Section</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md border border-blue-200/60">
                {selectedSection === 'semi-base' ? 'Semi Basics Active' : 'Formulation Active'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSection('semi-base');
                  setValue('sampleType', SEMI_BASE_STAGES[0]);
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer',
                  selectedSection === 'semi-base'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>1. Semi Basics (In-Process / Bulk)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSection('formulation');
                  setValue('sampleType', FORMULATION_STAGES[0]);
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer',
                  selectedSection === 'formulation'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>2. Formulation (Finished Product)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Stage / Type */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {selectedSection === 'semi-base' ? 'Semi Basics Category' : 'Formulation Category'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('sampleType')}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium text-slate-800"
              >
                {(selectedSection === 'semi-base' ? SEMI_BASE_STAGES : FORMULATION_STAGES).map((stg) => (
                  <option key={stg} value={stg}>
                    {stg}
                  </option>
                ))}
              </select>
              {errors.sampleType && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {errors.sampleType.message}
                </p>
              )}

              {/* When "Other" is selected, render manual text input */}
              {watchedSampleType === 'Other' && (
                <div className="mt-2 animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold text-blue-700 mb-0.5">
                    Specify Custom Stage <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('customStage')}
                    placeholder="Enter manual stage..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-400 bg-blue-50/40 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium text-slate-900"
                  />
                  {errors.customStage && (
                    <p className="text-[10px] text-rose-600 mt-0.5">
                      {errors.customStage.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Batch / Lot No. */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Batch No. / Lot No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('lotNumber')}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none text-slate-800"
              />
              {errors.lotNumber && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.lotNumber.message}</span>
                </p>
              )}
            </div>

            {/* Qty. of Sample */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Qty. of Sample <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                {...register('sampleQty')}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none text-slate-800"
              />
              {errors.sampleQty && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.sampleQty.message}</span>
                </p>
              )}
            </div>

            {/* Quantity Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Quantity Unit <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('unit')}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium text-slate-800"
              >
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="raw data">Raw Data</option>
                <option value="Other">Other</option>
              </select>

              {/* When "Other" is selected, render manual text input */}
              {watchedUnit === 'Other' && (
                <div className="mt-2 animate-in fade-in duration-150">
                  <label className="block text-[10px] font-bold text-blue-700 mb-0.5">
                    Specify Custom Unit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('customUnit')}
                    placeholder="Enter manual unit (e.g. strips, vials, mL...)"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-400 bg-blue-50/40 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium text-slate-900"
                  />
                  {errors.customUnit && (
                    <p className="text-[10px] text-rose-600 mt-0.5">
                      {errors.customUnit.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Dates with Validation (Never accept expiry earlier than manufacturing) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-navy-900" />
                <span>Manufacturing Date (MFG Date)</span>
              </label>
              <input
                type="date"
                {...register('mfgDate')}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white"
              />
              {errors.mfgDate && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.mfgDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-navy-900" />
                <span>Expiry Date (EXP Date)</span>
              </label>
              <input
                type="date"
                {...register('expDate')}
                className={cn(
                  'w-full px-3 py-1.5 text-xs rounded-lg border outline-none bg-white',
                  errors.expDate
                    ? 'border-rose-400 bg-rose-50 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900'
                )}
              />
              {errors.expDate && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors.expDate.message}</span>
                </p>
              )}
            </div>
          </div>

          {/* Section 6: Personnel (Submitted By & Received By) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-navy-900" />
                <span>Submitted By <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                {...register('submittedBy')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none text-slate-800"
              />
              {errors.submittedBy && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.submittedBy.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                <span>Received By <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                {...register('receivedBy')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none text-slate-800"
              />
              {errors.receivedBy && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.receivedBy.message}</p>
              )}
            </div>
          </div>

          {/* Section 7: Testing Priority */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                Priority <span className="text-rose-500">*</span>
              </label>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold font-mono border',
                  watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                )}
              >
                {watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                  ? '1 Hr - 2 Days'
                  : '5 - 15 Days'}
              </span>
            </div>
            <select
              {...register('priority')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium text-slate-800"
            >
              <option value="ROUTINE">Routine (5 - 15 Days)</option>
              <option value="URGENT">Urgent (1 Hr - 2 Days)</option>
            </select>
          </div>

          {/* Priority SLA Turnaround Notice (Directly Above Submit Button) */}
          <div
            className={cn(
              'p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all',
              watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs'
                : 'bg-blue-50/80 border-blue-200 text-blue-950'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold',
                  watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-blue-600 text-white'
                )}
              >
                {watchedPriority === 'URGENT' || watchedPriority === 'STAT' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-900">
                    {watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                      ? 'Urgent Fast-Track Testing Target (1 Hr - 2 Days)'
                      : 'Standard Routine Testing Target (5 - 15 Days)'}
                  </span>
                  {(watchedPriority === 'URGENT' || watchedPriority === 'STAT') && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-600 text-white">
                      Analyst Alert Active
                    </span>
                  )}
                </div>
                {(watchedPriority === 'URGENT' || watchedPriority === 'STAT') && (
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Live notification and top header alert will be sent directly to the QC Analyst and Administration.
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-lg font-mono font-bold text-xs shadow-2xs',
                  watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-blue-600 text-white'
                )}
              >
                {watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                  ? '1 Hr - 2 Days'
                  : '5 - 15 Days'}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3.5 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
              disabled={isSubmitting || createMutation.isPending}
              className="text-xs border-slate-300 text-slate-700"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || createMutation.isPending || idCheckStatus === 'duplicate'}
                className="bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shadow-xs"
              >
                {isSubmitting || createMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting to PostgreSQL...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                    <span>Confirm & Accession Sample</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Unsaved Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <Modal
          isOpen={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          title="Discard Unsaved Changes?"
          subtitle="Form data has not been submitted"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">You have entered unsaved sample data.</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Are you sure you want to discard this record? All entered fields will be cleared and no data will be saved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDiscardConfirm(false)}
                className="text-xs"
              >
                Keep Editing
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDiscard}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR Code Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScan={handleScanResult}
      />

      {/* QR Code Label Print / Preview Modal */}
      <SampleQrLabelModal
        isOpen={isQrLabelModalOpen}
        onClose={() => setIsQrLabelModalOpen(false)}
        qrDataUrl={qrDataUrl}
        sampleCode={activeSampleCode}
        nomenclature={watchedNomenclature || 'Pharmaceutical Sample'}
        lotNumber={watchedLotNumber || 'N/A'}
        mfgDate={watchedMfgDate}
        expDate={watchedExpDate}
        laboratoryName="General Lab"
        sectionName={selectedSection === 'semi-base' ? 'Semi Basics' : 'Formulation'}
        samplingDate={format(liveDate, 'dd MMM yyyy, hh:mm a')}
        sampleQty={watch('sampleQty')}
        unit={watch('unit')}
      />

      {/* Official Post-Creation Container Chit Modal (End of Sample Addition) */}
      {isCreatedChitOpen && createdSampleForChit && (
        <SampleRoutingChitModal
          isOpen={isCreatedChitOpen}
          onClose={() => {
            setIsCreatedChitOpen(false);
            setCreatedSampleForChit(null);
            reset(defaultValues);
            onClose();
          }}
          chitData={{
            sample: createdSampleForChit,
            destinationLab: 'PENDING_WORKFLOW',
            submittedByName: createdSampleForChit.submittedBy || user?.fullName || 'Sampling Officer',
            submittedAt: createdSampleForChit.samplingDate || new Date().toISOString(),
          }}
          onProceedToSubmit={(sample) => {
            setIsCreatedChitOpen(false);
            setCreatedSampleForChit(null);
            reset(defaultValues);
            onClose();
            if (onProceedToSubmit) {
              onProceedToSubmit(sample);
            }
          }}
          onViewSampleDetails={(sample) => {
            setIsCreatedChitOpen(false);
            setCreatedSampleForChit(null);
            reset(defaultValues);
            onClose();
            if (onSampleCreated) {
              onSampleCreated(sample);
            }
          }}
        />
      )}
    </>
  );
}
