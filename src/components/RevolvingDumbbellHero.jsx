import React, { useState } from 'react';
import { Dumbbell, Sparkles, Share2, Activity, Zap, ShieldAlert, Crosshair, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RevolvingDumbbellHero({ onLaunchScanner }) {
  const [viewMode, setViewMode] = useState('dumbbell'); // 'dumbbell' | 'scanner'
  const [toastMsg, setToastMsg] = useState(null);

  const handleExpose = () => {
    try {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#E11D48', '#FDA4AF', '#F59E0B', '#FFFFFF']
      });
    } catch (e) {}
    setToastMsg("🚨 Audit Card Generated: 'MegaMass Whey flagged for 41.7% fake amino spiking & 10g Maltodextrin!'");
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="w-full relative">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 glass-island border border-rose-500/40 px-5 py-3 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-3 animate-bounce shadow-2xl">
          <Zap className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Holographic Diagnostic Pod */}
      <div className="glass-hud rounded-3xl p-5 sm:p-6 border border-rose-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.7)] relative overflow-hidden group">
        
        {/* Top Header Controls */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-500/20 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-rose-400 font-black tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>NEURAL VISION HUD // 60 FPS</span>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex items-center bg-black/40 dark:bg-black/60 rounded-full p-0.5 border border-rose-500/20 text-[10px]">
            <button
              onClick={() => setViewMode('dumbbell')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                viewMode === 'dumbbell'
                  ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏋️ 3D Dumbbell
            </button>
            <button
              onClick={() => setViewMode('scanner')}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                viewMode === 'scanner'
                  ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🥛 Product Tub
            </button>
          </div>
        </div>

        {/* 3D Visual Stage */}
        <div className="relative rounded-2xl bg-[#120407] dark:bg-[#0E0306] border border-rose-500/20 p-5 overflow-hidden min-h-[340px] flex flex-col justify-between perspective-stage">
          
          {/* Orbital Neon Ring 1 */}
          <div className="absolute inset-0 m-auto w-[260px] h-[260px] rounded-full border border-rose-500/30 animate-orbit-ring pointer-events-none border-dashed"></div>
          
          {/* Orbital Neon Ring 2 */}
          <div className="absolute inset-0 m-auto w-[210px] h-[210px] rounded-full border border-rose-400/25 animate-orbit-ring-reverse pointer-events-none"></div>

          {/* Laser Scanning Line */}
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#E11D48] animate-scan-beam pointer-events-none z-20"></div>

          {/* MODE 1: 3D Revolving Chrome & Obsidian Dumbbell */}
          {viewMode === 'dumbbell' && (
            <div className="relative z-10 my-auto py-6 flex flex-col items-center justify-center animate-float-slow">
              
              {/* 3D Rotating Dumbbell SVG Object */}
              <div className="revolving-dumbbell-wrap animate-revolve-slow cursor-grab active:cursor-grabbing transform-gpu">
                <svg width="240" height="130" viewBox="0 0 240 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_15px_25px_rgba(225,29,72,0.4)]">
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E2E8F0" />
                      <stop offset="50%" stopColor="#94A3B8" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                    <linearGradient id="plateGrad1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#E11D48" />
                      <stop offset="40%" stopColor="#881337" />
                      <stop offset="100%" stopColor="#1E040A" />
                    </linearGradient>
                    <linearGradient id="plateGrad2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FDA4AF" />
                      <stop offset="50%" stopColor="#BE123C" />
                      <stop offset="100%" stopColor="#3B0713" />
                    </linearGradient>
                  </defs>

                  {/* Center Knurled Chrome Bar */}
                  <rect x="55" y="58" width="130" height="14" rx="4" fill="url(#barGrad)" stroke="#FFFFFF" strokeWidth="1" />
                  
                  {/* Grip Knurling Details */}
                  <line x1="85" y1="58" x2="85" y2="72" stroke="#334155" strokeWidth="1.5" />
                  <line x1="95" y1="58" x2="95" y2="72" stroke="#334155" strokeWidth="1.5" />
                  <line x1="105" y1="58" x2="105" y2="72" stroke="#334155" strokeWidth="1.5" />
                  <line x1="115" y1="58" x2="115" y2="72" stroke="#334155" strokeWidth="1.5" />
                  <line x1="125" y1="58" x2="125" y2="72" stroke="#334155" strokeWidth="1.5" />
                  <line x1="135" y1="58" x2="135" y2="72" stroke="#334155" strokeWidth="1.5" />
                  <line x1="145" y1="58" x2="145" y2="72" stroke="#334155" strokeWidth="1.5" />
                  <line x1="155" y1="58" x2="155" y2="72" stroke="#334155" strokeWidth="1.5" />

                  {/* Left Outer Plate */}
                  <rect x="18" y="20" width="16" height="90" rx="6" fill="url(#plateGrad1)" stroke="#FDA4AF" strokeWidth="1.5" />
                  <rect x="36" y="30" width="14" height="70" rx="5" fill="url(#plateGrad2)" stroke="#E11D48" strokeWidth="1.2" />
                  <rect x="50" y="48" width="6" height="34" rx="2" fill="#E2E8F0" />

                  {/* Right Outer Plate */}
                  <rect x="184" y="48" width="6" height="34" rx="2" fill="#E2E8F0" />
                  <rect x="190" y="30" width="14" height="70" rx="5" fill="url(#plateGrad2)" stroke="#E11D48" strokeWidth="1.2" />
                  <rect x="206" y="20" width="16" height="90" rx="6" fill="url(#plateGrad1)" stroke="#FDA4AF" strokeWidth="1.5" />

                  {/* Laser Branding on Left Plate */}
                  <text x="26" y="68" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="sans-serif" transform="rotate(-90 26 68)">GYMSCAN</text>
                  <text x="200" y="68" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="sans-serif" transform="rotate(90 200 68)">25 KG</text>
                </svg>
              </div>

              {/* Floating Holographic Diagnostic Telemetry */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm">
                  ⚡ 3D BIOCHEMICAL SCAN LOCK
                </span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-black/60 text-slate-300 border border-white/10">
                  ISO-17025 VERIFIED
                </span>
              </div>
            </div>
          )}

          {/* MODE 2: Scanning Supplement Tub Label */}
          {viewMode === 'scanner' && (
            <div className="relative z-10 space-y-2">
              <div className="flex justify-between items-center bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1 border border-white/10">
                <span className="text-[10px] font-mono font-bold text-rose-300">SAMPLE: MEGAMASS GOLD WPC</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">AMINO SPIKED</span>
              </div>

              <p className="text-[10px] text-slate-300 dark:text-slate-400 font-mono leading-tight bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-white font-bold">INGREDIENTS:</span> Whey Protein Concentrate (Low Grade 35%), Maltodextrin (Carb Filler), L-Glycine (Added Nitrogen), L-Taurine, Artificial Flavor, Sucralose (E955), Silicon Dioxide.
              </p>

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
              </div>
            </div>
          )}

          {/* Bottom Live Score Dial & Action */}
          <div className="relative z-10 pt-3 border-t border-rose-500/20 mt-3 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-syne">BIOCHEMICAL PURITY</span>
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition shadow-[0_0_20px_rgba(225,29,72,0.4)] cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Expose Brand</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
