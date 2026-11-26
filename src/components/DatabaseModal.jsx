import React, { useMemo, useState } from 'react';
import {
  Database,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileDown,
  GitCompare,
  Star,
  Eye,
} from 'lucide-react';
import { getScoredSupplementCatalog } from '../utils/analyzer';
import { downloadScanReportPDF } from '../utils/pdfReport';

export default function DatabaseModal({
  isOpen,
  onClose,
  onInspectProduct,
  onSendToCompare,
  favoriteIds = [],
  onToggleFavorite,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tierFilter, setTierFilter] = useState('all'); // all | clean | moderate | unsafe

  const catalog = useMemo(() => getScoredSupplementCatalog(), []);

  if (!isOpen) return null;

  const categories = ['All', 'Whey Isolate', 'Whey Blend', 'Plant Protein', 'Creatine & Strength', 'Pre-Workout', 'Protein Bar', 'Mass Gainer'];

  const filtered = catalog.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.rawText || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (selectedCategory !== 'All' && !item.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }

    if (tierFilter === 'clean') return (item.purityScore || 0) >= 75;
    if (tierFilter === 'moderate') return (item.purityScore || 0) >= 50 && (item.purityScore || 0) < 75;
    if (tierFilter === 'unsafe') return (item.purityScore || 0) < 50 || item.flags?.bannedSubstances;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto font-josefin">
      <div className="relative w-full max-w-5xl glass-hud rounded-3xl p-4 sm:p-8 my-4 border border-rose-500/30 shadow-2xl max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/35 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-maroon-950 dark:text-white">
                Verified Supplement Database
              </h2>
              <p className="text-xs text-slate-500 dark:text-rose-200/75 font-sans">
                Search {catalog.length} analyzed whey isolates, blends, creatines, pre-workouts, bars & mass gainers
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-3 mb-4 font-sans">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, brand, or ingredient (e.g. Isolate, Stevia, Maltodextrin, DMAA, Creatine)..."
              className="w-full bg-black/5 dark:bg-black/70 border border-rose-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-maroon-950 dark:text-white outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-rose-500/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'clean', label: 'Clean (>=75)' },
                { id: 'moderate', label: 'Mixed (50-74)' },
                { id: 'unsafe', label: 'Spiked / Banned (<50)' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTierFilter(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                    tierFilter === t.id
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'border-rose-500/20 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="overflow-y-auto flex-1 pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              No matching supplements found in the local catalog. Try clearing your filters or scan the product label directly!
            </div>
          ) : (
            filtered.map((item) => {
              const isFav = favoriteIds.includes(item.id);
              const score = item.purityScore ?? 0;
              const isBanned = Boolean(item.flags?.bannedSubstances);
              const badgeColor = isBanned
                ? 'bg-red-600 text-white'
                : score >= 75
                ? 'bg-emerald-500 text-black'
                : score >= 50
                ? 'bg-amber-400 text-black'
                : 'bg-orange-500 text-white';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/45 flex flex-col justify-between gap-3 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-rose-500 font-bold block">
                          {item.category} • {item.brand} {item.priceINR ? `• ₹${item.priceINR}` : ''}
                        </span>
                        <h3 className="text-sm font-black text-maroon-950 dark:text-white leading-snug">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite?.(item)}
                          title={isFav ? 'Remove from Saved Favorites' : 'Save to Favorites'}
                          className={`p-1.5 rounded-lg border cursor-pointer transition ${
                            isFav
                              ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                              : 'border-white/10 text-slate-400 hover:text-amber-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                        </button>
                        <span className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs ${badgeColor}`}>
                          {score}/100
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-rose-100/80 flex items-center gap-1.5">
                      {isBanned ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : score >= 75 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className="line-clamp-2">{item.verdict}</span>
                    </p>

                    <div className="flex flex-wrap gap-1 pt-0.5 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                        Protein: {item.claimedProtein}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                        Sugar: {item.sugar}
                      </span>
                      {item.flags?.aminoSpiking && (
                        <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold">
                          SPIKED
                        </span>
                      )}
                      {isBanned && (
                        <span className="px-2 py-0.5 rounded bg-red-600/25 text-red-400 font-bold">
                          WADA BANNED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/15">
                    <button
                      type="button"
                      onClick={() => onInspectProduct?.(item)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Full Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadScanReportPDF(item)}
                      className="py-1.5 px-2.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-emerald-500/20 text-maroon-950 dark:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      title="Download PDF Report"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendToCompare?.(item)}
                      className="py-1.5 px-2.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 text-maroon-950 dark:text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      title="Load into Compare Mode"
                    >
                      <GitCompare className="w-3.5 h-3.5 text-rose-500" />
                      <span>Compare</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
