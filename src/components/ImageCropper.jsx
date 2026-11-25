import React, { useState, useRef } from 'react';
import { Crop, ScanLine, Maximize2, X } from 'lucide-react';

/**
 * Interactive draggable & resizable crop selector for uploaded supplement label photos.
 * Allows isolating the "Ingredients" or "Supplement Facts" box before OCR.
 */
export default function ImageCropper({ imageSrc, onConfirmCrop, onScanFull, onCancel }) {
  // Normalized crop rectangle [0..1]
  const [rect, setRect] = useState({ x: 0.1, y: 0.2, width: 0.8, height: 0.55 });
  const containerRef = useRef(null);
  const dragStateRef = useRef(null);

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const startDrag = (mode, e) => {
    e.preventDefault();
    e.stopPropagation();
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;

    dragStateRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...rect },
      boxW: box.width,
      boxH: box.height,
    };

    const handleMove = (moveEvt) => {
      const st = dragStateRef.current;
      if (!st) return;
      const dx = (moveEvt.clientX - st.startX) / st.boxW;
      const dy = (moveEvt.clientY - st.startY) / st.boxH;
      const r = st.startRect;
      const minSize = 0.12;

      if (st.mode === 'move') {
        setRect({
          x: clamp(r.x + dx, 0, 1 - r.width),
          y: clamp(r.y + dy, 0, 1 - r.height),
          width: r.width,
          height: r.height,
        });
      } else if (st.mode === 'br') {
        setRect({
          ...r,
          width: clamp(r.width + dx, minSize, 1 - r.x),
          height: clamp(r.height + dy, minSize, 1 - r.y),
        });
      } else if (st.mode === 'tl') {
        const newX = clamp(r.x + dx, 0, r.x + r.width - minSize);
        const newY = clamp(r.y + dy, 0, r.y + r.height - minSize);
        setRect({
          x: newX,
          y: newY,
          width: r.width - (newX - r.x),
          height: r.height - (newY - r.y),
        });
      }
    };

    const handleUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crop className="w-4 h-4 text-rose-500" />
          <div>
            <h3 className="text-sm font-black font-josefin text-maroon-950 dark:text-white">
              Select "Ingredients" or "Supplement Facts" Region
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-rose-200/70">
              Drag the box or corners tightly around the text for sharper OCR, or scan the full photo.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-slate-500 hover:text-rose-500 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      </div>

      {/* Image & Interactive Crop Box */}
      <div className="flex justify-center bg-black/70 rounded-2xl p-2 sm:p-3 border border-rose-500/25 overflow-hidden">
        <div
          ref={containerRef}
          className="relative inline-block max-h-[54vh] select-none touch-none"
        >
          <img
            src={imageSrc}
            alt="Supplement Label Crop Preview"
            className="max-h-[52vh] w-auto block rounded-xl pointer-events-none"
          />

          {/* Semi-transparent dark mask overlay outside crop */}
          <div
            onPointerDown={(e) => startDrag('move', e)}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            }}
            className="absolute border-2 border-emerald-400 rounded-lg cursor-move"
          >
            <span className="absolute -top-5 left-0 bg-emerald-500 text-black text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap shadow">
              DRAG INGREDIENTS AREA
            </span>

            {/* Top-left resize handle */}
            <div
              onPointerDown={(e) => startDrag('tl', e)}
              className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-emerald-400 border-2 border-black cursor-nwse-resize shadow"
            />
            {/* Bottom-right resize handle */}
            <div
              onPointerDown={(e) => startDrag('br', e)}
              className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-emerald-400 border-2 border-black cursor-nwse-resize shadow"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={() => onConfirmCrop(rect)}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:opacity-95 active:scale-95 transition cursor-pointer"
        >
          <ScanLine className="w-4 h-4" />
          <span>Scan Cropped Area (Best Accuracy)</span>
        </button>

        <button
          type="button"
          onClick={onScanFull}
          className="sm:w-auto px-5 py-3 rounded-xl glass-card-neo border border-rose-500/30 text-maroon-950 dark:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:border-rose-500 transition cursor-pointer"
        >
          <Maximize2 className="w-4 h-4 text-rose-500" />
          <span>Scan Full Image (+ Barcode)</span>
        </button>
      </div>
    </div>
  );
}
