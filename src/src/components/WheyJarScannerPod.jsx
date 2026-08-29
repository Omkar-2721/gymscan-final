import React, { useState, useEffect } from 'react';
import { Sparkles, Share2, Activity, Zap, ShieldAlert, CheckCircle2, AlertTriangle, Eye, EyeOff, Dumbbell, Layers, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';

const USER_WHEY_IMAGE = "https://5.imimg.com/data5/SELLER/Default/2025/7/526600871/NZ/EP/UQ/192709944/ar-anabolic-gh-whey-protein-500x500.webp";

export default function WheyJarScannerPod({ onLaunchScanner }) {
  const [activeProduct, setActiveProduct] = useState(SAMPLE_PRODUCTS[0]);
  const [isXray, setIsXray] = useState(false);
  const [hudStatus, setHudStatus] = useState("● SCANNING NITROGEN RATIO...");
  const [scoreCount, setScoreCount] = useState(32);
  const [toastMsg, setToastMsg] = useState(null);

  // Dynamic HUD status cycler
  useEffect(() => {
    const statuses = [
      "● INITIALIZING LAB OPTICS...",
      "● READING INGREDIENT MICROPRINT...",
      "● DE-MASKING PROPRIETARY MATRIX...",
      `● ${activeProduct.flags.aminoSpiking ? "CRITICAL HAZARD: AMINO SPIKING DETECTED" : "VERIFIED: 100% CLEAN INTACT PROTEIN"}`
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setHudStatus(statuses[i]);
    }, 2800);
    return () => clearInterval(interval);
  }, [activeProduct]);

  // Animate score counter whenever active product changes
  useEffect(() => {
    let start = 0;
    const target = activeProduct.purityScore;
    const duration = 800;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = target / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setScoreCount(target);
        clearInterval(timer);
      } else {
        setScoreCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [activeProduct]);

  const handleProductChange = (prod) => {
    setActiveProduct(prod);
  };

  const handleExpose = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#E11D48', '#FDA4AF', '#F59E0B', '#FFFFFF']
      });
    } catch (e) {}
    setToastMsg(`🚨 Lab Scorecard Generated for "${activeProduct.name}" (Score: ${activeProduct.purityScore}/100)`);
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
      <div className="glass-hud rounded-3xl p-5 sm:p-6 border border-rose-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.8)] relative overflow-hidden group hud-corner">
        
        {/* Top Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-rose-500/20 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 font-black tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="truncate max-w-[200px] sm:max-w-none">{hudStatus}</span>
          </div>

          {/* Interactive X-Ray Toggle */}
          <button
            onClick={() => setIsXray(!isXray)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border cursor-pointer ${
              isXray
                ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.6)]'
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            {isXray ? <Eye className="w-3 h-3 text-white animate-pulse" /> : <EyeOff className="w-3 h-3" />}
            <span>{isXray ? "BIO X-RAY ON" : "TOGGLE X-RAY"}</span>
          </button>
        </div>

        {/* 3D Visual Viewfinder Stage */}
        <div className="relative rounded-2xl bg-[#120407] dark:bg-[#0E0306] border border-rose-500/25 p-4 sm:p-5 overflow-hidden min-h-[380px] flex flex-col justify-between perspective-stage">
          
          {/* Background Ambient Grid & Radial Scanner Glow */}
          <div className="absolute inset-0 bg-tactical-grid opacity-25 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-rose-600/15 blur-[80px] pointer-events-none"></div>

          {/* Real-time Laser Sweep Line */}
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#E11D48] animate-laser-sweep pointer-events-none z-30"></div>

          {/* CENTER: Real Image of Whey Protein Jar with 3D Revolving Animation & AR Targets */}
          <div className="relative z-10 my-auto py-2 flex flex-col items-center justify-center">
            
            <div className="relative flex items-center justify-center animate-revolve-tub transform-gpu group-hover:[animation-play-state:paused]">
              
              {/* Actual Whey Protein Tub Image from User */}
              <div className="relative w-52 sm:w-64 aspect-square flex items-center justify-center">
                
                {/* Under-glow spotlight */}
                <div className="absolute -bottom-4 w-40 h-8 bg-rose-600/40 rounded-full blur-xl pointer-events-none"></div>

                <img 
                  src={USER_WHEY_IMAGE} 
                  alt="Anabolic Whey Protein Jar"
                  className={`w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(225,29,72,0.4)] transition-all duration-700 select-none pointer-events-none ${
                    isXray 
                      ? 'hue-rotate-180 invert brightness-125 contrast-150 drop-shadow-[0_0_35px_rgba(225,29,72,0.8)]' 
                      : 'hover:scale-105'
                  }`} 
                />

                {/* AR Dynamic Bounding Targets (Overlaying the Real Whey Jar in 3D Space) */}
                <div className="absolute -right-2 sm:-right-6 top-4 space-y-2 z-20 pointer-events-none">
                  {activeProduct.riskLevel === 'danger' ? (
                    <>
                      <div className="glass-island px-2.5 py-1 rounded-xl border border-rose-500/60 text-rose-200 text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>L-GLYCINE: +6.2g SPIKE</span>
                      </div>
                      <div className="glass-island px-2.5 py-1 rounded-xl border border-rose-500/60 text-rose-200 text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>MALTODEXTRIN: 10g SUGAR</span>
                      </div>
                      <div className="glass-island px-2.5 py-1 rounded-xl border border-amber-500/60 text-amber-200 text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>SUCRALOSE: HIGH GI</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="glass-island px-2.5 py-1 rounded-xl border border-emerald-500/60 text-emerald-200 text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>100% MICROFILTERED ISOLATE</span>
                      </div>
                      <div className="glass-island px-2.5 py-1 rounded-xl border border-emerald-500/60 text-emerald-200 text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>0g ADDED AMINO FILLERS</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Left Side Active Diagnostic Beacon */}
                <div className="absolute -left-2 sm:-left-6 bottom-6 z-20 pointer-events-none">
                  <div className="glass-island px-2.5 py-1 rounded-xl border border-rose-500/50 text-white text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                    <span>ACTIVE PROTEIN: {activeProduct.flags.trueProteinRatio}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Bottom Live Score Dial & Action */}
          <div className="relative z-20 pt-3 border-t border-rose-500/20 mt-2 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-syne">
                BIOCHEMICAL PURITY SCORE
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-black font-mono ${
                  scoreCount > 80 ? 'text-emerald-400' : 'text-rose-500'
                }`}>
                  {scoreCount}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ml-1.5 ${
                  scoreCount > 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {scoreCount > 80 ? 'LAB VERIFIED' : 'HEAVY ADULTERATION'}
                </span>
              </div>
            </div>

            <button
              onClick={handleExpose}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition shadow-[0_0_20px_rgba(225,29,72,0.4)] cursor-pointer shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Expose Brand</span>
            </button>
          </div>

        </div>

        {/* Quick Tub Preset Switcher beneath the HUD */}
        <div className="mt-4 pt-3 border-t border-rose-500/15">
          <span className="text-[10px] font-bold font-syne text-slate-500 dark:text-rose-300/70 block mb-2 uppercase tracking-wider">
            Switch Test Product in 3D Viewport:
          </span>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SAMPLE_PRODUCTS.map((prod) => (
              <button
                key={prod.id}
                onClick={() => handleProductChange(prod)}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  activeProduct.id === prod.id
                    ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.3)] scale-[1.02]'
                    : 'bg-black/30 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-rose-400 truncate max-w-[80px]">
                    {prod.category}
                  </span>
                  <span className={`text-[8px] font-black px-1 rounded uppercase ${
                    prod.riskLevel === 'danger' ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/30 text-emerald-300'
                  }`}>
                    {prod.purityScore}
                  </span>
                </div>
                <span className="text-xs font-bold text-white block truncate mt-0.5">
                  {prod.name}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
