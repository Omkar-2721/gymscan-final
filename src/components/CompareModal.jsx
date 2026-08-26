import React, { useState } from 'react';
import { GitCompare, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';

export default function CompareModal({ isOpen, onClose }) {
  const [prod1, setProd1] = useState(SAMPLE_PRODUCTS[0]);
  const [prod2, setProd2] = useState(SAMPLE_PRODUCTS[1]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-5xl glass-hud rounded-3xl p-6 sm:p-8 my-8 border border-rose-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-syne text-maroon-950 dark:text-white">Supplement Compare Showdown</h2>
            <p className="text-xs text-slate-500 dark:text-rose-300/70">Side-by-side purity, true protein %, and amino-spiking analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-2xl glass-card-neo border border-rose-500/20">
            <label className="text-xs font-bold text-slate-500 dark:text-rose-300 block mb-1">Select Product A:</label>
            <select 
              value={prod1.id} 
              onChange={(e) => setProd1(SAMPLE_PRODUCTS.find(p => p.id === e.target.value))}
              aria-label="Select Product A"
              className="w-full bg-black/5 dark:bg-black/90 border border-rose-500/20 rounded-xl p-2.5 text-sm font-bold text-maroon-950 dark:text-white outline-none cursor-pointer"
            >
              {SAMPLE_PRODUCTS.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name} ({p.brand})</option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-2xl glass-card-neo border border-rose-500/20">
            <label className="text-xs font-bold text-slate-500 dark:text-rose-300 block mb-1">Select Product B:</label>
            <select 
              value={prod2.id} 
              onChange={(e) => setProd2(SAMPLE_PRODUCTS.find(p => p.id === e.target.value))}
              aria-label="Select Product B"
              className="w-full bg-black/5 dark:bg-black/90 border border-rose-500/20 rounded-xl p-2.5 text-sm font-bold text-maroon-950 dark:text-white outline-none cursor-pointer"
            >
              {SAMPLE_PRODUCTS.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.name} ({p.brand})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
            prod1.riskLevel === 'danger' ? 'bg-rose-950/20 border-rose-500/30' : 'bg-emerald-950/20 border-emerald-500/30'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{prod1.category}</span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase ${
                  prod1.riskLevel === 'danger' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  Score: {prod1.purityScore}/100
                </span>
              </div>
              <h3 className="text-xl font-black font-syne text-maroon-950 dark:text-white">{prod1.name}</h3>
              <p className="text-xs text-slate-500 dark:text-rose-300/70 mb-4">{prod1.brand}</p>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-rose-500/10">
                  <span className="text-slate-500 dark:text-rose-300/70">Claimed Protein:</span>
                  <span className="font-bold text-maroon-950 dark:text-white">{prod1.claimedProtein}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-500/10">
                  <span className="text-slate-500 dark:text-rose-300/70">True Intact Protein:</span>
                  <span className={`font-black font-mono ${prod1.riskLevel === 'danger' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {prod1.actualProtein}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-500/10">
                  <span className="text-slate-500 dark:text-rose-300/70">Amino Spiking:</span>
                  <span className="font-bold">{prod1.flags.aminoSpiking ? '🚨 YES (High Risk)' : '✅ NONE'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-500/10">
                  <span className="text-slate-500 dark:text-rose-300/70">Banned Stims (WADA):</span>
                  <span className="font-bold">{prod1.flags.bannedSubstances ? '⛔ Banned Stimulant' : '✅ Compliant'}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-rose-500/15">
              <span className="text-[11px] font-bold block mb-1 text-slate-500 dark:text-rose-300/70">Lab Verdict:</span>
              <p className="text-xs font-bold text-maroon-950 dark:text-white">{prod1.verdict}</p>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
            prod2.riskLevel === 'danger' ? 'bg-rose-950/20 border-rose-500/30' : 'bg-emerald-950/20 border-emerald-500/30'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{prod2.category}</span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase ${
                  prod2.riskLevel === 'danger' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  Score: {prod2.purityScore}/100
                </span>
              </div>
              <h3 className="text-xl font-black font-syne text-maroon-950 dark:text-white">{prod2.name}</h3>
              <p className="text-xs text-slate-500 dark:text-rose-300/70 mb-4">{prod2.brand}</p>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-rose-500/10">
                  <span className="text-slate-500 dark:text-rose-300/70">Claimed Protein:</span>
                  <span className="font-bold text-maroon-950 dark:text-white">{prod2.claimedProtein}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-500/10">
                  <span className="text-slate-500 dark:text-rose-300/70">True Intact Protein:</span>
                  <span className={`font-black font-mono ${prod2.riskLevel === 'danger' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {prod2.actualProtein}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-500/10">
                  <span className="text-slate-500 dark:text-rose-300/70">Amino Spiking:</span>
                  <span className="font-bold">{prod2.flags.aminoSpiking ? '🚨 YES (High Risk)' : '✅ NONE'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-rose-500/10">
                  <span className="text-slate-500 dark:text-rose-300/70">Banned Stims (WADA):</span>
                  <span className="font-bold">{prod2.flags.bannedSubstances ? '⛔ Banned Stimulant' : '✅ Compliant'}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-rose-500/15">
              <span className="text-[11px] font-bold block mb-1 text-slate-500 dark:text-rose-300/70">Lab Verdict:</span>
              <p className="text-xs font-bold text-maroon-950 dark:text-white">{prod2.verdict}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
