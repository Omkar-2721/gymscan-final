import React, { useState } from 'react';
import {
  History,
  X,
  Trash2,
  Download,
  Search,
  Star,
  FileDown,
  Eye,
  GitCompare,
  ShieldAlert,
} from 'lucide-react';
import { downloadScanReportPDF } from '../utils/pdfReport';

export default function HistoryModal({
  isOpen,
  onClose,
  history = [],
  favorites = [],
  onToggleFavorite,
  onClearHistory,
  onClear,
  onInspectScan,
  onSendToCompare,
  userEmail = null,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('history'); // history | favorites
  const [tierFilter, setTierFilter] = useState('all'); // all | clean | moderate | unsafe

  if (!isOpen) return null;

  const handleClear = onClearHistory || onClear;
  const sourceList = activeTab === 'favorites' ? favorites : history;
  const favIds = new Set(favorites.map((f) => f.id || f.name));

  const filtered = sourceList.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (item.name || '').toLowerCase().includes(q) ||
      (item.brand || '').toLowerCase().includes(q) ||
      (item.verdict || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;

    const s = item.purityScore;
    if (tierFilter === 'clean') return typeof s === 'number' && s >= 75;
    if (tierFilter === 'moderate') return typeof s === 'number' && s >= 50 && s < 75;
    if (tierFilter === 'unsafe') return item.flags?.bannedSubstances || (typeof s === 'number' && s < 50) || item.scoreBlocked;
    return true;
  });

  const exportHistory = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sourceList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `gymscan_${activeTab}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto font-josefin">
      <div className="relative w-full max-w-4xl glass-hud rounded-3xl p-4 sm:p-8 my-4 border border-amber-500/30 shadow-2xl max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30 shrink-0">
              {activeTab === 'favorites' ? <Star className="w-5 h-5 fill-amber-500" /> : <History className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-maroon-950 dark:text-white">
                {activeTab === 'favorites' ? 'Saved Favorites' : 'Scan History'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-rose-300/75 font-sans">
                {userEmail ? `Linked to ${userEmail}` : 'Guest Session'} • {history.length} scans • {favorites.length} favorites
              </p>
            </div>
          </div>

          {sourceList.length > 0 && (
            <div className="flex items-center gap-2 font-sans">
              <button
                onClick={exportHistory}
                className="p-2 rounded-xl glass-card-neo text-xs font-bold text-rose-600 dark:text-rose-300 hover:text-rose-500 flex items-center gap-1.5 cursor-pointer"
                title="Export JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">JSON</span>
              </button>
              {activeTab === 'history' && handleClear && (
                <button
                  onClick={handleClear}
                  className="p-2 rounded-xl glass-card-neo text-xs font-bold text-rose-500 hover:opacity-80 flex items-center gap-1.5 cursor-pointer"
                  title="Clear History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs + Search + Tier Filters */}
        <div className="space-y-3 mb-4 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-black/50 border border-rose-500/20">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'history' ? 'bg-rose-600 text-white shadow' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                All Scans ({history.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('favorites')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'favorites' ? 'bg-amber-500 text-black font-black shadow' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Saved ({favorites.length})</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'clean', label: 'Clean (>=75)' },
                { id: 'moderate', label: 'Mixed (50-74)' },
                { id: 'unsafe', label: 'Unsafe / Banned' },
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

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab === 'favorites' ? 'saved favorites' : 'scanned supplements'}...`}
              className="w-full bg-black/5 dark:bg-black/80 border border-rose-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-maroon-950 dark:text-white outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 font-sans">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {activeTab === 'favorites'
                ? 'No saved favorites yet. Tap the Star icon on any scan or database product to bookmark it.'
                : 'No matching scans recorded yet. Use the Scanner to audit your first supplement!'}
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isFav = favIds.has(item.id || item.name);
              const score = item.purityScore;
              const isBanned = Boolean(item.flags?.bannedSubstances);
              const scoreClass =
                item.scoreBlocked || score == null
                  ? 'text-amber-500'
                  : isBanned || score < 50
                  ? 'text-red-500'
                  : score >= 75
                  ? 'text-emerald-500'
                  : 'text-amber-500';

              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 sm:p-4 rounded-2xl glass-card-neo border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-maroon-950 dark:text-white text-sm truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400">({item.brand})</span>
                      {isBanned && (
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase flex items-center gap-0.5">
                          <ShieldAlert className="w-2.5 h-2.5" /> BANNED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-rose-200/75 mt-0.5 line-clamp-1">
                      {item.verdict}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span className={`text-base font-black font-mono px-2 ${scoreClass}`}>
                      {score == null ? 'N/A' : `${score}/100`}
                    </span>

                    <button
                      type="button"
                      onClick={() => onToggleFavorite?.(item)}
                      title={isFav ? 'Remove Favorite' : 'Save to Favorites'}
                      className={`p-1.5 rounded-lg border cursor-pointer ${
                        isFav ? 'bg-amber-400/20 border-amber-400 text-amber-400' : 'border-white/15 text-slate-400 hover:text-amber-400'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>

                    {onInspectScan && (
                      <button
                        type="button"
                        onClick={() => onInspectScan(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => downloadScanReportPDF(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-emerald-500/20 text-maroon-950 dark:text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      title="Download PDF Report"
                    >
                      <FileDown className="w-3 h-3 text-emerald-500" />
                      <span>PDF</span>
                    </button>

                    {onSendToCompare && (
                      <button
                        type="button"
                        onClick={() => onSendToCompare(item)}
                        className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 text-rose-500 cursor-pointer"
                        title="Send to Compare"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                      </button>
                    )}
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
