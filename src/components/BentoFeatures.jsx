import React from 'react';
import { Camera, ShieldCheck, Sparkles, AlertOctagon, HeartPulse, Zap, Award, CheckCircle2, ChevronRight, Cpu, Microscope } from 'lucide-react';

export default function BentoFeatures({ onOpenScanner }) {
  return (
    <section className="py-20 md:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 dark:bg-black/60 px-3.5 py-1 text-xs font-mono font-bold text-rose-600 dark:text-rose-300 border border-rose-500/30 mb-3">
              <Cpu className="w-3.5 h-3.5 text-rose-500" />
              <span>PROPRIETARY BIOCHEMICAL ENGINE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-syne tracking-tight text-maroon-950 dark:text-white">
              Tactical Lab Architecture.<br />
              <span className="text-rose-700/60 dark:text-rose-300/40">Unmasking the Supplement Industry.</span>
            </h2>
          </div>
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400 hover:opacity-80 uppercase tracking-wider py-2 group cursor-pointer self-start md:self-auto"
          >
            <span>Launch Live Test Suite</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Tactical Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Card 1: Instant AI Vision Extraction (7 Columns) */}
          <div className="md:col-span-7 rounded-3xl glass-card-neo p-8 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.2)]">
                <Microscope className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30">
                0.85s OCR LATENCY
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-black font-syne text-maroon-950 dark:text-white mb-2">Instant OCR Label Microprint Extraction</h3>
              <p className="text-slate-600 dark:text-rose-100/70 text-sm leading-relaxed max-w-lg mb-6">
                No barcodes required. Curved tubs, crinkled sachets, and foil pouches are deciphered in milliseconds with our specialized fitness toxicological database.
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold text-slate-700 dark:text-rose-200">
                <span className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-black/50 border border-black/5 dark:border-white/10">350+ WPC GRADES</span>
                <span className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-black/50 border border-black/5 dark:border-white/10">PROPRIETARY DE-MASK</span>
                <span className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-black/50 border border-black/5 dark:border-white/10">MICROPRINT OCR</span>
              </div>
            </div>
          </div>

          {/* Card 2: WADA & Banned Substance Screener (5 Columns) */}
          <div className="md:col-span-5 rounded-3xl glass-card-neo p-8 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                WADA / FDA AUDIT
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black font-syne text-maroon-950 dark:text-white mb-2">Banned Stimulant Screener</h3>
              <p className="text-slate-600 dark:text-rose-100/70 text-xs sm:text-sm leading-relaxed mb-4">
                Instantly detects DMAA, DMHA, Synephrine, Ephedra analogues, and hidden prohibited alkaloids in pre-workouts.
              </p>
              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Compliant with Competitive Drug Tests</span>
              </div>
            </div>
          </div>

          {/* Card 3: Personalized Lifter Profiles (5 Columns) */}
          <div className="md:col-span-5 rounded-3xl glass-card-neo p-8 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30">
                <HeartPulse className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                TAILORED GAINS
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black font-syne text-maroon-950 dark:text-white mb-2">Personalized Lifter Profiles</h3>
              <p className="text-slate-600 dark:text-rose-100/70 text-xs sm:text-sm leading-relaxed">
                Filter by Clean Bulking (low sugar), Cutting (zero maltodextrin), Vegan Athlete, Lactose-Free, or Liver/Kidney Health.
              </p>
            </div>
          </div>

          {/* Card 4: Cumulative Heavy Metal & Sweetener Tracker (7 Columns) */}
          <div className="md:col-span-7 rounded-3xl glass-card-neo p-8 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/30">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30">
                NEURAL MONITOR // COMING SOON
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-black font-syne text-maroon-950 dark:text-white mb-2">Cumulative Toxic Load Engine</h3>
              <p className="text-slate-600 dark:text-rose-100/70 text-sm leading-relaxed max-w-lg">
                Track your multi-supplement daily load of Sucralose, Acesulfame-K, and residual heavy metals across your protein, creatine, and pre-workout stack before gut microbiome damage occurs.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
