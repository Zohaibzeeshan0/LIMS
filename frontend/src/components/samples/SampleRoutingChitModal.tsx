'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Printer, Download, QrCode, ShieldCheck, CheckCircle2, FlaskConical, Clock, Layers, Send, ExternalLink } from 'lucide-react';
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
  onViewSampleDetails?: (sample: Sample) => void;
}

export function SampleRoutingChitModal({
  isOpen,
  onClose,
  chitData,
  onProceedToSubmit,
  onViewSampleDetails,
}: SampleRoutingChitModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const sample = chitData?.sample;
  const sampleCode = sample?.sampleCode || sample?.sampleId || 'GL/SB-1';
  const nomenclature = sample?.nomenclature || sample?.materialName || 'Pharmaceutical Sample';
  const lotNumber = sample?.lotNumber || sample?.batchLotNumber || 'N/A';
  const mfgDate = sample?.mfgDate || (sample as any)?.manufacturingDate;
  const expDate = sample?.expDate || (sample as any)?.expiryDate;
  const mfgDateFormatted = mfgDate ? formatDateTime(mfgDate, 'dd/MM/yyyy') : '—';
  const expDateFormatted = expDate ? formatDateTime(expDate, 'dd/MM/yyyy') : '—';
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

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const sampleDetailUrl = `${origin}/samples?sampleId=${encodeURIComponent(sampleCode)}`;

    const qrText = `==============================
CITI PHARMA • LIMS
SAMPLE SLIP
==============================
Sample ID: ${sampleCode}
Product: ${nomenclature}
Category / Stage: ${stage}
Section: ${sectionName}
Batch / Lot: ${lotNumber || 'N/A'}
Mfg Date: ${mfgDateFormatted}
Exp Date: ${expDateFormatted}
Quantity: ${sampleQty} ${unit}
Priority / SLA: ${priorityLabel}
Routed To: ${destLabFormatted}
Sampling Date: ${samplingDateStr}
Submission Date: ${submissionDateStr}
Status: ${sample.status || 'SUBMITTED'}
Facility: General Laboratory
==============================
View Details: ${sampleDetailUrl}`;

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
  }, [sample, sampleCode, nomenclature, sectionName, stage, lotNumber, mfgDateFormatted, expDateFormatted, sampleQty, unit, priorityLabel, destLabFormatted, samplingDateStr, submissionDateStr]);

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
          <title>Sample Slip - ${sampleCode}</title>
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
      title="Sample Routing Slip"
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
            <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-900 shrink-0" />
                <span className="font-extrabold text-xs tracking-wider uppercase">
                  CITI PHARMA • LIMS
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[9px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">
                  SLIP
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
                    Product Name:
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
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Quantity:</span>
                    <span className="font-mono font-bold text-slate-800 block truncate">{sampleQty} {unit}</span>
                  </div>
                </div>

                {/* Manufacturing & Expiry Dates */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Mfg Date:</span>
                    <span className="font-mono font-bold text-slate-800 block truncate">{mfgDateFormatted}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Exp Date:</span>
                    <span className="font-mono font-bold text-slate-800 block truncate">{expDateFormatted}</span>
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
              </div>

              {/* Right Column: Product Name + QR Code + Mfg/Exp Dates + Clickable Detail Link */}
              <div className="col-span-4 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 shrink-0 text-center">
                {/* Product Name Above QR Code */}
                <div className="w-full mb-1.5 px-0.5">
                  <p
                    className="text-[11px] font-extrabold text-slate-900 leading-tight line-clamp-2"
                    title={nomenclature}
                  >
                    {nomenclature}
                  </p>
                </div>

                {/* QR Code Canvas / Image */}
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${sampleCode}`}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-white p-1 border border-slate-300 shadow-2xs"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-white border border-slate-300 flex items-center justify-center">
                    <QrCode className="h-10 w-10 text-slate-400 animate-pulse" />
                  </div>
                )}

                {/* Mfg & Exp Date directly with QR Code */}
                <div className="w-full mt-1.5 px-1 py-1 rounded-md bg-white border border-slate-200 text-[8.5px] font-mono text-slate-700 leading-tight shadow-2xs">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[7.5px] font-bold text-slate-400 uppercase">Mfg:</span>
                    <span className="font-bold text-slate-800">{mfgDateFormatted}</span>
                  </div>
                  <div className="flex justify-between items-center px-0.5 mt-0.5">
                    <span className="text-[7.5px] font-bold text-slate-400 uppercase">Exp:</span>
                    <span className="font-bold text-rose-700">{expDateFormatted}</span>
                  </div>
                </div>

                {/* Clickable Link Below QR Code */}
                <a
                  href={`/samples?sampleId=${encodeURIComponent(sample?.id || sampleCode)}`}
                  target={onViewSampleDetails ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (onViewSampleDetails && sample) {
                      e.preventDefault();
                      onViewSampleDetails(sample);
                    }
                  }}
                  className="mt-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer group shadow-2xs"
                  title="Click to view complete sample details"
                >
                  <span>View Sample Details</span>
                  <ExternalLink className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
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
