import React from 'react';
import { X, Printer, FileDown, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { downloadScanReportPDF } from '../utils/pdfReport';
import { BANNED_LIST_DISCLAIMER } from '../data/bannedSubstances';

/**
 * Clean White Print-Ready Clinical Ingredients Audit Report Modal
 * matching clinical print/PDF reports (with 1-click browser Print/Save PDF + direct .pdf download).
 */
export default function ClinicalAuditReport({ isOpen, onClose, scanResult, userEmail = null }) {
  if (!isOpen || !scanResult) return null;

  const isBlocked = Boolean(scanResult.scoreBlocked || scanResult.purityScore == null);
  const scoreVal = isBlocked ? 'N/A' : scanResult.purityScore;
  const banned = scanResult.bannedSubstancesDetected || [];
  const contam = scanResult.contaminationRisksDetected || [];
  const whyList = scanResult.whyThisScore || [];
  const ings = scanResult.ingredientsList || [];

  const ringColor = isBlocked
    ? 'border-amber-500 text-amber-600'
    : scoreVal >= 75
    ? 'border-emerald-600 text-emerald-700'
    : scoreVal >= 50
    ? 'border-amber-500 text-amber-700'
    : 'border-red-600 text-red-700';

  const statusPill = isBlocked
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : banned.length > 0
    ? 'bg-red-100 text-red-800 border-red-300'
    : scoreVal >= 75
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : scoreVal >= 50
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-orange-100 text-orange-800 border-orange-300';

  const safeStatusText = isBlocked
    ? 'UNREADABLE'
    : banned.length > 0
    ? 'BANNED / UNSAFE'
    : scoreVal >= 75
    ? 'SAFE / FAVORABLE'
    : scoreVal >= 50
    ? 'MODERATE'
    : 'HIGH RISK';

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/90 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Action Bar (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-4 shadow-lg border border-slate-200 print:hidden">
          <div>
            <span className="text-xs font-black text-slate-900 block">
              Report Generated Successfully
            </span>
            <span className="text-[11px] text-slate-500">
              Print/Save directly as PDF or download the generated .pdf file.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadScanReportPDF(scanResult)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Download .PDF File</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              title="Close Report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Crisp White Printable Sheet */}
        <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-xl border border-slate-200 space-y-6 print:shadow-none print:border-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b-2 border-slate-900">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                CLINICAL INGREDIENTS AUDIT REPORT
              </h1>
              <p className="text-xs font-mono tracking-wider text-slate-500 uppercase mt-1">
                GYMSCAN SUPPLEMENT SAFETY & PURITY INTELLIGENCE
              </p>
            </div>
            <img src="/logo.png" alt="GymScan" className="w-10 h-10 object-contain rounded-full border border-slate-200" />
          </div>

          {/* Subject Profile & Product Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Subject Profile
              </span>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Account</span>
                <span className="font-bold text-slate-900">{userEmail || 'Guest Session'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Audit Timestamp</span>
                <span className="font-mono font-bold text-slate-900">{new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Scoring Engine</span>
                <span className="font-bold text-slate-900">
                  {scanResult.mlPowered ? `Python ML (${scanResult.mlScore?.model_used || 'RF'})` : 'Conservative Scorer'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Product Overview
              </span>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Product Name</span>
                <span className="font-bold text-slate-900 text-right">{scanResult.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Manufacturer / Brand</span>
                <span className="font-bold text-slate-900">{scanResult.brand || 'Unknown'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Category / Spiking Risk</span>
                <span className="font-bold text-slate-900">
                  {scanResult.category} • {scanResult.mlSpiking?.spiking_risk || (scanResult.flags?.aminoSpiking ? 'high' : 'low')}
                </span>
              </div>
            </div>
          </div>

          {/* Circular Score + Diagnostic Summary */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shrink-0 bg-white ${ringColor}`}>
              <span className="text-2xl font-black font-mono leading-none">{scoreVal}</span>
              <span className="text-[9px] font-mono text-slate-400">{isBlocked ? 'BLOCKED' : '/ 100'}</span>
            </div>

            <div className="space-y-1.5 text-center sm:text-left">
              <h2 className="text-base font-black text-slate-950">Diagnostic Summary</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                <span className="text-slate-600">Safety Evaluation Status:</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${statusPill}`}>
                  {safeStatusText}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{scanResult.verdict}</p>
            </div>
          </div>

          {/* Banned & Contamination Callouts */}
          {banned.length > 0 && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-300 space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-black text-xs uppercase">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Banned Substances Flagged ({banned.length})</span>
              </div>
              {banned.map((b, i) => (
                <p key={i} className="text-xs text-red-900">
                  <strong>{b.name}</strong> ({b.category}): {b.whyProblem}
                </p>
              ))}
            </div>
          )}

          {contam.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Contamination Risk & Regulatory Warnings ({contam.length})</span>
              </div>
              {contam.map((c, i) => (
                <p key={i} className="text-xs text-amber-900">
                  <strong>{c.name}</strong>: {c.whyProblem}
                </p>
              ))}
            </div>
          )}

          {/* Full Ingredients Breakdown */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-black text-slate-950 border-b border-slate-200 pb-1.5">
              Full Ingredients Breakdown ({ings.length} Items)
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {ings.map((ing, i) => {
                const cls = ing.mlClass || ing.status;
                const chipCls =
                  cls === 'banned_wada'
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : cls === 'contamination_risk'
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                    : cls === 'harmful' || cls === 'danger'
                    ? 'bg-orange-100 border-orange-300 text-orange-900'
                    : cls === 'beneficial' || cls === 'safe'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-100 border-slate-200 text-slate-700';
                return (
                  <span key={i} className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${chipCls}`}>
                    {ing.name}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Why This Score */}
          {whyList.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-950 border-b border-slate-200 pb-1.5">
                Why This Score (Point Breakdown)
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {whyList.map((w, i) => (
                  <div key={i} className="py-1.5 flex justify-between gap-4">
                    <span className="text-slate-700">{w.label}</span>
                    <span className={`font-mono font-bold ${w.impact > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {w.impact > 0 ? `+${w.impact}` : w.impact} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Macros Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase">Serving</span>
              <span className="font-bold text-slate-900">{scanResult.servingSize || 'N/A'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase">Calories</span>
              <span className="font-bold text-slate-900">{scanResult.calories || 'N/A'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase">Protein</span>
              <span className="font-bold text-emerald-700">{scanResult.claimedProtein || 'N/A'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase">Carbs</span>
              <span className="font-bold text-slate-900">{scanResult.carbs || 'N/A'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block uppercase">Sugar</span>
              <span className="font-bold text-slate-900">{scanResult.sugar || 'N/A'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-3 border-t border-slate-200 text-center">
            {scanResult.disclaimer || BANNED_LIST_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
}
