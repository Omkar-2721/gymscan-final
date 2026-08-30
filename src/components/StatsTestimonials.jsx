import React, { useState, useEffect, useRef } from 'react';
import { Star, ShieldCheck, Zap, Award, CheckCircle2 } from 'lucide-react';
import { TESTIMONIALS } from '../data/testimonials';

export default function StatsTestimonials() {
  const sectionRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [countAudited, setCountAudited] = useState(0);
  const [countSpiked, setCountSpiked] = useState(0);
  const [countSwaps, setCountSwaps] = useState(0);

  // Trigger real counters when scrolled into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          // Animate Audited (0 to 1000)
          const duration = 1800; // 1.8s
          const startTime = performance.now();

          const animateCounters = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            setCountAudited(Math.floor(easeProgress * 1000));
            setCountSpiked(Math.floor(easeProgress * 78));
            setCountSwaps(Math.floor(easeProgress * 500));

            if (progress < 1) {
              requestAnimationFrame(animateCounters);
            } else {
              setCountAudited(1000);
              setCountSpiked(78);
              setCountSwaps(500);
            }
          };

          requestAnimationFrame(animateCounters);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
    };
  }, [hasAnimated]);

  return (
    <section 
      ref={sectionRef} 
      className="py-20 border-y border-rose-500/15 bg-rose-950/5 dark:bg-[#120407]/80 relative overflow-hidden font-josefin"
    >
      {/* Background ambient lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Metric Ticker Header with Real Live Incrementing Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          
          {/* Counter 1: Gym Supplements Audited (0 -> 1000+) */}
          <div className={`p-7 rounded-3xl glass-card-neo border border-rose-500/20 text-center transition-all duration-700 transform ${
            hasAnimated ? 'opacity-100 translate-y-0 shadow-[0_0_40px_rgba(225,29,72,0.15)]' : 'opacity-0 translate-y-8'
          }`}>
            <span className="text-4xl sm:text-5xl font-black font-mono text-rose-600 dark:text-rose-400 block mb-1 tracking-tight">
              {countAudited.toLocaleString()}+
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-rose-300/80 uppercase tracking-widest">
              Gym Supplements Audited
            </span>
          </div>

          {/* Counter 2: Flagged For Hidden Spiking (0 -> 78%) */}
          <div className={`p-7 rounded-3xl glass-card-neo border border-amber-500/20 text-center transition-all duration-700 delay-150 transform ${
            hasAnimated ? 'opacity-100 translate-y-0 shadow-[0_0_40px_rgba(245,158,11,0.15)]' : 'opacity-0 translate-y-8'
          }`}>
            <span className="text-4xl sm:text-5xl font-black font-mono text-amber-500 block mb-1 tracking-tight">
              {countSpiked}%
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-rose-300/80 uppercase tracking-widest">
              Flagged For Hidden Spiking
            </span>
          </div>

          {/* Counter 3: Lab-Certified Clean Swaps (0 -> 500+) */}
          <div className={`p-7 rounded-3xl glass-card-neo border border-emerald-500/20 text-center transition-all duration-700 delay-300 transform ${
            hasAnimated ? 'opacity-100 translate-y-0 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 'opacity-0 translate-y-8'
          }`}>
            <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-600 dark:text-emerald-400 block mb-1 tracking-tight">
              {countSwaps.toLocaleString()}+
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-rose-300/80 uppercase tracking-widest">
              Lab-Certified Clean Swaps
            </span>
          </div>

        </div>

        {/* Athlete Testimonials 3-Card Glass Grid with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <div 
              key={idx}
              style={{ transitionDelay: `${(idx + 1) * 150}ms` }}
              className={`glass-card-neo p-7 rounded-3xl relative flex flex-col justify-between transition-all duration-700 transform hover:scale-[1.02] ${
                hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div>
                <div className="flex gap-1 mb-4 text-amber-500">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-rose-100/90 text-sm sm:text-base leading-relaxed mb-6 italic font-sans">
                  "{item.quote}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-rose-500/15">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-[0_0_15px_rgba(225,29,72,0.3)] shrink-0">
                  {item.initial}
                </div>
                <div>
                  <p className="text-sm font-bold text-maroon-950 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-rose-300/70 font-sans">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
