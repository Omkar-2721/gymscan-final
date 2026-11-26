import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, GitCompare, Database, ShieldCheck } from 'lucide-react';
import { TRANSLATIONS } from '../data/translations';

const TRANSPARENT_WHEY_IMG = '/whey-protein-transparent.png';

export default function HeroSection({ onOpenScanner, onOpenDatabase, onOpenCompare, currentLang }) {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev % 4) + 1);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      num: '01',
      title: t.snapStep1Title || 'Scan Supplement Label',
      desc: 'Upload a photo (with manual crop), use live camera voting, scan barcode, or paste ingredients directly.',
    },
    {
      num: '02',
      title: t.snapStep2Title || 'Flag Risky & Banned Compounds',
      desc: 'Matches 430+ ingredients for amino spiking (Glycine, Taurine), maltodextrin fillers, synthetic dyes, and WADA substances.',
      tags: [
        { label: 'BANNED / WADA', cls: 'bg-red-500/15 text-red-400 border-red-500/40' },
        { label: 'HARMFUL', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/40' },
        { label: 'CLEAN / SAFE', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
      ],
    },
    {
      num: '03',
      title: t.snapStep3Title || 'Purity Score & Point Breakdown',
      desc: 'Honest 0-100 score powered by Python ML & safety rules with exact point penalties and macro Nutrition Facts table.',
    },
    {
      num: '04',
      title: t.snapStep4Title || 'Export Clinical PDF & Compare',
      desc: 'Download a printable Clinical Audit PDF report, compare two products side-by-side, and find cleaner swaps.',
    },
  ];

  return (
    <section className="relative pt-24 pb-14 md:pt-32 md:pb-20 overflow-hidden font-josefin">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Clean Centered Header */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-mono font-bold text-rose-600 dark:text-rose-300 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Evidence-First Supplement Purity & WADA Safety Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-maroon-950 dark:text-white leading-[1.08] mb-5">
            {t.heroTitle1 || "Don't Drink Chalk."}{' '}
            <span className="text-gradient-maroon">{t.heroTitle2 || 'Know Exactly'}</span>{' '}
            {t.heroTitle3 || 'What Builds Your Body.'}
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-rose-100/80 leading-relaxed font-sans mb-7">
            {t.heroSubtitle ||
              'Scan whey protein, creatine, pre-workout, and mass gainer labels to detect amino spiking, hidden fillers, and WADA-prohibited substances.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-sans">
            <button
              onClick={onOpenScanner}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white px-7 py-3.5 font-black text-sm uppercase tracking-wider hover:opacity-95 transition shadow-lg cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{t.startScan || 'Start Scanning Free'}</span>
            </button>

            <button
              onClick={onOpenDatabase}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-6 py-3.5 font-bold text-sm transition cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Browse 16+ Audited Products</span>
            </button>

            <button
              onClick={onOpenCompare}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/25 bg-black/5 dark:bg-white/5 hover:bg-rose-500/10 text-maroon-950 dark:text-white px-6 py-3.5 font-bold text-sm transition cursor-pointer"
            >
              <GitCompare className="w-4 h-4 text-rose-500" />
              <span>Compare Products</span>
            </button>
          </div>
        </div>

        {/* Clean 2-Column Preview & Workflow Showcase */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Clean Product & Score Preview Card (No cluttered blurry overlays) */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-3xl glass-hud border border-rose-500/25 flex flex-col items-center text-center space-y-4">
              <div className="w-full flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-rose-200/75">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  LIVE AUDIT PREVIEW
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">90%+ PROTEIN</span>
              </div>

              <img
                src={TRANSPARENT_WHEY_IMG}
                alt="GymScan Supplement Preview"
                loading="eager"
                className="w-44 sm:w-48 h-auto object-contain select-none pointer-events-none"
              />

              <div className="w-full p-3.5 rounded-2xl bg-black/5 dark:bg-black/45 border border-rose-500/20 text-left space-y-2 font-sans">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-rose-500 font-bold block">SAMPLE COMPARISON</span>
                    <span className="text-xs font-black text-maroon-950 dark:text-white">Spiked Whey vs Pure Isolate</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white">20/100</span>
                    <span className="text-slate-400">vs</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-black">89/100</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-rose-100/75">
                  Automatically separates clean isolates from amino-spiked or WADA-flagged blends with exact ingredient reasons.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Crisp 4-Step Interactive Flow */}
          <div className="lg:col-span-7 space-y-3 text-left font-sans">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx + 1;
              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStep(idx + 1)}
                  className={`p-4 rounded-2xl border transition-colors duration-200 flex items-start gap-3.5 cursor-pointer ${
                    isActive
                      ? 'bg-rose-500/10 border-rose-500/60 shadow-sm'
                      : 'glass-card-neo border-rose-500/15 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                      isActive
                        ? 'bg-rose-600 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-rose-500'
                    }`}
                  >
                    {step.num}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-maroon-950 dark:text-white mb-0.5">
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-rose-100/75 leading-relaxed">
                      {step.desc}
                    </p>
                    {step.tags && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {step.tags.map((tag) => (
                          <span key={tag.label} className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${tag.cls}`}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
