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
import { SAMPLE_STAGES } from '@/types/lims';
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
} from 'lucide-react';

// Zod Validation Schema enforcing cGMP / 21 CFR Part 11 requirements
const sampleFormSchema = z
  .object({
    laboratory: z.enum(['SAF', 'SEF', 'PENICILLIN', 'GENERAL']),
    samplingDateTime: z.string().min(1, 'Sampling Date & Time is required'),
    nomenclature: z
      .string()
      .min(3, 'Nomenclature / Material name must be at least 3 characters')
      .max(255, 'Nomenclature cannot exceed 255 characters'),
    idGenerationPolicy: z.enum(['AUTO', 'MANUAL']),
    customSampleId: z.string().optional(),
    sampleType: z.string().min(1, 'Stage / Type is required'),
    customStage: z.string().optional(),
    sampleQty: z.coerce
      .number({ invalid_type_error: 'Quantity must be a valid number' })
      .positive('Quantity must be a positive number greater than 0'),
    unit: z.string().min(1, 'Quantity unit is required'),
    batchId: z.string().optional(),
    lotNumber: z.string().optional(),
    mfgDate: z.string().optional(),
    expDate: z.string().optional(),
    submittedBy: z.string().min(2, 'Submitted By name is required'),
    receivedBy: z.string().min(2, 'Received By name is required'),
    samplingLocation: z.string().min(2, 'Sampling location / suite is required'),
    storageCondition: z.string().min(2, 'Storage condition is required'),
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT']),
    testSpecificationIds: z
      .array(z.string())
      .min(1, 'At least one compendial test specification must be assigned'),
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

    // 3. If Manual ID generation policy is chosen, customSampleId is required and must follow format
    if (data.idGenerationPolicy === 'MANUAL') {
      if (!data.customSampleId || data.customSampleId.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Sample ID is required when manual entry policy is selected (min 3 chars)',
          path: ['customSampleId'],
        });
      }
    }
  });

type SampleFormValues = z.infer<typeof sampleFormSchema>;

interface NewSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLaboratory?: 'SAF' | 'SEF' | 'PENICILLIN' | 'GENERAL';
  onSampleCreated?: (createdSample: any) => void;
}

