import React from 'react';
import { Star } from 'lucide-react';
import { TESTIMONIALS } from '../data/testimonials';

export default function StatsTestimonials() {
  return (
    <section className="py-20 border-y border-rose-500/15 bg-rose-950/5 dark:bg-[#120407]/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Metric Ticker Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-3xl glass-card-neo border border-rose-500/20 text-center">
            <span className="text-4xl sm:text-5xl font-black font-mono text-rose-600 dark:text-rose-400 block mb-1">
              85,000+
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-rose-300/70 uppercase tracking-widest">
              Gym Supplements Audited
            </span>
          </div>

          <div className="p-6 rounded-3xl glass-card-neo border border-rose-500/20 text-center">
            <span className="text-4xl sm:text-5xl font-black font-mono text-amber-500 block mb-1">
              78%
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-rose-300/70 uppercase tracking-widest">
              Flagged For Hidden Spiking
            </span>
          </div>

          <div className="p-6 rounded-3xl glass-card-neo border border-rose-500/20 text-center">
            <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-600 dark:text-emerald-400 block mb-1">
              12,400+
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-rose-300/70 uppercase tracking-widest">
              Lab-Certified Clean Swaps
            </span>
          </div>
        </div>

        {/* Athlete Testimonials 3-Card Glass Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <div 
              key={idx}
              className="glass-card-neo p-7 rounded-3xl relative flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 mb-4 text-amber-500">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-rose-100/90 text-sm sm:text-base leading-relaxed mb-6 italic">
                  "{item.quote}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-rose-500/15">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                  {item.initial}
                </div>
                <div>
                  <p className="text-sm font-bold font-syne text-maroon-950 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-rose-300/70">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
