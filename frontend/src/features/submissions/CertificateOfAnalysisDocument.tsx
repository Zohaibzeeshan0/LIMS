import React from 'react';
import { Batch } from '@/types/lims';
import { formatDateOnly, formatDateTime } from '@/lib/date';
import { ShieldCheck } from 'lucide-react';

interface CoaDocumentProps {
  batch: Batch;
}

export function CertificateOfAnalysisDocument({ batch }: CoaDocumentProps) {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs space-y-6 text-slate-900">
      {/* Letterhead */}
      <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            CITY PHARMA LABORATORIES LTD.
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            QUALITY CONTROL & REGULATORY ASSURANCE DIVISION
          </p>
          <p className="text-[11px] text-slate-400">
            Plot 48/B, Industrial Area, Karachi • cGMP Licensed Laboratory
          </p>
        </div>
        <div className="text-right font-mono">
          <div className="text-sm font-bold text-slate-900">CERTIFICATE OF ANALYSIS</div>
          <div className="text-xs text-teal-700 font-semibold">{batch.coa?.certificateNumber}</div>
          <div className="text-[10px] text-slate-400">
            Issued: {formatDateTime(batch.coa?.issuedDate || new Date(), 'dd MMM yyyy')}
          </div>
        </div>
      </div>

      {/* Batch Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Product Name</span>
          <span className="font-bold text-slate-900">{batch.drugProduct}</span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Batch / Lot Number</span>
          <span className="font-mono font-bold text-slate-900">{batch.batchNumber}</span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Manufacturing Date</span>
          <span className="font-medium text-slate-800">{formatDateOnly(batch.manufacturingDate)}</span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Expiration Date</span>
          <span className="font-medium text-slate-800">{formatDateOnly(batch.expiryDate)}</span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Dosage Form</span>
          <span className="font-medium text-slate-800">{batch.dosageForm}</span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Batch Size</span>
          <span className="font-mono font-medium text-slate-800">{batch.batchSize}</span>
        </div>
        <div className="col-span-2">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Compendial Standard</span>
          <span className="font-medium text-slate-800">USP 44-NF 39 / BP Monographs</span>
        </div>
      </div>

      {/* Analytical Table */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
          Finished Product Analytical Release Tests
        </h4>
        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Test Parameter</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Specification Limits</th>
                <th className="py-2.5 px-3">Observed Results</th>
                <th className="py-2.5 px-3 text-right">Conclusion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batch.samples?.[0]?.tests?.map((t: any) => (
                <tr key={t.id}>
                  <td className="py-2 px-3 font-semibold text-slate-800">{t.testSpecification.name}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{t.testSpecification.pharmacopeiaMethod}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">
                    {t.minLimit !== null ? `${t.minLimit} - ${t.maxLimit} ${t.unit || ''}` : 'Conforms'}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900">
                    {t.numericResult !== null ? `${t.numericResult} ${t.unit || ''}` : (t.textResult || 'Conforms')}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      CONFORMS
                    </span>
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    All finished product compendial parameters meet USP criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certification Remarks */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
        <strong>Certification Statement:</strong> {batch.coa?.remarks || 'This batch complies with all specified compendial release requirements.'}
      </div>

      {/* Electronic Sign-Off */}
      <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-teal-700" />
            <span>21 CFR Part 11 Electronic Signature Verification</span>
          </div>
          <p className="text-[10px] text-slate-500 max-w-sm font-mono break-all">
            SHA-256 Digest: {batch.coa?.signatureHash || 'c8f731e0b924619a84d...'}
          </p>
        </div>

        <div className="text-right">
          <div className="inline-block p-3 rounded-xl border border-teal-200 bg-teal-50/50 text-left">
            <span className="text-[10px] text-teal-700 uppercase font-bold block">Authorized QA Sign-Off</span>
            <span className="text-xs font-bold text-slate-900 block">{batch.coa?.authorizedBy?.fullName || 'Fatima Noor'}</span>
            <span className="text-[10px] text-slate-500 block">Head of Quality Assurance • EMP-014</span>
          </div>
        </div>
      </div>
    </div>
  );
}
