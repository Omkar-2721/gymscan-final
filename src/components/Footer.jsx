import React from 'react';
import { Dumbbell } from 'lucide-react';

export default function Footer({ onOpenPitch, onOpenPricing, onOpenScanner }) {
  return (
    <footer className="py-12 border-t border-rose-500/15 glass-island text-center text-slate-500 dark:text-rose-200/60 text-xs font-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Brand */}
        <div className="flex items-center justify-center gap-2">
          <Dumbbell className="w-5 h-5 text-rose-500" />
          <span className="text-base font-black font-syne tracking-tight text-maroon-950 dark:text-white">
            GYM<span className="text-rose-500">SCAN</span>
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6 text-slate-600 dark:text-rose-200/80">
          <button onClick={onOpenScanner} className="hover:text-rose-500 transition-colors cursor-pointer">Live Scanner</button>
          <button onClick={onOpenPricing} className="hover:text-rose-500 transition-colors cursor-pointer">Pricing</button>
          <button onClick={onOpenPitch} className="hover:text-rose-500 transition-colors cursor-pointer">Pitch Deck</button>
          <a href="#" className="hover:text-rose-500 transition-colors">Lab Methodology</a>
          <a href="#" className="hover:text-rose-500 transition-colors">Privacy</a>
          <a href="#" className="hover:text-rose-500 transition-colors">Terms</a>
          <a href="#" className="hover:text-rose-500 transition-colors">Contact Lab</a>
        </div>

        {/* Disclaimer */}
        <p className="max-w-2xl mx-auto text-[11px] text-slate-500 dark:text-rose-300/50 leading-relaxed">
          Disclaimer: GymScan AI provides educational insights into ingredient labeling, third-party laboratory public records, and WADA guidelines. It does not replace medical advice from certified physicians or sports dietitians.
        </p>

        {/* Copyright */}
        <p className="text-slate-500 dark:text-rose-300/50 text-xs">
          © 2026 GymScan Technologies. Engineered for athletes. Built to protect your gains.
        </p>

      </div>
    </footer>
  );
}
