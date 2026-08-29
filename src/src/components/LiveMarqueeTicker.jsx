import React from 'react';
import { Activity, ShieldAlert, Sparkles, Zap, Award, Flame } from 'lucide-react';

export default function LiveMarqueeTicker() {
  const items = [
    { icon: "🚨", text: "AMINO SPIKING DETECTED IN POPULAR MASS GAINERS (41.7% ACTUAL PROTEIN)" },
    { icon: "⚡", text: "0.85s NEURAL OCR VISION LATENCY" },
    { icon: "🔬", text: "12,000+ INGREDIENT TOXICOLOGY ENTRIES AUDITED" },
    { icon: "🛡️", text: "WADA & INFORMED-SPORT PROHIBITED STIMULANT SCREENING" },
    { icon: "🛑", text: "DE-MASKING DECEPTIVE PROPRIETARY BLENDS" },
    { icon: "🏆", text: "100% UNBIASED INDEPENDENT BIOCHEMICAL VERIFICATION" }
  ];

  return (
    <div className="w-full overflow-hidden py-3 border-y border-rose-500/20 bg-[#160408]/90 dark:bg-[#100205]/95 backdrop-blur-xl relative select-none">
      <div className="animate-marquee flex items-center whitespace-nowrap gap-8 text-xs font-mono font-bold tracking-wider">
        {[...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2.5 shrink-0 text-rose-200">
            <span>{item.icon}</span>
            <span className="text-rose-100/90">{item.text}</span>
            <span className="text-rose-500/50 ml-4 font-normal">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
