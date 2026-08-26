import React, { useState } from 'react';
import { FileText, X, ChevronRight, ChevronLeft } from 'lucide-react';

export default function PitchDeckModal({ isOpen, onClose }) {
  const [slide, setSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      badge: "PROBLEM",
      title: "The $30 Billion Tainted Supplement Epidemic",
      desc: "Up to 70% of fitness supplements sold online contain undisclosed amino spiking (Glycine/Taurine), cheap maltodextrin fillers, or banned WADA stimulants that cause severe cardiovascular stress and wasted consumer money.",
      stats: [
        { label: "Spiked Whey Rate", value: "68%" },
        { label: "Deceptive Label Blends", value: "84%" },
        { label: "Annual Supplement Spend", value: "$32B+" }
      ]
    },
    {
      badge: "SOLUTION",
      title: "Superhuman AI Optical Vision & Biochemical Audit",
      desc: "GymScan extracts curved, micro-printed supplement labels in milliseconds without needing barcodes. Our neural engine checks nitrogen ratios, flags non-intact filler aminos, screens WADA prohibited stims, and delivers instant lab purity scores.",
      stats: [
        { label: "Scan Latency", value: "< 850ms" },
        { label: "Detection Accuracy", value: "99.4%" },
        { label: "Toxin Database Entries", value: "12,000+" }
      ]
    },
    {
      badge: "BUSINESS MODEL",
      title: "High-Margin B2C Subscriptions & Affiliate Commerce",
      desc: "GymScan monetizes via $4.99/mo Pro Athlete subscriptions, certified clean brand marketplace affiliate commissions (8-15%), and Coach/Gym enterprise licensing.",
      stats: [
        { label: "Customer LTV", value: "$94" },
        { label: "Affiliate GMV Take-Rate", value: "12%" },
        { label: "Target TAM", value: "$4.8B" }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-hud rounded-3xl p-6 sm:p-10 my-8 border border-rose-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-syne text-maroon-950 dark:text-white">GymScan Investor & Lab Deck</h2>
            <p className="text-xs text-slate-500 dark:text-rose-300/70">Slide {slide + 1} of {slides.length}</p>
          </div>
        </div>

        <div className="p-8 rounded-3xl glass-card-neo border border-rose-500/20 min-h-[300px] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/40 uppercase inline-block mb-4">
              {slides[slide].badge}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black font-syne text-maroon-950 dark:text-white mb-3">
              {slides[slide].title}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-rose-100/90 leading-relaxed max-w-2xl">
              {slides[slide].desc}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-rose-500/15 mt-6">
            {slides[slide].stats.map((s, idx) => (
              <div key={idx} className="text-center p-3 rounded-2xl bg-black/5 dark:bg-black/40 border border-rose-500/10">
                <span className="text-2xl sm:text-3xl font-black text-rose-500 font-mono block">
                  {s.value}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-rose-300/70 uppercase mt-1 block">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setSlide(Math.max(0, slide - 1))}
            disabled={slide === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card-neo text-xs font-bold text-slate-700 dark:text-rose-200 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex gap-2">
            {slides.map((_, i) => (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  slide === i ? 'w-8 bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              ></div>
            ))}
          </div>

          <button
            onClick={() => setSlide(Math.min(slides.length - 1, slide + 1))}
            disabled={slide === slides.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-black uppercase disabled:opacity-30 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
