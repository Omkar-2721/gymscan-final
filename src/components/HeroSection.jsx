import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, ShieldCheck, Zap, Award, ArrowRight, GitCompare, FileText, Share2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TRANSLATIONS } from '../data/translations';

const TRANSPARENT_WHEY_IMG = "/whey-protein-transparent.png";

export default function HeroSection({ onOpenScanner, onOpenCompare, onOpenPitch, currentLang }) {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const [toastMsg, setToastMsg] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [displayedScore, setDisplayedScore] = useState(0);

  // Automatic synchronized animation cycle (6 seconds total, 1.5s per step)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev % 4) + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Animate score counter when step 3 or 4 is active
  useEffect(() => {
    if (activeStep >= 3) {
      let start = 0;
      const target = 32;
      const stepTimer = setInterval(() => {
        start += 2;
        if (start >= target) {
          setDisplayedScore(target);
          clearInterval(stepTimer);
        } else {
          setDisplayedScore(start);
        }
      }, 30);
      return () => clearInterval(stepTimer);
    } else {
      setDisplayedScore(0);
    }
  }, [activeStep]);

  const handleExpose = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E11D48', '#FDA4AF', '#F59E0B', '#10B981', '#FFFFFF']
      });
    } catch (e) {}
    setToastMsg("🚨 Lab Scorecard Generated: 'Anabolic GH Whey flagged for 41.7% true protein & +6g Glycine spiking!'");
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <section className="relative pt-24 pb-16 md:pt-36 md:pb-28 overflow-hidden min-h-[90vh] flex flex-col items-center justify-center font-josefin">
      
      {/* Ambient Maroon & Emerald Mesh Glow */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 h-[450px] sm:h-[650px] w-[450px] sm:w-[650px] rounded-full bg-rose-600/15 dark:bg-rose-900/25 blur-[140px] sm:blur-[180px]"></div>
        <div className="absolute top-1/3 left-1/4 h-[350px] sm:h-[500px] w-[350px] sm:w-[500px] rounded-full bg-maroon-800/20 dark:bg-maroon-900/30 blur-[140px] sm:blur-[170px]"></div>
        <div className="absolute bottom-10 right-1/4 h-[300px] sm:h-[450px] w-[300px] sm:w-[450px] rounded-full bg-amber-600/10 dark:bg-amber-950/20 blur-[130px] sm:blur-[160px]"></div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 glass-island border border-rose-500/50 px-4 sm:px-5 py-3 rounded-2xl text-rose-100 text-xs sm:text-sm font-bold flex items-center gap-3 animate-bounce shadow-2xl max-w-[90vw]">
          <Zap className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP CENTERED CLEAN HEADER (ScanSafe Style) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center relative z-10">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-300 mb-6 shadow-xl">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>Introducing Next-Gen AI Supplement Scanning</span>
        </div>

        {/* Master Headline */}
        <h1 className="max-w-5xl text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-maroon-950 dark:text-white leading-[1.08] mb-6">
          Don't Guess. <br />
          <span className="text-gradient-maroon">Know Exactly</span> <br />
          What Builds Your Body.
        </h1>

        {/* Focused Subtext */}
        <p className="max-w-2xl text-sm sm:text-lg text-slate-600 dark:text-rose-100/80 leading-relaxed font-sans font-medium mb-8">
          Scan supplement labels instantly to decode amino spiking, expose hidden maltodextrin fillers, and verify clinical purity with superhuman AI vision.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button 
            onClick={onOpenScanner}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white px-8 py-4 font-black text-sm sm:text-base uppercase tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_35px_rgba(225,29,72,0.4)] cursor-pointer"
          >
            <Camera className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span>Start Scanning Free</span>
          </button>

          <button 
            onClick={onOpenCompare}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl border border-rose-500/30 bg-black/5 dark:bg-zinc-900/60 hover:bg-rose-500/10 text-maroon-950 dark:text-white px-8 py-4 font-bold text-sm sm:text-base transition-all duration-300 backdrop-blur-md cursor-pointer"
          >
            <GitCompare className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
            <span>Compare 2 Products</span>
          </button>
        </div>

      </div>

      {/* 2. SEAMLESS MERGED AR LIVE SCANNING STAGE (No Static Outlines or Chunky Borders) */}
      <div className="mt-14 sm:mt-20 w-full max-w-6xl mx-auto px-4 sm:px-6 relative z-20">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* LEFT HALF: Organic Floating 3D Jar Scanner with Real-Time HUD */}
          <div className="lg:col-span-6 flex justify-center">
            
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] flex flex-col items-center justify-center">
              
              {/* Glowing Ambient Underglow */}
              <div className="absolute inset-0 m-auto w-64 sm:w-80 h-64 sm:h-80 bg-rose-600/20 rounded-full blur-[80px] pointer-events-none"></div>

              {/* Status Pill on Top */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-rose-500/30 backdrop-blur-xl shadow-lg mb-4 text-[11px] font-mono font-bold text-rose-400">
                <span className={`w-2 h-2 rounded-full ${activeStep === 1 ? 'bg-amber-400 animate-ping' : activeStep >= 2 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                <span>
                  {activeStep === 1 && "● SCANNING LABEL OCR..."}
                  {activeStep === 2 && "● 4 BIOMARKERS DETECTED"}
                  {activeStep === 3 && "● PURITY SCORE COMPUTED"}
                  {activeStep === 4 && "● READY FOR SHOWDOWN"}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400">99.4%</span>
              </div>

              {/* Center 3D Floating Whey Jar */}
              <div className="relative w-full h-[320px] sm:h-[380px] flex items-center justify-center overflow-visible">
                
                {/* 4 Minimalist AR Corner Target Brackets */}
                <div className={`absolute top-2 left-6 sm:left-10 w-6 h-6 border-t-2 border-l-2 transition-all duration-300 ${activeStep >= 2 ? 'border-rose-500 shadow-[0_0_12px_#E11D48]' : 'border-rose-500/30'}`}></div>
                <div className={`absolute top-2 right-6 sm:right-10 w-6 h-6 border-t-2 border-r-2 transition-all duration-300 ${activeStep >= 2 ? 'border-rose-500 shadow-[0_0_12px_#E11D48]' : 'border-rose-500/30'}`}></div>
                <div className={`absolute bottom-2 left-6 sm:left-10 w-6 h-6 border-b-2 border-l-2 transition-all duration-300 ${activeStep >= 2 ? 'border-rose-500 shadow-[0_0_12px_#E11D48]' : 'border-rose-500/30'}`}></div>
                <div className={`absolute bottom-2 right-6 sm:right-10 w-6 h-6 border-b-2 border-r-2 transition-all duration-300 ${activeStep >= 2 ? 'border-rose-500 shadow-[0_0_12px_#E11D48]' : 'border-rose-500/30'}`}></div>

                {/* 3D Whey Tub PNG */}
                <img 
                  src={TRANSPARENT_WHEY_IMG} 
                  alt="Scanned Supplement Jar" 
                  className="w-56 sm:w-64 h-auto object-contain filter drop-shadow-[0_20px_40px_rgba(225,29,72,0.5)] animate-revolve-tub select-none pointer-events-none"
                />

                {/* Vertical Laser Beam Sweep */}
                <div className="absolute left-4 right-4 h-[2.5px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_25px_#E11D48] animate-laser-sweep pointer-events-none z-30">
                  <span className="absolute right-4 -top-2.5 px-1.5 py-0.5 rounded bg-rose-600 text-[8px] font-mono font-black text-white uppercase shadow-md">
                    AI OCR
                  </span>
                </div>

                {/* AR INGREDIENT DETECTION VALUES (POPPING UP SEQUENTIALLY) */}
                {/* Tag 1: Whey Isolate */}
                <div className={`absolute left-0 top-6 z-30 pointer-events-none transition-all duration-500 transform ${
                  activeStep >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 -translate-y-2'
                }`}>
                  <div className="px-3 py-1.5 rounded-xl bg-black/85 border border-emerald-500/80 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Whey Isolate (90%)</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-black text-[8px] font-black uppercase">SAFE</span>
                  </div>
                </div>

                {/* Tag 2: Glycine Spiking */}
                <div className={`absolute right-0 top-14 z-30 pointer-events-none transition-all duration-500 delay-100 transform ${
                  activeStep >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 -translate-y-2'
                }`}>
                  <div className="px-3 py-1.5 rounded-xl bg-black/90 border border-rose-500 text-rose-200 font-mono text-[10px] font-bold flex items-center gap-2 shadow-[0_0_25px_rgba(225,29,72,0.45)] backdrop-blur-xl animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Glycine Spiking +6g</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[8px] font-black uppercase">AVOID</span>
                  </div>
                </div>

                {/* Tag 3: Maltodextrin Filler */}
                <div className={`absolute left-0 bottom-10 z-30 pointer-events-none transition-all duration-500 delay-200 transform ${
                  activeStep >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-2'
                }`}>
                  <div className="px-3 py-1.5 rounded-xl bg-black/85 border border-rose-500/80 text-rose-300 font-mono text-[10px] font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.35)] backdrop-blur-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Maltodextrin 10g</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[8px] font-black uppercase">AVOID</span>
                  </div>
                </div>

                {/* Tag 4: Sucralose Sweetener */}
                <div className={`absolute right-0 bottom-4 z-30 pointer-events-none transition-all duration-500 delay-300 transform ${
                  activeStep >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-2'
                }`}>
                  <div className="px-3 py-1.5 rounded-xl bg-black/85 border border-amber-500/80 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] backdrop-blur-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>Sucralose Sweetener</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black text-[8px] font-black uppercase">CAUTION</span>
                  </div>
                </div>

              </div>

              {/* Bottom Purity Score & Expose Strip (Merged Organically) */}
              <div className="w-full max-w-[340px] mt-2 space-y-2 p-3 rounded-2xl bg-black/40 border border-rose-500/20 backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">LAB PURITY SCORE</span>
                  <span className="font-black text-rose-400">
                    {displayedScore} / 100 {displayedScore > 0 && <span className="text-[9px] px-1.5 py-0.2 bg-rose-500/20 text-rose-400 rounded uppercase ml-1 animate-pulse">SPIKED</span>}
                  </span>
                </div>

                {/* Animated Progress Track */}
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 rounded-full shadow-[0_0_10px_#E11D48] transition-all duration-300"
                    style={{ width: `${displayedScore}%` }}
                  ></div>
                </div>

                {/* Expose Button */}
                <button 
                  onClick={handleExpose}
                  className={`w-full py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-mono text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg hover:opacity-95 active:scale-95 transition cursor-pointer ${
                    activeStep === 4 ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-black animate-pulse' : ''
                  }`}
                >
                  <Share2 className="w-3 h-3" />
                  <span>Expose on Social Media</span>
                </button>
              </div>

            </div>

          </div>

          {/* RIGHT HALF: Merged 4-Step Walkthrough (Clean, Non-Clumsy, Fluid Flow) */}
          <div className="lg:col-span-6 space-y-3.5 text-left font-sans">
            
            {/* Step 01 */}
            <div 
              onClick={() => setActiveStep(1)}
              className={`p-4 sm:p-5 rounded-2xl transition-all duration-500 flex items-start gap-4 cursor-pointer group ${
                activeStep === 1 
                  ? 'bg-rose-500/10 border border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.2)] translate-x-1' 
                  : 'bg-transparent border border-white/5 opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 transition-all duration-500 ${
                activeStep === 1 
                  ? 'bg-rose-500 text-white shadow-[0_0_15px_#E11D48] scale-110' 
                  : 'bg-white/5 border border-rose-500/20 text-rose-400 group-hover:scale-110'
              }`}>
                01
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-maroon-950 dark:text-white mb-1 flex items-center gap-2">
                  <span>Snap Any Supplement Label</span>
                  {activeStep === 1 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-rose-100/70 leading-relaxed font-normal">
                  No barcode needed. Blurry photo, curved tub, or crinkled protein bar wrapper — our WebAssembly Vision AI reads it all.
                </p>
              </div>
            </div>

            {/* Step 02 */}
            <div 
              onClick={() => setActiveStep(2)}
              className={`p-4 sm:p-5 rounded-2xl transition-all duration-500 flex items-start gap-4 cursor-pointer group ${
                activeStep === 2 
                  ? 'bg-rose-500/10 border border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.2)] translate-x-1' 
                  : 'bg-transparent border border-white/5 opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 transition-all duration-500 ${
                activeStep === 2 
                  ? 'bg-rose-500 text-white shadow-[0_0_15px_#E11D48] scale-110' 
                  : 'bg-white/5 border border-rose-500/20 text-rose-400 group-hover:scale-110'
              }`}>
                02
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-maroon-950 dark:text-white mb-1 flex items-center gap-2">
                  <span>AI Flags Every Risk Instantly</span>
                  {activeStep === 2 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-rose-100/70 leading-relaxed font-normal">
                  AR bounding boxes lock onto chemical adulteration in milliseconds. Red = Avoid, Yellow = Caution, Green = Safe.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px] border border-rose-500/40">
                    🔴 AMINO SPIKE
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/40">
                    ⚠️ HEAVY FILLER
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/40">
                    🟢 PURE WHEY
                  </span>
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div 
              onClick={() => setActiveStep(3)}
              className={`p-4 sm:p-5 rounded-2xl transition-all duration-500 flex items-start gap-4 cursor-pointer group ${
                activeStep === 3 
                  ? 'bg-rose-500/10 border border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.2)] translate-x-1' 
                  : 'bg-transparent border border-white/5 opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 transition-all duration-500 ${
                activeStep === 3 
                  ? 'bg-rose-500 text-white shadow-[0_0_15px_#E11D48] scale-110' 
                  : 'bg-white/5 border border-rose-500/20 text-rose-400 group-hover:scale-110'
              }`}>
                03
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-maroon-950 dark:text-white mb-1 flex items-center gap-2">
                  <span>Get Your Molecular Purity Score</span>
                  {activeStep === 3 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-rose-100/70 leading-relaxed font-normal">
                  True intact protein ratio + heavy metal and banned stimulant compliance score (0–100) personalized to your fitness goals.
                </p>
              </div>
            </div>

            {/* Step 04 */}
            <div 
              onClick={() => setActiveStep(4)}
              className={`p-4 sm:p-5 rounded-2xl transition-all duration-500 flex items-start gap-4 cursor-pointer group ${
                activeStep === 4 
                  ? 'bg-rose-500/10 border border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.2)] translate-x-1' 
                  : 'bg-transparent border border-white/5 opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 transition-all duration-500 ${
                activeStep === 4 
                  ? 'bg-rose-500 text-white shadow-[0_0_15px_#E11D48] scale-110' 
                  : 'bg-white/5 border border-rose-500/20 text-rose-400 group-hover:scale-110'
              }`}>
                04
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-maroon-950 dark:text-white mb-1 flex items-center gap-2">
                  <span>Dual-Product Showdown Mode</span>
                  {activeStep === 4 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-rose-100/70 leading-relaxed font-normal">
                  Put two tubs side-by-side to scientifically pick the superior choice before you spend your hard-earned money.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
