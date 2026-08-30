import React from 'react';
import { Camera, Sparkles, ShieldCheck, Zap, Award, ArrowRight, Activity, FileText } from 'lucide-react';
import HeroWheyScanner from './HeroWheyScanner';
import { TRANSLATIONS } from '../data/translations';

export default function HeroSection({ onOpenScanner, onOpenPitch, currentLang }) {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  return (
    <section className="relative pt-20 pb-10 md:pt-32 md:pb-24 overflow-hidden min-h-[85vh] flex items-center font-josefin">
      
      {/* Ambient Maroon & Ruby Glow Mesh */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/4 h-[400px] sm:h-[550px] w-[400px] sm:w-[550px] rounded-full bg-rose-900/20 dark:bg-rose-900/30 blur-[140px] sm:blur-[170px]"></div>
        <div className="absolute top-1/3 right-10 h-[380px] sm:h-[500px] w-[380px] sm:w-[500px] rounded-full bg-maroon-800/15 dark:bg-maroon-700/25 blur-[140px] sm:blur-[170px]"></div>
        <div className="absolute -bottom-10 left-1/3 h-[350px] sm:h-[450px] w-[350px] sm:w-[450px] rounded-full bg-amber-900/10 dark:bg-amber-950/20 blur-[130px] sm:blur-[160px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          
          {/* Left Column: Bold Maroon-Ruby Athletic Value Proposition */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6 text-left">
            
            {/* Live System Status Tag */}
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 dark:bg-black/60 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-mono font-bold text-rose-600 dark:text-rose-300 border border-rose-500/30 backdrop-blur-xl shadow-[0_0_20px_rgba(225,29,72,0.15)]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>NEURAL LAB SCANNER V4.2</span>
              <span className="text-rose-900/40 dark:text-slate-600">|</span>
              <span className="text-emerald-600 dark:text-emerald-400">99.4% ACCURACY</span>
            </div>

            {/* Main Headline in Josefin Sans Font */}
            <h1 className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-maroon-950 dark:text-white">
              Don't Drink Chalk. <br />
              <span className="text-gradient-maroon">
                Know Exactly
              </span> <br />
              What Builds Your Body.
            </h1>

            {/* Subhead */}
            <p className="text-xs sm:text-base text-slate-700 dark:text-rose-100/80 leading-relaxed max-w-xl font-sans font-medium">
              Scan fitness & gym supplement labels instantly to unmask proprietary blends, detect amino spiking, flag banned WADA stimulants, and calculate true protein purity in milliseconds.
            </p>

            {/* Hero Quick Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              <button 
                onClick={onOpenScanner}
                className="inline-flex items-center justify-center gap-2.5 sm:gap-3 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white px-6 py-3.5 sm:px-7 sm:py-4 font-black text-xs sm:text-sm uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_35px_rgba(225,29,72,0.4)] cursor-pointer"
              >
                <Camera className="w-4 h-4 text-white" />
                <span>Instant Vision Scanner</span>
              </button>

              <button 
                onClick={onOpenPitch}
                className="inline-flex items-center justify-center gap-2 rounded-full glass-card-neo text-slate-800 dark:text-white px-6 py-3.5 sm:px-7 sm:py-4 font-bold text-xs sm:text-sm hover:border-rose-500/40 transition-all backdrop-blur-xl cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>Clinical & Lab Deck</span>
              </button>
            </div>

            {/* Telemetry Audited Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-rose-500/15 text-xs font-sans">
              <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/5 dark:bg-black/40 border border-rose-500/10">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-rose-300/70 block uppercase">Spike Check</span>
                <span className="font-black text-rose-600 dark:text-rose-300 text-[11px] sm:text-xs">Glycine/Taurine</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/5 dark:bg-black/40 border border-rose-500/10">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-rose-300/70 block uppercase">WADA Screen</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs">DMAA / Stims</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/5 dark:bg-black/40 border border-rose-500/10">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-rose-300/70 block uppercase">Filler Audit</span>
                <span className="font-black text-amber-600 dark:text-amber-300 text-[11px] sm:text-xs">Maltodextrin</span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/5 dark:bg-black/40 border border-rose-500/10">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-rose-300/70 block uppercase">Heavy Metals</span>
                <span className="font-black text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs">Lead & Cadmium</span>
              </div>
            </div>

          </div>

          {/* Right Column: Free-Floating 3D Revolving Whey Jar & Real-time Laser Scan Beam */}
          <div className="lg:col-span-6 flex justify-center items-center">
            <HeroWheyScanner />
          </div>

        </div>
      </div>

    </section>
  );
}
