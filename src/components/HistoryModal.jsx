import React, { useState } from 'react';
import { History, X, Trash2, Download, Search } from 'lucide-react';

export default function HistoryModal({ isOpen, onClose, history = [], onClearHistory }) {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filtered = history.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "gymscan_history.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-hud rounded-3xl p-6 sm:p-8 my-8 border border-amber-500/30 shadow-2xl max-h-[85vh] flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-syne text-maroon-950 dark:text-white">Your Scan History</h2>
              <p className="text-xs text-slate-500 dark:text-rose-300/70">{history.length} saved supplement audits</p>
            </div>
          </div>

          {history.length > 0 && (
            <div className="flex items-center gap-2 mr-8">
              <button 
                onClick={exportHistory}
                className="p-2 rounded-lg glass-card-neo text-xs font-bold text-rose-600 dark:text-rose-300 hover:text-rose-500 flex items-center gap-1.5 cursor-pointer"
                title="Export JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button 
                onClick={onClearHistory}
                className="p-2 rounded-lg glass-card-neo text-xs font-bold text-rose-500 hover:opacity-80 flex items-center gap-1.5 cursor-pointer"
                title="Clear History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scanned supplements..."
            className="w-full bg-black/5 dark:bg-black/80 border border-rose-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-maroon-950 dark:text-white outline-none focus:border-rose-500"
          />
        </div>

        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No scans recorded yet. Use the Scanner to test your first supplement!
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-2xl glass-card-neo border border-rose-500/15 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-syne text-maroon-950 dark:text-white text-sm">{item.name}</span>
                    <span className="text-[10px] text-slate-400">({item.brand})</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-rose-200/70 mt-0.5">{item.verdict}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className={`text-base font-black font-mono block ${
                      item.purityScore > 80 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {item.purityScore}/100
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">SCORE</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
