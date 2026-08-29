import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, Share2, Eye, Zap, Flame, Award, Crosshair, Activity } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TRANSLATIONS } from '../data/translations';

export default function ARPhoneScanner({ currentLang, onLaunchScanner }) {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const [activeStep, setActiveStep] = useState(1);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev % 4) + 1);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleExpose = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#00F2FE', '#10B981', '#EF4444', '#F59E0B']
      });
    } catch (e) {
      console.log(e);
    }
    setToastMsg("🚨 Audit Card Generated: 'MegaMass Whey flagged for 41.7% fake amino spiking & 10g Maltodextrin!'");
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="w-full">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 glass-island border border-cyan-400/40 px-5 py-3 rounded-2xl text-cyan-200 text-xs font-bold flex items-center gap-3 animate-bounce shadow-2xl">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Holographic Diagnostic Pod Frame */}
      <div className="relative glass-hud rounded-3xl p-5 sm:p-6 border border-cyan-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.8)] hud-corner overflow-hidden group">
        
        {/* Top Diagnostic Telemetry Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-cyan-400 font-black tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>NEURAL VISION HUD // 60 FPS</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1 text-rose-400 font-bold">
              <Activity className="w-3 h-3" /> 4 HAZARDS LOCKED
            </span>
            <span className="hidden sm:inline text-slate-500">ISO-17025 CERTIFIED</span>
          </div>
        </div>

        {/* Viewfinder Scanning Grid Stage */}
        <div className="relative rounded-2xl bg-[#090C14] border border-white/10 p-4 overflow-hidden min-h-[310px] flex flex-col justify-between">
          
          {/* Tactical Crosshairs & Reticle Overlay */}
          <div className="absolute inset-0 bg-tactical-grid opacity-30 pointer-events-none"></div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-cyan-400">
            <Crosshair className="w-48 h-48 animate-pulse" />
          </div>

          {/* Animated Laser Scanning Beam */}
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00F2FE] animate-scan-laser pointer-events-none z-20"></div>

          {/* Scanned Supplement Tub Label Content */}
          <div className="relative z-10 space-y-2">
            <div className="flex justify-between items-center bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1 border border-white/10">
              <span className="text-[10px] font-mono font-bold text-cyan-300">SAMPLE: MEGAMASS GOLD WPC</span>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">AMINO SPIKED</span>
            </div>

            <p className="text-[10px] text-slate-400 font-mono leading-tight bg-black/40 p-2 rounded-lg border border-white/5">
              <span className="text-white font-bold">INGREDIENTS:</span> Whey Protein Concentrate (Low Grade 35%), Maltodextrin (Carb Filler), L-Glycine (Added Nitrogen), L-Taurine, Artificial Flavor, Sucralose (E955), Silicon Dioxide.
            </p>

            {/* Dynamic Real-Time Hazard Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between bg-rose-500/15 border border-rose-500/50 rounded-xl px-2.5 py-1.5 text-rose-300">
                <span className="text-[11px] font-bold">L-Glycine (Spiking Agent)</span>
                <span className="text-[9px] font-black bg-rose-500 text-black px-2 py-0.5 rounded-full uppercase">+6g FAKE NITROGEN</span>
              </div>

              <div className="flex items-center justify-between bg-rose-500/15 border border-rose-500/50 rounded-xl px-2.5 py-1.5 text-rose-300">
                <span className="text-[11px] font-bold">Maltodextrin Filler</span>
                <span className="text-[9px] font-black bg-rose-500 text-black px-2 py-0.5 rounded-full uppercase">10g CHEAP CORN SUGAR</span>
              </div>

              <div className="flex items-center justify-between bg-amber-500/15 border border-amber-500/50 rounded-xl px-2.5 py-1.5 text-amber-300">
                <span className="text-[11px] font-bold">Sucralose (High GI)</span>
                <span className="text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase">GUT IRRITATION</span>
              </div>

              <div className="flex items-center justify-between bg-emerald-500/15 border border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-emerald-300">
                <span className="text-[11px] font-bold">Whey Peptides (Intact)</span>
                <span className="text-[9px] font-black bg-emerald-500 text-black px-2 py-0.5 rounded-full uppercase">41.7% REAL PROTEIN</span>
              </div>
            </div>
          </div>

          {/* Bottom Live Score Dial & Action */}
          <div className="relative z-10 pt-3 border-t border-white/10 mt-3 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">BIOCHEMICAL PURITY</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-rose-400">32</span>
                <span className="text-xs text-slate-500">/ 100</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 uppercase ml-1">
                  CRITICAL FAIL
                </span>
              </div>
            </div>

            <button
              onClick={handleExpose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 text-black font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Expose Brand</span>
            </button>
          </div>

        </div>

        {/* 4-Step Interactive Navigation Tabs below the HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
          <button
            onClick={() => setActiveStep(1)}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
              activeStep === 1 ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-black/30 border-white/5 hover:border-white/15'
            }`}
          >
            <span className="text-[10px] font-mono font-black text-cyan-400 block">STEP 01</span>
            <span className="text-xs font-bold text-white block truncate">Snap Any Tub</span>
          </button>

          <button
            onClick={() => setActiveStep(2)}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
              activeStep === 2 ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-black/30 border-white/5 hover:border-white/15'
            }`}
          >
            <span className="text-[10px] font-mono font-black text-cyan-400 block">STEP 02</span>
            <span className="text-xs font-bold text-white block truncate">Flag Spiking</span>
          </button>

          <button
            onClick={() => setActiveStep(3)}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
              activeStep === 3 ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-black/30 border-white/5 hover:border-white/15'
            }`}
          >
            <span className="text-[10px] font-mono font-black text-cyan-400 block">STEP 03</span>
            <span className="text-xs font-bold text-white block truncate">Purity Score</span>
          </button>

          <button
            onClick={() => setActiveStep(4)}
            className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
              activeStep === 4 ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-black/30 border-white/5 hover:border-white/15'
            }`}
          >
            <span className="text-[10px] font-mono font-black text-cyan-400 block">STEP 04</span>
            <span className="text-xs font-bold text-white block truncate">Clean Swaps</span>
          </button>
        </div>

      </div>
    </div>
  );
}
