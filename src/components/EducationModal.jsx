import React, { useState } from 'react';
import {
  BookOpen,
  X,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  FlaskConical,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { BANNED_LIST_DISCLAIMER } from '../data/bannedSubstances';

const TOPICS = [
  {
    id: 'amino-spiking',
    title: 'What Is Amino Spiking?',
    badge: 'Nitrogen Fraud',
    icon: FlaskConical,
    accent: 'text-orange-400',
    summary:
      'Budget protein powders often add cheap unbound amino acids (Glycine, Taurine, L-Alanine, Creatine) to game the standard Kjeldahl nitrogen test without delivering complete muscle-building whey protein.',
    redFlags: [
      'Glycine, Taurine, or L-Alanine appearing in the top half of the ingredient list before cocoa/flavors.',
      'Claims like "24g Protein per scoop" alongside a "Proprietary Amino Matrix" with hidden milligram dosages.',
      'True complete whey protein delivers naturally balanced EAA/BCAAs (~45-50% essential amino acids); spiked whey drops sharply.',
    ],
    howToCheck:
      'Prefer single-source Whey Protein Isolate / Concentrate or Hydrolyzed Whey with full ingredient transparency and zero added glycine/taurine/glutamine peptides.',
  },
  {
    id: 'banned-wada',
    title: 'WADA Prohibited Substances & SARMs',
    badge: 'Athlete Safety',
    icon: ShieldAlert,
    accent: 'text-red-500',
    summary:
      'Fat burners, aggressive pre-workouts, and "hardcore test boosters" frequently contain prohibited stimulants, experimental SARMs, designer steroids, or prescription drug adulterants that cause positive doping tests and severe cardiac/liver harm.',
    redFlags: [
      'Stimulants (WADA S6/S3): DMAA (1,3-Dimethylamylamine / Methylhexanamine), DMHA (Octodrine), DMBA, Higenamine, Ephedra / Ma Huang, Sibutramine.',
      'SARMs & Anabolics (WADA S1/S4): Ostarine (MK-2866), Ligandrol (LGD-4033), RAD-140, Andarine (S-4), Cardarine (GW501516), YK-11, Androstenedione, DHEA, Clenbuterol.',
      'Hidden Drug / Contamination Warnings: Diuretics (Furosemide, HCTZ), PDE5 inhibitors (Tadalafil, Sildenafil), Tribulus cross-contamination risk, or disclaimers like "Not for sale in some countries" / "For research purposes only".',
    ],
    howToCheck:
      'Look for third-party batch testing (Informed-Sport, Informed-Choice, NSF Certified for Sport) and always cross-check every compound against the current WADA Prohibited List.',
  },
  {
    id: 'read-label',
    title: 'How to Read a Supplement Label',
    badge: 'Label Literacy',
    icon: Sparkles,
    accent: 'text-emerald-400',
    summary:
      'Ingredient lists are ordered strictly by descending weight before processing. The first three ingredients tell you 80%+ of what you are actually buying.',
    redFlags: [
      'Watch out for "Proprietary Blend (e.g. 2500mg)" listing 8 active herbs/stimulants with no individual doses ("pixie dusting").',
      'Compare Protein Grams vs Serving Size (g): Clean whey isolate should be ~80-90% protein per scoop (25-27g protein in a 30g scoop). A 45-100g scoop yielding only 18g protein is loaded with carb fillers.',
      'Check the "Other Ingredients" block right after Supplement Facts for artificial dyes (Red 40, Blue 1), sweeteners (Sucralose/E955, Ace-K/E950, Aspartame/E951), and thickeners.',
    ],
    howToCheck:
      'Use GymScan’s Manual Crop tool tightly around the Ingredients & Supplement Facts panel in bright flat lighting to maximize OCR confidence above 80%.',
  },
  {
    id: 'sweeteners-metals',
    title: 'Fillers, Sweeteners & Contamination',
    badge: 'Purity & Gut Health',
    icon: AlertTriangle,
    accent: 'text-amber-400',
    summary:
      'Even without banned drugs, mass gainers and protein bars rely heavily on high-glycemic maltodextrin, sugar alcohols, industrial oils, and synthetic colors.',
    redFlags: [
      'Glycemic Fillers: Maltodextrin, Dextrose, Corn Syrup Solids, Liquid Glucose — spike blood glucose rapidly while diluting protein density.',
      'Polyol Sugar Alcohols (Maltitol, Sorbitol) in protein bars often cause bloating and osmotic GI distress.',
      'Heavy-Metal & Cross-Contamination Risk: Look for COA batch transparency (especially in cocoa-rich plant/chocolate proteins) and avoid unregulated proprietary hormone herbs.',
    ],
    howToCheck:
      'Cleaner options favor Stevia Leaf Extract (E960), Monk Fruit, Sunflower Lecithin (over hexane-extracted soy or emulsifiers), and whole-food nut/chicory fiber binders.',
  },
];

export default function EducationModal({ isOpen, onClose, onOpenScanner }) {
  const [selectedTopicId, setSelectedTopicId] = useState(TOPICS[0].id);

  if (!isOpen) return null;

  const active = TOPICS.find((t) => t.id === selectedTopicId) || TOPICS[0];
  const IconComp = active.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto font-josefin">
      <div className="relative w-full max-w-4xl glass-hud rounded-3xl p-4 sm:p-8 my-4 border border-rose-500/30 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pr-10">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-maroon-950 dark:text-white">
              Supplement Label & Safety Guide
            </h2>
            <p className="text-xs text-slate-500 dark:text-rose-200/75 font-sans">
              Learn how to spot amino spiking, prohibited WADA compounds, and hidden fillers
            </p>
          </div>
        </div>

        {/* Topic Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6 font-sans">
          {TOPICS.map((topic) => {
            const TIcon = topic.icon;
            const isSelected = topic.id === active.id;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => setSelectedTopicId(topic.id)}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500/15 border-rose-500 shadow-sm'
                    : 'glass-card-neo border-rose-500/15 hover:border-rose-500/40'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TIcon className={`w-4 h-4 ${topic.accent}`} />
                  <span className="text-[9px] font-mono uppercase font-black text-slate-500 dark:text-rose-300/75">
                    {topic.badge}
                  </span>
                </div>
                <span className="text-xs font-black text-maroon-950 dark:text-white block leading-snug">
                  {topic.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Topic Content */}
        <div className="p-5 sm:p-6 rounded-3xl glass-card-neo border border-rose-500/25 space-y-5 font-sans">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
              <IconComp className={`w-6 h-6 ${active.accent}`} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500 font-bold">
                {active.badge}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-maroon-950 dark:text-white font-josefin">
                {active.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-rose-100/85 mt-1 leading-relaxed">
                {active.summary}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-500">
              Key Label Red Flags to Watch
            </h4>
            <ul className="space-y-2">
              {active.redFlags.map((flag, i) => (
                <li
                  key={i}
                  className="p-3 rounded-xl bg-black/5 dark:bg-black/45 border border-rose-500/15 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5 leading-relaxed"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/35 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-black block">What to Look For Instead</span>
              <p className="mt-0.5 opacity-90 leading-relaxed">{active.howToCheck}</p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-5 pt-4 border-t border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
          <p className="text-[11px] text-slate-500 dark:text-rose-200/70">
            {BANNED_LIST_DISCLAIMER}
          </p>
          {onOpenScanner && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>Scan a Label Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
