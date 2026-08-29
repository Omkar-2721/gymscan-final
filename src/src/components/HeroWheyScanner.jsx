import React, { useState } from 'react';
import { Sparkles, Share2, Activity, Zap, ShieldAlert, CheckCircle2, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

const TRANSPARENT_WHEY_IMG = "/whey-protein-transparent.png";

export default function HeroWheyScanner() {
  const [toastMsg, setToastMsg] = useState(null);

  const handleExpose = () => {
    try {
      confetti({
        particleCount: 95,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#E11D48', '#FDA4AF', '#F59E0B', '#FFFFFF']
      });
    } catch (e) {}
    setToastMsg("🚨 Lab Scorecard Generated: 'Anabolic GH Whey flagged for 41.7% actual protein & +6g Glycine spiking!'");
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="relative w-full flex items-center justify-center py-2 sm:py-4 select-none overflow-hidden max-w-full">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 glass-island border border-rose-500/40 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-3 animate-bounce shadow-2xl max-w-[90vw]">
          <Zap className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* Main Free-Floating 3D Revolving Stage */}
      <div className="relative w-full max-w-[480px] h-[440px] xs:h-[480px] sm:h-[530px] md:h-[560px] flex items-center justify-center perspective-stage">
        
        {/* Ambient Underglow Spotlights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 rounded-full bg-rose-600/25 blur-[70px] sm:blur-[95px] pointer-events-none"></div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-8 sm:h-12 bg-rose-500/35 rounded-full blur-xl sm:blur-2xl pointer-events-none"></div>

        {/* Floating Orbital Scanner Rings */}
        <div className="absolute inset-0 m-auto w-[280px] xs:w-[320px] sm:w-[400px] md:w-[440px] h-[280px] xs:h-[320px] sm:h-[400px] md:h-[440px] rounded-full border border-rose-500/25 animate-orbit-ring pointer-events-none border-dashed"></div>
        <div className="absolute inset-0 m-auto w-[230px] xs:w-[270px] sm:w-[330px] md:w-[370px] h-[230px] xs:h-[270px] sm:h-[330px] md:h-[370px] rounded-full border border-rose-400/30 animate-orbit-ring-reverse pointer-events-none"></div>

        {/* Floating 3D Revolving Whey Jar (Responsive Scaling) */}
        <div className="relative z-10 w-60 xs:w-72 sm:w-88 md:w-[360px] lg:w-[400px] h-[340px] xs:h-[400px] sm:h-[460px] md:h-[500px] flex items-center justify-center animate-revolve-tub transform-gpu group cursor-grab active:cursor-grabbing">
          
          {/* Transparent Cutout PNG of Whey Protein */}
          <img 
            src={TRANSPARENT_WHEY_IMG} 
            alt="Anabolic GH Whey Protein"
            className="w-full h-full object-contain filter drop-shadow-[0_15px_35px_rgba(225,29,72,0.45)] dark:drop-shadow-[0_20px_45px_rgba(225,29,72,0.65)] hover:scale-105 transition-all duration-500 pointer-events-none select-none"
          />

          {/* Real-time Laser Scan Beam (Sweeps vertically across the jar) */}
          <div className="absolute left-[-5%] right-[-5%] h-[2.5px] sm:h-[3px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_25px_#E11D48] animate-laser-sweep pointer-events-none z-30">
            <div className="absolute right-2 sm:right-1/4 -top-2 px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-md">
              AI SCANNING
            </div>
          </div>

          {/* Top Floating Status Beacon */}
          <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 glass-island px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full border border-rose-500/40 text-rose-300 font-mono text-[8px] sm:text-[10px] font-bold flex items-center gap-1.5 shadow-2xl whitespace-nowrap max-w-[90%] truncate">
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
            <span className="truncate">AMINO-SPIKING DETECTED // NITROGEN AUDIT</span>
          </div>

        </div>

        {/* 3D Floating AR Bounding Tags */}
        <div className="absolute right-1 sm:-right-4 top-8 sm:top-12 space-y-1.5 sm:space-y-2.5 z-20 pointer-events-none">
          <div className="glass-island px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-rose-500/60 text-rose-200 text-[8px] sm:text-[10px] font-mono font-bold flex items-center gap-1.5 sm:gap-2 shadow-xl animate-pulse">
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-rose-500 shrink-0"></span>
            <span>L-GLYCINE: +6.2g SPIKE</span>
          </div>

          <div className="glass-island px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-rose-500/60 text-rose-200 text-[8px] sm:text-[10px] font-mono font-bold flex items-center gap-1.5 sm:gap-2 shadow-xl">
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-rose-500 shrink-0"></span>
            <span>MALTODEXTRIN: 10g SUGAR</span>
          </div>

          <div className="glass-island px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-amber-500/60 text-amber-200 text-[8px] sm:text-[10px] font-mono font-bold flex items-center gap-1.5 sm:gap-2 shadow-xl">
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span>SUCRALOSE: HIGH GI</span>
          </div>
        </div>

        {/* Left Side Floating Intact Protein Beacon */}
        <div className="absolute left-1 sm:-left-4 bottom-14 sm:bottom-16 z-20 pointer-events-none">
          <div className="glass-island px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-rose-500/50 text-white text-[8px] sm:text-[10px] font-mono font-bold flex items-center gap-1.5 sm:gap-2 shadow-xl">
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-rose-400 animate-ping shrink-0"></span>
            <span>INTACT PROTEIN: 41.7%</span>
          </div>
        </div>

        {/* Floating Holographic Score Dial (Bottom Corner) */}
        <div className="absolute bottom-0 right-1 sm:right-0 z-30 glass-island p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-rose-500/40 shadow-2xl flex items-center gap-2.5 sm:gap-4">
          <div>
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-syne">
              LAB PURITY SCORE
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-rose-500">32</span>
              <span className="text-[10px] sm:text-xs text-slate-400">/ 100</span>
              <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 uppercase ml-1">
                FAIL
              </span>
            </div>
          </div>

          <button
            onClick={handleExpose}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition shadow-lg cursor-pointer shrink-0"
          >
            <Share2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>Expose</span>
          </button>
        </div>

      </div>

    </div>
  );
}