export function NewSampleModal({
  isOpen,
  onClose,
  defaultLaboratory = 'GENERAL',
  onSampleCreated,
}: NewSampleModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Fetch test specifications for multi-select
  const { data: specifications } = useQuery({
    queryKey: ['specifications'],
    queryFn: () => api.get<any[]>('/tests/specifications'),
    enabled: isOpen,
  });

  // Fetch active users for Received By selection
  const { data: usersList } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get<any[]>('/users'),
    enabled: isOpen,
  });

  // Default current timestamp in 'YYYY-MM-DDTHH:mm' format
  const currentLocalISOString = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }, [isOpen]);

  const defaultValues: SampleFormValues = {
    laboratory: defaultLaboratory,
    samplingDateTime: currentLocalISOString,
    nomenclature: '',
    idGenerationPolicy: 'AUTO',
    customSampleId: '',
    sampleType: 'Finished Product',
    customStage: '',
    sampleQty: 100,
    unit: 'tablets',
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

  // Update defaults when modal opens or laboratory switches
  useEffect(() => {
    if (isOpen) {
      setValue('laboratory', defaultLaboratory);
      setValue('samplingDateTime', currentLocalISOString);
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
  }, [isOpen, defaultLaboratory, currentLocalISOString, user, setValue]);

  const watchedLab = watch('laboratory');
  const watchedPolicy = watch('idGenerationPolicy');
  const watchedCustomId = watch('customSampleId');
  const watchedSampleType = watch('sampleType');
  const watchedSelectedSpecs = watch('testSpecificationIds') || [];
  const watchedBatchId = watch('batchId');
  const debouncedManualId = useDebounce(watchedCustomId, 400);

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
      // Invalidate queries so table updates immediately
      queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      setSuccessInfo({
        sampleCode: newSample.sampleCode,
        accessionNo: newSample.accessionNo,
        nomenclature: newSample.nomenclature || newSample.materialName,
        laboratory: newSample.laboratory || watchedLab,
      });

      if (onSampleCreated) {
        onSampleCreated(newSample);
      }

      reset(defaultValues);

      // Auto close after brief display, or user can click Close
      setTimeout(() => {
        onClose();
      }, 1400);
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

    // Prevent submission if duplicate ID was detected
    if (formData.idGenerationPolicy === 'MANUAL' && idCheckStatus === 'duplicate') {
      setSubmitError('Cannot submit: The specified Sample ID already exists in the registry.');
      return;
    }

    const finalStage =
      formData.sampleType === 'Other'
        ? (formData.customStage?.trim() || 'Other')
        : formData.sampleType;

    const payload: any = {
      laboratory: formData.laboratory,
      samplingDate: new Date(formData.samplingDateTime).toISOString(),
      nomenclature: formData.nomenclature.trim(),
      materialName: formData.nomenclature.trim(),
      stageType: finalStage,
      sampleType: finalStage,
      sampleCode:
        formData.idGenerationPolicy === 'MANUAL' && formData.customSampleId?.trim()
          ? formData.customSampleId.trim()
          : undefined, // Backend will auto-generate if undefined
      sampleQty: Number(formData.sampleQty),
      unit: formData.unit.trim(),
      batchId: formData.batchId || undefined,
      lotNumber: formData.lotNumber?.trim() || undefined,
      mfgDate: formData.mfgDate || undefined,
      expDate: formData.expDate || undefined,
      submittedBy: formData.submittedBy.trim(),
      samplingLocation: formData.samplingLocation.trim(),
      storageCondition: formData.storageCondition.trim(),
      priority: formData.priority,
      testSpecificationIds: formData.testSpecificationIds,
      remarks: formData.remarks?.trim() || undefined,
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

  const toggleTestSpec = (specId: string) => {
    if (watchedSelectedSpecs.includes(specId)) {
      setValue(
        'testSpecificationIds',
        watchedSelectedSpecs.filter((id) => id !== specId),
        { shouldValidate: true, shouldDirty: true }
      );
    } else {
      setValue('testSpecificationIds', [...watchedSelectedSpecs, specId], {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title="Create Sampling Record"
        subtitle="Official pharmaceutical accession intake, laboratory assignment, and compendial test worksheets"
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

          {/* Section 1: Laboratory Suite Selection (Auto-selected from current lab page) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                1. Target Laboratory Suite <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Auto-assigned from active laboratory view
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  key: 'SAF',
                  label: 'SEF Lab',
                  icon: Microscope,
                },
                {
                  key: 'PENICILLIN',
                  label: 'Penicillin Lab',
                  icon: ShieldAlert,
                },
                {
                  key: 'GENERAL',
                  label: 'General Lab',
                  icon: FlaskConical,
                },
              ].map((lab) => {
                const Icon = lab.icon;
                const isSelected = watchedLab === lab.key;
                return (
                  <button
                    key={lab.key}
                    type="button"
                    onClick={() => setValue('laboratory', lab.key as any, { shouldDirty: true })}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          isSelected ? 'text-white' : 'text-slate-500'
                        )}
                      />
                      <span className="font-bold text-xs">{lab.label}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Core Identifiers & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date & Time (Defaults to current time, editable) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-navy-900" />
                  <span>Sampling Date & Time <span className="text-rose-500">*</span></span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">Current timestamp default</span>
              </label>
              <input
                type="datetime-local"
                {...register('samplingDateTime')}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white"
              />
              {errors.samplingDateTime && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.samplingDateTime.message}</span>
                </p>
              )}
            </div>

            {/* Sample ID Generation Policy & Unique ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>Sample ID Policy <span className="text-rose-500">*</span></span>
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('idGenerationPolicy', 'AUTO', { shouldDirty: true });
                      setIdCheckStatus('idle');
                      setDuplicateMessage(null);
                    }}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border',
                      watchedPolicy === 'AUTO'
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                  >
                    Auto-Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('idGenerationPolicy', 'MANUAL', { shouldDirty: true })}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border',
                      watchedPolicy === 'MANUAL'
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                  >
                    Manual Entry
                  </button>
                </div>
              </div>

              {watchedPolicy === 'AUTO' ? (
                <div className="px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-between">
                  <span className="text-teal-800 font-bold">Auto: SMP-{new Date().getFullYear()}-XXXX</span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-sans font-medium">
                    Auto-Sequential
                  </span>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      {...register('customSampleId')}
                      placeholder="e.g. SMP-2026-9041"
                      className={cn(
                        'w-full px-3 py-2 text-xs font-mono rounded-lg border outline-none pr-8',
                        idCheckStatus === 'duplicate'
                          ? 'border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/50'
                          : idCheckStatus === 'available'
                          ? 'border-emerald-400 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/30'
                          : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900'
                      )}
                    />
                    <div className="absolute right-2.5 top-2.5">
                      {idCheckStatus === 'checking' && (
                        <div className="h-3 w-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      {idCheckStatus === 'available' && (
                        <Check className="h-3.5 w-3.5 text-emerald-600 font-bold" />
                      )}
                      {idCheckStatus === 'duplicate' && (
                        <X className="h-3.5 w-3.5 text-rose-600 font-bold" />
                      )}
                    </div>
                  </div>

                  {duplicateMessage && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{duplicateMessage}</span>
                    </p>
                  )}
                  {errors.customSampleId && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      {errors.customSampleId.message}
                    </p>
                  )}
                </div>
              )}
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
              placeholder="e.g. Paracetamol 500mg Film-Coated Tablets (USP/BP)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none text-slate-900 font-medium"
            />
            {errors.nomenclature && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.nomenclature.message}</span>
              </p>
            )}
          </div>

          {/* Section 4: Stage / Type, Batch / Lot No., Quantity & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Stage / Type */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Stage / Type <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('sampleType')}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium text-slate-800"
              >
                {SAMPLE_STAGES.map((stg) => (
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
                placeholder="e.g. CP-2026-B892"
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
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="mL">Milliliters (mL)</option>
                <option value="L">Liters (L)</option>
                <option value="vials">Vials</option>
                <option value="ampoules">Ampoules</option>
                <option value="bottles">Bottles</option>
                <option value="units">Units</option>
              </select>
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
                placeholder="e.g. Bilal Raza (Packaging Line 2)"
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
                placeholder="e.g. Dr. Tariq Mahmood (QC Intake Analyst)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none text-slate-800"
              />
              {errors.receivedBy && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.receivedBy.message}</p>
              )}
            </div>
          </div>

          {/* Section 7: Storage & Sampling Room */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Storage Condition
              </label>
              <input
                type="text"
                {...register('storageCondition')}
                placeholder="e.g. Controlled Room Temp 20-25°C, Cold Storage 2-8°C"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium text-slate-800"
              >
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent (48 hr)</option>
                <option value="STAT">STAT / Immediate</option>
              </select>
            </div>
          </div>

          {/* Section 8: Compendial Test Specifications Assignment */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                Assign Compendial Tests <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                ({watchedSelectedSpecs.length} selected)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
              {specifications?.map((spec) => {
                const isChecked = watchedSelectedSpecs.includes(spec.id);
                return (
                  <div
                    key={spec.id}
                    onClick={() => toggleTestSpec(spec.id)}
                    className={cn(
                      'p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2',
                      isChecked
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-white hover:bg-slate-100/70 border-slate-200 text-slate-800'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-navy-900 focus:ring-navy-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{spec.name}</div>
                      <div
                        className={cn(
                          'text-[10px] mt-0.5 truncate',
                          isChecked ? 'text-teal-300' : 'text-slate-500'
                        )}
                      >
                        {spec.pharmacopeiaMethod} •{' '}
                        {spec.defaultMinLimit !== null
                          ? `${spec.defaultMinLimit} - ${spec.defaultMaxLimit} ${spec.unit || ''}`
                          : 'Qualitative Conformance'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.testSpecificationIds && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.testSpecificationIds.message}</span>
              </p>
            )}
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
    </>
  );
}
