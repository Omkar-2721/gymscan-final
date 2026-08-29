import React, { useState } from 'react';
import { CreditCard, X, CheckCircle2, Zap, Sparkles } from 'lucide-react';

export default function PricingModal({ isOpen, onClose }) {
  const [annual, setAnnual] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-5xl glass-hud rounded-3xl p-6 sm:p-10 my-8 border border-rose-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-500 border border-rose-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>TRANSPARENT PRICING FOR LIFTERS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-syne text-maroon-950 dark:text-white">Invest in Pure Muscle Science</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-rose-200/70 mt-2">
            Stop wasting \$70/month on chalk and fake amino-spiked nitrogen.
          </p>

          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-xs font-bold ${!annual ? 'text-rose-600 dark:text-white' : 'text-slate-400'}`}>Monthly</span>
            <button 
              onClick={() => setAnnual(!annual)}
              className="w-12 h-6 rounded-full bg-black/20 dark:bg-slate-800 p-1 border border-rose-500/30 flex items-center cursor-pointer"
            >
              <div className={`w-4 h-4 rounded-full bg-rose-500 transition-transform ${annual ? 'translate-x-6' : ''}`}></div>
            </button>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${annual ? 'text-rose-600 dark:text-rose-300' : 'text-slate-400'}`}>
              Annual <span className="text-[10px] bg-rose-500/20 text-rose-500 px-1.5 py-0.2 rounded font-black border border-rose-500/40">SAVE 35%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl glass-card-neo border border-rose-500/20 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">STARTER</span>
              <h3 className="text-xl font-black font-syne text-maroon-950 dark:text-white mt-1">Free Lifter</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-black font-syne text-maroon-950 dark:text-white font-mono">$0</span>
                <span className="text-xs text-slate-400"> / forever</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 dark:text-rose-100/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> 5 supplement scans per month</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> Basic amino-spiking indicator</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> Product compare tool (up to 2 items)</li>
              </ul>
            </div>
            <button 
              onClick={onClose}
              className="mt-8 w-full py-3 rounded-xl glass-card-neo text-maroon-950 dark:text-white font-bold text-xs uppercase cursor-pointer"
            >
              Current Plan
            </button>
          </div>

          <div className="p-6 rounded-3xl glass-hud border-2 border-rose-500 relative flex flex-col justify-between shadow-[0_0_40px_rgba(225,29,72,0.25)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              MOST POPULAR
            </div>
            <div>
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">ATHLETE & BODYBUILDER</span>
              <h3 className="text-xl font-black font-syne text-maroon-950 dark:text-white mt-1">Pro Athlete</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-black font-syne text-maroon-950 dark:text-white font-mono">{annual ? "$4.99" : "$7.99"}</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-700 dark:text-rose-100">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> Unlimited instant OCR AI vision scans</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> Full amino acid profile breakdown</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> WADA & FDA banned stimulant alerts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> Heavy metal & sweetener load tracker</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> Exclusive lab-certified clean discounts</li>
              </ul>
            </div>
            <button 
              onClick={() => alert("Redirecting to Pro Checkout...")}
              className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition shadow-lg cursor-pointer"
            >
              Get Pro Athlete
            </button>
          </div>

          <div className="p-6 rounded-3xl glass-card-neo border border-rose-500/20 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">COACHES & GYMS</span>
              <h3 className="text-xl font-black font-syne text-maroon-950 dark:text-white mt-1">Coach & Gym Team</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-black font-syne text-maroon-950 dark:text-white font-mono">{annual ? "$19.99" : "$29.99"}</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 dark:text-rose-100/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> Everything in Pro Athlete</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> Up to 50 athlete client roster scans</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> PDF Lab Certificates & custom gym reports</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" /> API access for nutrition coaches</li>
              </ul>
            </div>
            <button 
              onClick={() => alert("Connecting to Coach Enterprise Setup...")}
              className="mt-8 w-full py-3 rounded-xl glass-card-neo hover:border-rose-500 text-maroon-950 dark:text-white font-bold text-xs uppercase cursor-pointer"
            >
              Contact Sales
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
