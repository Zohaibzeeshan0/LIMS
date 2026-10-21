'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Printer, Download, QrCode, ShieldCheck, CheckCircle2, FlaskConical, Clock, Layers, Send } from 'lucide-react';
import QRCode from 'qrcode';
import { Sample } from '@/types/lims';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';

export interface SampleRoutingChitData {
  sample: Sample;
  destinationLab?: string | null;
  submissionNumber?: string | null;
  submittedByName?: string | null;
  submittedAt?: string | Date | null;
  testNames?: string[];
  remarks?: string | null;
}

interface SampleRoutingChitModalProps {
  isOpen: boolean;
  onClose: () => void;
  chitData: SampleRoutingChitData | null;
  onProceedToSubmit?: (sample: Sample) => void;
}

export function SampleRoutingChitModal({
  isOpen,
  onClose,
  chitData,
  onProceedToSubmit,
}: SampleRoutingChitModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const sample = chitData?.sample;
  const sampleCode = sample?.sampleCode || sample?.sampleId || 'GL/SB-1';
  const nomenclature = sample?.nomenclature || sample?.materialName || 'Pharmaceutical Sample';
  const lotNumber = sample?.lotNumber || sample?.batchLotNumber || 'N/A';
  const stage = (sample?.stageType || sample?.sampleType || 'Standard').replace(/^\[(Semi Basics?|Formulation)\]\s*/i, '');
  const isSemiBasics = sampleCode.includes('/SB') || (sample?.stageType || '').toLowerCase().includes('semi');
  const sectionName = isSemiBasics ? '1. Semi Basics' : '2. Formulation';
  const sampleQty = sample?.sampleQty || sample?.quantity || 1;
  const unit = sample?.unit || sample?.quantityUnit || 'units';
  const isUrgent = sample?.priority === 'URGENT' || sample?.priority === 'STAT';
  const priorityLabel = isUrgent ? 'URGENT (1 Hr - 2 Days SLA)' : 'ROUTINE (5 - 15 Days SLA)';
  const destinationLab = chitData?.destinationLab;
  const destLabFormatted =
    !destinationLab || destinationLab === 'PENDING_WORKFLOW'
      ? 'General Lab Intake Desk (Pending Route)'
      : destinationLab === 'CHEMICAL'
      ? 'Chemical Testing Laboratory'
      : destinationLab === 'MICROBIOLOGY'
      ? 'Microbiology Laboratory'
      : destinationLab === 'PHYSICAL'
      ? 'Physical Testing Laboratory'
      : destinationLab;

  const samplingDateStr = sample?.samplingDate
    ? formatDateTime(sample.samplingDate, 'dd MMM yyyy, hh:mm a')
    : '—';

  const submissionDateStr = chitData?.submittedAt
    ? formatDateTime(chitData.submittedAt, 'dd MMM yyyy, hh:mm a')
    : '—';

  // Comprehensive QR Code Payload (contains full structured data for universal scanning)
  useEffect(() => {
    if (!sample) return;
    let isMounted = true;

    const qrText = `==============================
STAR LIMS • QUALITY CONTROL
SAMPLE ROUTING & CONTAINER SLIP
==============================
Sample ID: ${sampleCode}
Material: ${nomenclature}
Section: ${sectionName}
Stage: ${stage}
Batch / Lot: ${lotNumber}
Quantity: ${sampleQty} ${unit}
Priority: ${priorityLabel}
Routed To: ${destLabFormatted}
Sampling Date: ${samplingDateStr}
Submission Date: ${submissionDateStr}
Status: ${sample.status || 'SUBMITTED'}
Facility: General Lab
==============================
Verify: ${typeof window !== 'undefined' ? window.location.origin : ''}/samples?sampleId=${encodeURIComponent(sampleCode)}`;

    QRCode.toDataURL(qrText, {
      width: 260,
      margin: 1,
      color: { dark: '#0b132b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR code generation error:', err));

    return () => {
      isMounted = false;
    };
  }, [sample, sampleCode, nomenclature, sectionName, stage, lotNumber, sampleQty, unit, priorityLabel, destLabFormatted, samplingDateStr, submissionDateStr]);

  const handlePrint = () => {
    const chitEl = document.getElementById('printable-routing-chit');
    if (!chitEl) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=680,height=750');
    if (!printWindow) {
      window.print();
      return;
    }
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Container Slip - ${sampleCode}</title>
          ${styles}
          <style>
            @page { size: auto; margin: 4mm; }
            body { background: white !important; padding: 12px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            #printable-routing-chit { width: 100% !important; max-width: 480px !important; margin: 0 auto !important; border: 2px solid #0f172a !important; box-shadow: none !important; }
          </style>
        </head>
        <body class="bg-white">
          <div style="width: 100%; display: flex; justify-content: center;">
            ${chitEl.outerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_SLIP_${sampleCode.replace(/[\/\\]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen || !sample) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sample Container Routing Slip / Label"
      subtitle={`Official physical container label slip for Sample ${sampleCode}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Printable Physical Thermal Container Slip */}
        <div className="p-3 sm:p-5 rounded-2xl bg-slate-100/80 border border-slate-200 flex justify-center overflow-x-auto">
          <div
            id="printable-routing-chit"
            className="w-full max-w-[480px] bg-white p-4 sm:p-5 rounded-xl border-2 border-slate-900 shadow-md text-slate-900 font-sans print:shadow-none print:border-black print:m-0 print:p-2"
          >
            {/* Slip Header */}
            <div className="border-b-2 border-slate-900 pb-2.5 mb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-slate-900 shrink-0" />
                  <span className="font-extrabold text-xs tracking-wider uppercase">
                    CITI PHARMA • STAR LIMS QC
                  </span>
                </div>
                <div className="text-[10px] font-bold text-slate-600 mt-0.5 uppercase tracking-wide">
                  Laboratory Transfer & Container Slip
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[9px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">
                  CONTAINER SLIP
                </span>
                <span className="block text-[8px] font-mono text-slate-500 mt-0.5">
                  REF: {chitData?.submissionNumber || (sample?.id ? `SUB-${String(sample.id).slice(0, 6).toUpperCase()}` : 'SUB-PENDING')}
                </span>
              </div>
            </div>

            {/* Chit Main Body: Sample Data + QR Code */}
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Left Column: Essential Sample Identifiers */}
              <div className="col-span-8 space-y-2 text-xs">
                {/* Sample ID Highlight */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sample Identification:
                  </span>
                  <span className="font-mono font-extrabold text-base text-blue-900 tracking-tight block">
                    {sampleCode}
                  </span>
                </div>

                {/* Product Name */}
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Material / Product Name:
                  </span>
                  <span className="font-bold text-xs text-slate-900 block leading-tight">
                    {nomenclature}
                  </span>
                </div>

                {/* Section & Stage */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Section:</span>
                    <span className="font-bold text-slate-800 block truncate">{sectionName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Stage:</span>
                    <span className="font-semibold text-slate-800 block truncate">{stage}</span>
                  </div>
                </div>

                {/* Batch / Lot No. & Quantity */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Batch / Lot #:</span>
                    <span className="font-mono font-bold text-slate-800 block truncate">{lotNumber}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Container Qty:</span>
                    <span className="font-mono font-bold text-slate-800 block truncate">{sampleQty} {unit}</span>
                  </div>
                </div>

                {/* Testing Priority SLA */}
                <div>
                  <span className="font-bold text-slate-400 uppercase block text-[8px]">Priority & SLA:</span>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border',
                    isUrgent
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  )}>
                    {priorityLabel}
                  </span>
                </div>

                {/* Destination Routing */}
                <div className="bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-200/80">
                  <span className="text-[8px] font-bold text-indigo-900 uppercase block">
                    Destination Suite:
                  </span>
                  <span className="font-bold text-[11px] text-indigo-950 block">
                    {destLabFormatted}
                  </span>
                </div>
              </div>

              {/* Right Column: QR Code & Scan Prompt */}
              <div className="col-span-4 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${sampleCode}`}
                    className="w-28 h-28 rounded-lg bg-white p-1 border border-slate-300 shadow-2xs"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-lg bg-white border border-slate-300 flex items-center justify-center">
                    <QrCode className="h-10 w-10 text-slate-400 animate-pulse" />
                  </div>
                )}
                <span className="text-[9px] font-mono font-extrabold text-slate-800 mt-1.5 text-center">
                  SCAN FOR DATA
                </span>
                <span className="text-[8px] font-mono text-slate-400 text-center">
                  21 CFR Part 11
                </span>
              </div>
            </div>

            {/* Handover & Chain of Custody Signatures */}
            <div className="mt-3 pt-2 border-t-2 border-slate-900 grid grid-cols-2 gap-3 text-[9px]">
              <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
                <span className="font-bold text-slate-600 block uppercase text-[8px]">
                  Sample Dispatched By:
                </span>
                <span className="font-semibold text-slate-900 block truncate">
                  {chitData?.submittedByName || sample?.submittedBy || 'Sampling Officer'}
                </span>
                <div className="mt-2 border-b border-dashed border-slate-400" />
                <span className="text-[7px] text-slate-400 block text-center mt-0.5">Signature / Stamp</span>
              </div>

              <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
                <span className="font-bold text-slate-600 block uppercase text-[8px]">
                  QC Analyst Receiving:
                </span>
                <span className="font-semibold text-slate-900 block truncate">
                  [ Pending Intake Sign-off ]
                </span>
                <div className="mt-2 border-b border-dashed border-slate-400" />
                <span className="text-[7px] text-slate-400 block text-center mt-0.5">Signature & Date</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[8px] font-mono text-slate-500">
              <span>Date: {submissionDateStr}</span>
              <span>ATTACH DIRECTLY TO SAMPLE CONTAINER</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Ready for thermal label printing & container attachment.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs border-slate-300 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download QR</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sample Slip</span>
            </Button>

            {onProceedToSubmit && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onProceedToSubmit(sample);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit to Workflow</span>
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default SampleRoutingChitModal;
