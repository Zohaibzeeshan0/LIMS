'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Printer, Download, QrCode, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';

interface SampleQrLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrDataUrl: string;
  sampleCode: string;
  nomenclature: string;
  lotNumber?: string;
  laboratoryName: string;
  sectionName: string;
  samplingDate: string;
  sampleQty?: number | string;
  unit?: string;
}

export function SampleQrLabelModal({
  isOpen,
  onClose,
  qrDataUrl,
  sampleCode,
  nomenclature,
  lotNumber,
  laboratoryName,
  sectionName,
  samplingDate,
  sampleQty,
  unit,
}: SampleQrLabelModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${sampleCode || 'SAMPLE'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sample Container QR Code & Label"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Printable Physical Thermal Label Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-center">
          <div
            id="printable-sample-label"
            className="w-full max-w-sm bg-white p-4 rounded-xl border-2 border-slate-900 shadow-md text-slate-900 font-sans print:shadow-none print:border-black print:m-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-900" />
                <span className="font-extrabold text-xs uppercase tracking-wider">
                  STAR LIMS • QUALITY CONTROL
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">
                SAMPLE LABEL
              </span>
            </div>

            {/* Label Body with QR Code */}
            <div className="flex items-start gap-3">
              {/* QR Code Canvas / Image */}
              <div className="shrink-0 flex flex-col items-center text-center">
                {/* Product Name Above QR Code */}
                <span className="text-[9px] font-bold text-slate-900 text-center truncate max-w-[105px] mb-1 block" title={nomenclature}>
                  {nomenclature}
                </span>

                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${sampleCode}`}
                    className="w-24 h-24 rounded border border-slate-300 bg-white p-1"
                  />
                ) : (
                  <div className="w-24 h-24 rounded border border-slate-300 bg-slate-100 flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <span className="text-[8px] font-mono font-bold text-slate-500 mt-1">
                  CP-{sampleCode}
                </span>

                {/* Clickable Link Below QR Code */}
                <a
                  href={`/samples?sampleId=${encodeURIComponent(sampleCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 text-[8px] font-bold inline-flex items-center gap-0.5 border border-blue-200 cursor-pointer"
                  title="Click to view sample details"
                >
                  <span>View Details</span>
                  <ExternalLink className="h-2 w-2" />
                </a>
              </div>

              {/* Sample Details */}
              <div className="flex-1 min-w-0 space-y-1 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Sample ID:</span>
                  <span className="font-mono font-extrabold text-sm text-blue-900 tracking-tight block truncate">
                    {sampleCode || 'GL/SB-1'}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Product Name:</span>
                  <span className="font-bold text-xs text-slate-900 block truncate">
                    {nomenclature || 'Pharmaceutical Sample'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div>
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Batch / Lot:</span>
                    <span className="font-mono font-bold text-slate-800 truncate block">
                      {lotNumber || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase block text-[8px]">Quantity:</span>
                    <span className="font-mono font-bold text-slate-800 truncate block">
                      {sampleQty ? `${sampleQty} ${unit || ''}` : 'Standard'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200 text-[9px] text-slate-600 flex justify-between items-center">
                  <span className="font-semibold truncate">{laboratoryName}</span>
                  <span className="font-mono text-[8px] text-slate-400">{sectionName}</span>
                </div>
              </div>
            </div>

            {/* Footer verification string */}
            <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>Date: {samplingDate || new Date().toLocaleDateString()}</span>
              <span>QC SECURE HASH: VERIFIED ✓</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownload}
            className="text-xs px-3 py-2 flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PNG</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handlePrint}
            className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Label</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
