import React from 'react';

export default function Footer({ onOpenPitch, onOpenPricing, onOpenScanner }) {
  return (
    <footer className="py-12 border-t border-rose-500/15 glass-island text-center text-slate-500 dark:text-rose-200/60 text-xs font-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Brand with Official GymScan Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white p-[1px] shadow-[0_0_15px_rgba(225,29,72,0.3)] overflow-hidden flex items-center justify-center border border-rose-500/30">
            <img src="/logo.png" alt="GymScan Logo" className="w-full h-full object-contain" />
          </div>
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
          © 2026 GymScan Technologies. SCAN • TRACK • TRANSFORM. Built to protect your gains.
        </p>

      </div>
    </footer>
  );
}
