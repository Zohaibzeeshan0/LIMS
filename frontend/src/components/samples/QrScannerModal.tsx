'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Camera,
  Upload,
  Keyboard,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  QrCode,
  ScanLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScannedSampleData {
  rawText: string;
  sampleCode?: string;
  barcode?: string;
  nomenclature?: string;
  lotNumber?: string;
  sampleQty?: number;
  unit?: string;
  mfgDate?: string;
  expDate?: string;
  stageType?: string;
  laboratory?: string;
  sourceSupplier?: string;
}

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: ScannedSampleData) => void;
}

export function QrScannerModal({ isOpen, onClose, onScan }: QrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'lims-qr-reader-container';

  // Smart parser for scanned text (JSON, Key-Value, Pipe-Delimited, or plain barcode)
  const parseScannedText = (decodedText: string): ScannedSampleData => {
    const raw = decodedText.trim();
    const result: ScannedSampleData = { rawText: raw, barcode: raw };

    // 1. Try JSON parsing
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.sampleCode || parsed.sampleId || parsed.id) {
          result.sampleCode = parsed.sampleCode || parsed.sampleId || parsed.id;
        }
        if (parsed.nomenclature || parsed.materialName || parsed.material) {
          result.nomenclature = parsed.nomenclature || parsed.materialName || parsed.material;
        }
        if (parsed.lotNumber || parsed.batchNumber || parsed.lot || parsed.batch) {
          result.lotNumber = parsed.lotNumber || parsed.batchNumber || parsed.lot || parsed.batch;
        }
        if (parsed.sampleQty || parsed.quantity || parsed.qty) {
          const q = parseFloat(parsed.sampleQty || parsed.quantity || parsed.qty);
          if (!isNaN(q) && q > 0) result.sampleQty = q;
        }
        if (parsed.unit) result.unit = parsed.unit;
        if (parsed.mfgDate || parsed.manufacturingDate) {
          result.mfgDate = parsed.mfgDate || parsed.manufacturingDate;
        }
        if (parsed.expDate || parsed.expiryDate) {
          result.expDate = parsed.expDate || parsed.expiryDate;
        }
        if (parsed.stageType || parsed.stage || parsed.sampleType) {
          result.stageType = parsed.stageType || parsed.stage || parsed.sampleType;
        }
        if (parsed.laboratory || parsed.lab) {
          result.laboratory = parsed.laboratory || parsed.lab;
        }
        if (parsed.sourceSupplier || parsed.supplier) {
          result.sourceSupplier = parsed.sourceSupplier || parsed.supplier;
        }
        return result;
      }
    } catch {
      // Not JSON, continue to other formats
    }

    // 2. Try pipe or semicolon-separated format: e.g. LOT-123|Paracetamol|100|Tablet
    if (raw.includes('|') || (raw.includes(';') && !raw.includes('data:'))) {
      const delimiter = raw.includes('|') ? '|' : ';';
      const parts = raw.split(delimiter).map((p) => p.trim());
      if (parts.length >= 2) {
        // Guess assignment by content
        parts.forEach((part) => {
          if (/^(GL|CP|PL)\/(SB|F)[-\/]\d+$/i.test(part) || /^SMP-/i.test(part)) {
            result.sampleCode = part;
          } else if (/^(LOT|BATCH|CP-|B-|BN-)/i.test(part)) {
            result.lotNumber = part;
          } else if (/^\d+(\.\d+)?$/.test(part)) {
            result.sampleQty = parseFloat(part);
          } else if (/^(tablet|capsule|raw|g|mg|kg|ml|l|vial|ampoule)s?$/i.test(part)) {
            result.unit = part;
          } else if (!result.nomenclature) {
            result.nomenclature = part;
          }
        });
        return result;
      }
    }

    // 3. Try key-value lines: e.g. "LOT: CP-012\nNAME: Cefixime"
    if (raw.includes(':') && (raw.includes('\n') || raw.includes(','))) {
      const lines = raw.split(/[\n,]/).map((l) => l.trim());
      lines.forEach((line) => {
        const [k, ...vParts] = line.split(':');
        const key = k?.trim().toLowerCase();
        const val = vParts.join(':').trim();
        if (key && val) {
          if (key.includes('sample') || key.includes('code') || key.includes('id')) result.sampleCode = val;
          else if (key.includes('lot') || key.includes('batch')) result.lotNumber = val;
          else if (key.includes('name') || key.includes('product') || key.includes('material')) result.nomenclature = val;
          else if (key.includes('qty') || key.includes('quantity')) result.sampleQty = parseFloat(val);
          else if (key.includes('unit')) result.unit = val;
          else if (key.includes('mfg')) result.mfgDate = val;
          else if (key.includes('exp')) result.expDate = val;
        }
      });
      return result;
    }

    // 4. Fallback: single identifier string (Sample ID or Lot Number)
    if (/^(GL|CP|PL)\/(SB|F)[-\/]\d+$/i.test(raw) || /^SMP-/i.test(raw)) {
      result.sampleCode = raw;
    } else if (/^(CP-|LOT-|BATCH-|B-|BN-)/i.test(raw)) {
      result.lotNumber = raw;
    } else {
      result.barcode = raw;
    }

    return result;
  };

  const handleSuccessfulScan = (decodedText: string) => {
    stopCamera();
    const data = parseScannedText(decodedText);
    onScan(data);
    onClose();
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });
      }

      // Check available cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('No camera found on this device. You can upload an image or enter text manually.');
        return;
      }
      setAvailableCameras(devices);

      const targetCameraId = selectedCameraId || devices[0].id;

      await html5QrCodeRef.current.start(
        targetCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame scan error (normal when nothing is in focus)
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(
        err?.message || 'Unable to access camera. Please allow camera permissions in your browser or upload an image.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    }
    setIsScanning(false);
  };

  // Start camera on modal open and tab === 'camera'
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, selectedCameraId]);

  // File Upload scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    try {
      const qrScanner = html5QrCodeRef.current || new Html5Qrcode(scannerContainerId);
      const decodedText = await qrScanner.scanFile(file, true);
      handleSuccessfulScan(decodedText);
    } catch (err: any) {
      setFileError('Could not detect a valid QR Code or Barcode in this image. Please try a clearer picture.');
    }
  };

  // Manual submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    handleSuccessfulScan(manualText.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title="Scan Sample QR Code / Barcode"
      subtitle="Fast intake scanner via webcam, physical barcode gun, or label image upload"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer',
              activeTab === 'camera'
                ? 'bg-white text-navy-950 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Camera className="h-3.5 w-3.5 text-blue-600" />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer',
              activeTab === 'file'
                ? 'bg-white text-navy-950 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all cursor-pointer',
              activeTab === 'manual'
                ? 'bg-white text-navy-950 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Keyboard className="h-3.5 w-3.5 text-indigo-600" />
            <span>Barcode Gun / Text</span>
          </button>
        </div>

        {/* Tab 1: Live Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[300px]">
              {/* html5-qrcode video viewport */}
              <div id={scannerContainerId} className="w-full max-w-sm mx-auto overflow-hidden rounded-xl" />

              {/* Scanning visual laser overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-64 h-64 border-2 border-emerald-400/80 rounded-2xl relative shadow-lg">
                    {/* Corner Reticles */}
                    <span className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-emerald-400" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-emerald-400" />
                    <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-emerald-400" />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-emerald-400" />

                    {/* Animated Laser Beam */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2 shadow-xs" />
                  </div>
                  <span className="mt-3 px-3 py-1 rounded-full bg-slate-900/90 text-emerald-400 text-[11px] font-mono font-bold tracking-wide border border-emerald-500/30 backdrop-blur-xs flex items-center gap-1.5">
                    <ScanLine className="h-3 w-3 animate-spin text-emerald-400" />
                    <span>ALIGN QR CODE / BARCODE WITHIN FRAME</span>
                  </span>
                </div>
              )}

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-900/95 text-white">
                  <AlertTriangle className="h-10 w-10 text-amber-400 mb-2" />
                  <p className="text-sm font-bold text-white">Camera Access Required</p>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs">{cameraError}</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setActiveTab('file')}
                      className="text-xs px-3 py-1.5"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      <span>Upload Image Instead</span>
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={startCamera}
                      className="text-xs px-3 py-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      <span>Retry</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Switcher (if multiple cameras detected) */}
            {availableCameras.length > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="font-medium">Switch Camera:</span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 text-xs font-semibold outline-none"
                >
                  {availableCameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera ${cam.id.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upload QR / Barcode Image */}
        {activeTab === 'file' && (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50/60 hover:bg-emerald-50/30 transition-all cursor-pointer group text-center">
              <div className="p-3.5 rounded-2xl bg-white shadow-xs group-hover:scale-105 transition-transform border border-slate-200 text-emerald-600 mb-3">
                <Upload className="h-7 w-7" />
              </div>
              <span className="text-sm font-bold text-slate-800">
                Click or Drop QR Code / Barcode Image
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Supports PNG, JPG, JPEG, WebP photos of sample containers or labels
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {fileError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Manual Text / Barcode Gun */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Scan with Handheld USB Gun or Paste QR Text:
              </label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Scan with handheld laser scanner or paste JSON / barcode data here..."
                rows={4}
                autoFocus
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                USB Barcode scanners will automatically type the scanned data and trigger Enter.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!manualText.trim()}
              className="w-full py-2.5 text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white rounded-xl flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Apply Scanned Data to Sample Form</span>
            </Button>
          </form>
        )}

        {/* Footer Note */}
        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Automatic Field Extraction:</strong> Scanned barcodes and QR labels will automatically populate Product Nomenclature, Batch / Lot No., Dates, and Assigned Laboratory.
          </span>
        </div>
      </div>
    </Modal>
  );
}
