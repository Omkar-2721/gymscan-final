/**
 * Zero-dependency spec-compliant PDF 1.4 generator & share-link codec
 * for GymScan Clinical Supplement Audit Reports.
 */

import { BANNED_LIST_DISCLAIMER } from '../data/bannedSubstances.js';

function toAsciiSafe(str) {
  return String(str ?? '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2192/g, '->')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/\u20B9/g, 'INR ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfText(str) {
  return toAsciiSafe(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text, maxChars = 84) {
  const clean = toAsciiSafe(text);
  if (!clean) return [''];
  const words = clean.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line) {
      line = w;
    } else if (line.length + 1 + w.length <= maxChars) {
      line += ' ' + w;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Generates a valid multi-page PDF 1.4 byte array (Uint8Array) for any scanResult.
 */
export function generateScanReportPdfBytes(scanResult) {
  const PAGE_W = 595.28; // A4 portrait width (pt)
  const PAGE_H = 841.89; // A4 portrait height (pt)
  const MARGIN_X = 42;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const BOTTOM_Y = 58;

  const pages = [];
  let ops = [];
  let y = PAGE_H - 42;

  const newPage = (continuation = false) => {
    if (ops.length > 0) pages.push(ops.join('\n'));
    ops = [];
    y = PAGE_H - 42;
    if (continuation) {
      ops.push('0.45 0.45 0.45 rg');
      ops.push(`BT /F1 8.5 Tf ${MARGIN_X} ${PAGE_H - 28} Td (${escapePdfText(`GymScan Audit Report (Continued) - ${scanResult?.name || 'Supplement'}`)}) Tj ET`);
      ops.push('0.85 0.85 0.85 RG 0.6 w');
      ops.push(`${MARGIN_X} ${PAGE_H - 34} m ${PAGE_W - MARGIN_X} ${PAGE_H - 34} l S`);
      y = PAGE_H - 52;
    }
  };

  const ensureSpace = (neededPt) => {
    if (y - neededPt < BOTTOM_Y) {
      newPage(true);
    }
  };

  const drawText = (text, x, yPos, { size = 10, bold = false, color = '0.12 0.12 0.14' } = {}) => {
    const font = bold ? '/F2' : '/F1';
    ops.push(`${color} rg`);
    ops.push(`BT ${font} ${size} Tf ${x.toFixed(2)} ${yPos.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
  };

  const fillRect = (x, yBottom, w, h, rgb) => {
    ops.push(`${rgb} rg`);
    ops.push(`${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  };

  const strokeRect = (x, yBottom, w, h, rgb, lineW = 0.8) => {
    ops.push(`${rgb} RG ${lineW} w`);
    ops.push(`${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  };

  // --- PAGE 1 HEADER BANNER ---
  fillRect(MARGIN_X, PAGE_H - 108, CONTENT_W, 66, '0.28 0.04 0.10');
  fillRect(MARGIN_X, PAGE_H - 108, CONTENT_W, 4, '0.88 0.11 0.28');
  drawText('GYMSCAN | SUPPLEMENT PURITY & WADA SAFETY REPORT', MARGIN_X + 14, PAGE_H - 64, {
    size: 13,
    bold: true,
    color: '1 1 1',
  });
  const genDate = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  drawText(
    `Generated: ${genDate}   |   Engine: ${scanResult?.mlPowered ? `ML (${scanResult.mlScore?.model_used || 'RF'})` : 'Conservative Scorer'}   |   OCR Conf: ${scanResult?.ocrMeta?.confidence ?? 100}%`,
    MARGIN_X + 14,
    PAGE_H - 84,
    { size: 8.5, color: '0.98 0.82 0.86' }
  );

  y = PAGE_H - 128;

  // --- PRODUCT TITLE & SCORE CARD ---
  const isBlocked = Boolean(scanResult?.scoreBlocked || scanResult?.purityScore == null);
  const scoreVal = isBlocked ? 'N/A' : `${scanResult.purityScore}/100`;
  const scoreColor = isBlocked
    ? '0.85 0.55 0.05'
    : scanResult.purityScore >= 75
    ? '0.06 0.65 0.45'
    : scanResult.purityScore >= 50
    ? '0.85 0.52 0.04'
    : '0.85 0.11 0.18';

  fillRect(MARGIN_X, y - 56, CONTENT_W - 125, 64, '0.97 0.96 0.97');
  strokeRect(MARGIN_X, y - 56, CONTENT_W - 125, 64, '0.88 0.82 0.84', 0.7);
  drawText(scanResult?.name || 'Scanned Supplement', MARGIN_X + 10, y - 14, { size: 12.5, bold: true });
  drawText(
    `Brand: ${scanResult?.brand || 'Unknown'}   |   Category: ${scanResult?.category || 'Gym Supplement'}`,
    MARGIN_X + 10,
    y - 30,
    { size: 9, color: '0.35 0.35 0.38' }
  );
  drawText(`Verdict: ${scanResult?.verdict || 'Analyzed'}`, MARGIN_X + 10, y - 46, {
    size: 9.5,
    bold: true,
    color: scoreColor,
  });

  // Score Box on Right
  fillRect(PAGE_W - MARGIN_X - 115, y - 56, 115, 64, '0.09 0.04 0.06');
  strokeRect(PAGE_W - MARGIN_X - 115, y - 56, 115, 64, scoreColor, 1.4);
  drawText('PURITY SCORE', PAGE_W - MARGIN_X - 96, y - 15, { size: 8, bold: true, color: '0.80 0.80 0.84' });
  drawText(scoreVal, PAGE_W - MARGIN_X - (isBlocked ? 74 : 90), y - 40, { size: 18, bold: true, color: scoreColor });

  y -= 74;

  // --- MACROS SUMMARY STRIP ---
  fillRect(MARGIN_X, y - 34, CONTENT_W, 38, '0.95 0.97 0.96');
  strokeRect(MARGIN_X, y - 34, CONTENT_W, 38, '0.78 0.88 0.84', 0.7);
  drawText(
    `Serving: ${scanResult?.servingSize || 'N/A'}  |  Calories: ${scanResult?.calories || 'N/A'}  |  Protein: ${scanResult?.claimedProtein || 'N/A'}`,
    MARGIN_X + 10,
    y - 12,
    { size: 8.8, bold: true }
  );
  drawText(
    `Carbs: ${scanResult?.carbs || 'N/A'}  |  Sugar: ${scanResult?.sugar || 'N/A'}  |  Fat: ${scanResult?.fat || 'N/A'}  |  Spiking Risk: ${scanResult?.mlSpiking?.spiking_risk || (scanResult?.flags?.aminoSpiking ? 'high' : 'low')}`,
    MARGIN_X + 10,
    y - 26,
    { size: 8.5, color: '0.28 0.30 0.32' }
  );
  y -= 50;

  // --- BANNED SUBSTANCE BANNER ---
  const banned = scanResult?.bannedSubstancesDetected || [];
  if (banned.length > 0) {
    const banHeight = 24 + banned.length * 26;
    ensureSpace(banHeight + 10);
    fillRect(MARGIN_X, y - banHeight + 12, CONTENT_W, banHeight, '0.99 0.90 0.91');
    strokeRect(MARGIN_X, y - banHeight + 12, CONTENT_W, banHeight, '0.85 0.10 0.16', 1.2);
    drawText('CRITICAL ALERT: BANNED SUBSTANCE DETECTED (SCORE CAPPED AT <= 20)', MARGIN_X + 10, y - 2, {
      size: 10,
      bold: true,
      color: '0.75 0.05 0.12',
    });
    let by = y - 16;
    for (const b of banned) {
      drawText(`- ${b.name} (${b.category})`, MARGIN_X + 12, by, { size: 8.8, bold: true, color: '0.65 0.05 0.12' });
      by -= 11;
      const lines = wrapText(b.whyProblem, 86);
      drawText(`  ${lines[0]}`, MARGIN_X + 12, by, { size: 8, color: '0.35 0.08 0.12' });
      by -= 13;
    }
    y -= banHeight + 12;
  }

  // --- CONTAMINATION RISK BANNER ---
  const contam = scanResult?.contaminationRisksDetected || [];
  if (contam.length > 0) {
    const cHeight = 22 + contam.length * 24;
    ensureSpace(cHeight + 10);
    fillRect(MARGIN_X, y - cHeight + 12, CONTENT_W, cHeight, '1.0 0.97 0.86');
    strokeRect(MARGIN_X, y - cHeight + 12, CONTENT_W, cHeight, '0.82 0.62 0.04', 1.0);
    drawText('CONTAMINATION / REGULATORY WARNING', MARGIN_X + 10, y - 2, {
      size: 9.5,
      bold: true,
      color: '0.60 0.42 0.02',
    });
    let cy = y - 16;
    for (const c of contam) {
      drawText(`- ${c.name} (${c.category}): ${c.whyProblem}`, MARGIN_X + 12, cy, {
        size: 8.2,
        color: '0.45 0.30 0.02',
      });
      cy -= 18;
    }
    y -= cHeight + 10;
  }

  // --- WHY THIS SCORE ---
  const whyList = scanResult?.whyThisScore || [];
  if (whyList.length > 0) {
    ensureSpace(40 + whyList.length * 14);
    drawText('WHY THIS SCORE (PENALTIES, BONUSES & SAFETY RULES)', MARGIN_X, y, {
      size: 10,
      bold: true,
      color: '0.28 0.04 0.10',
    });
    y -= 14;
    for (const item of whyList) {
      ensureSpace(16);
      const imp = Number(item.impact || 0);
      const ptsLabel = imp === 0 ? '[GATE]' : imp > 0 ? `[+${imp} pts]` : `[${imp} pts]`;
      const ptsColor = imp > 0 ? '0.06 0.60 0.40' : '0.78 0.12 0.22';
      drawText(`* ${item.label}  ${ptsLabel}`, MARGIN_X + 8, y, { size: 8.8, color: ptsColor });
      y -= 13;
    }
    y -= 6;
  }

  // --- INGREDIENT ASSAY TABLE ---
  const ings = scanResult?.ingredientsList || [];
  ensureSpace(40);
  drawText(`INGREDIENT ASSAY BREAKDOWN (${ings.length} EXTRACTED)`, MARGIN_X, y, {
    size: 10,
    bold: true,
    color: '0.28 0.04 0.10',
  });
  y -= 15;

  if (ings.length === 0) {
    drawText('No readable ingredients verified — retake clear photo of Ingredients panel.', MARGIN_X + 8, y, {
      size: 9,
      color: '0.50 0.30 0.10',
    });
    y -= 16;
  } else {
    for (const ing of ings) {
      const cls = ing.unrecognized ? 'UNRECOGNIZED' : String(ing.mlClass || ing.status || 'neutral').toUpperCase();
      const reasonLines = wrapText(ing.reason || 'Evaluated by GymScan rules', 84);
      ensureSpace(14 + reasonLines.length * 11);

      const badgeClr =
        cls === 'BANNED_WADA'
          ? '0.80 0.08 0.14'
          : cls === 'CONTAMINATION_RISK'
          ? '0.72 0.50 0.02'
          : cls === 'HARMFUL' || cls === 'DANGER'
          ? '0.86 0.35 0.06'
          : cls === 'BENEFICIAL' || cls === 'SAFE'
          ? '0.05 0.58 0.38'
          : '0.40 0.42 0.46';

      drawText(`[${cls}]`, MARGIN_X + 6, y, { size: 8.5, bold: true, color: badgeClr });
      drawText(ing.name || 'Ingredient', MARGIN_X + 115, y, { size: 9, bold: true });
      y -= 11;
      for (const rl of reasonLines) {
        drawText(rl, MARGIN_X + 115, y, { size: 8, color: '0.32 0.34 0.38' });
        y -= 10;
      }
      y -= 4;
    }
  }

  // --- SAFER ALTERNATIVES ---
  const alts = scanResult?.saferAlternatives || (scanResult?.cleanAlternative ? [scanResult.cleanAlternative] : []);
  if (alts.length > 0) {
    ensureSpace(45 + alts.length * 24);
    y -= 4;
    drawText('SAFER VERIFIED ALTERNATIVES', MARGIN_X, y, { size: 10, bold: true, color: '0.05 0.55 0.35' });
    y -= 14;
    for (const alt of alts.slice(0, 3)) {
      drawText(`-> ${alt.name} (${alt.brand || 'Clean'}) - Score ${alt.purityScore}/100`, MARGIN_X + 8, y, {
        size: 9,
        bold: true,
        color: '0.06 0.45 0.30',
      });
      y -= 11;
      for (const wl of wrapText(alt.whyBetter || alt.verdict || '', 84)) {
        drawText(`   ${wl}`, MARGIN_X + 8, y, { size: 8, color: '0.30 0.32 0.35' });
        y -= 10;
      }
      y -= 3;
    }
  }

  // --- FOOTER DISCLAIMER ON LAST PAGE ---
  ensureSpace(34);
  y -= 6;
  ops.push('0.85 0.85 0.88 RG 0.6 w');
  ops.push(`${MARGIN_X} ${y} m ${PAGE_W - MARGIN_X} ${y} l S`);
  y -= 12;
  for (const dl of wrapText(`Disclaimer: ${scanResult?.disclaimer || BANNED_LIST_DISCLAIMER}`, 92)) {
    drawText(dl, MARGIN_X, y, { size: 8, color: '0.45 0.45 0.50' });
    y -= 10;
  }

  if (ops.length > 0) pages.push(ops.join('\n'));

  // --- ASSEMBLE PDF OBJECTS & XREF ---
  const enc = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const offsets = [0]; // obj 0 free

  const pushStr = (s) => {
    const b = enc.encode(s);
    chunks.push(b);
    offset += b.length;
  };

  pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const addObject = (objNum, body) => {
    offsets[objNum] = offset;
    pushStr(`${objNum} 0 obj\n${body}\nendobj\n`);
  };

  // Obj 1: Catalog, Obj 2: Pages placeholder, Obj 3: Helvetica, Obj 4: Helvetica-Bold
  const pageCount = pages.length;
  const pageObjNums = [];
  let nextObj = 5;
  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(nextObj);
    nextObj += 2; // page + content stream
  }

  addObject(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  addObject(2, `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>`);
  addObject(3, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  addObject(4, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  for (let i = 0; i < pageCount; i++) {
    const pageObj = pageObjNums[i];
    const contentObj = pageObj + 1;
    const streamStr = pages[i];
    const streamLen = enc.encode(streamStr).length;

    addObject(
      pageObj,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`
    );
    addObject(contentObj, `<< /Length ${streamLen} >>\nstream\n${streamStr}\nendstream`);
  }

  const xrefOffset = offset;
  const totalObjs = offsets.length;
  pushStr(`xref\n0 ${totalObjs}\n`);
  pushStr(`0000000000 65535 f \n`);
  for (let i = 1; i < totalObjs; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(offset);
  let ptr = 0;
  for (const c of chunks) {
    out.set(c, ptr);
    ptr += c.length;
  }
  return out;
}

/**
 * Triggers browser download of `GymScan_Report_<Name>.pdf`.
 */
export function downloadScanReportPDF(scanResult) {
  const bytes = generateScanReportPdfBytes(scanResult);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const safeSlug = String(scanResult?.name || 'Supplement')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'Report';
  const a = document.createElement('a');
  a.href = url;
  a.download = `GymScan_Report_${safeSlug}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Encodes a concise portable audit snapshot into a shareable URL (?report=...).
 */
export function buildShareableReportUrl(scanResult) {
  const snapshot = {
    name: scanResult?.name,
    brand: scanResult?.brand,
    category: scanResult?.category,
    purityScore: scanResult?.purityScore,
    scoreBlocked: Boolean(scanResult?.scoreBlocked),
    verdict: scanResult?.verdict,
    claimedProtein: scanResult?.claimedProtein,
    sugar: scanResult?.sugar,
    calories: scanResult?.calories,
    servingSize: scanResult?.servingSize,
    bannedSubstancesDetected: (scanResult?.bannedSubstancesDetected || []).slice(0, 5),
    contaminationRisksDetected: (scanResult?.contaminationRisksDetected || []).slice(0, 5),
    whyThisScore: (scanResult?.whyThisScore || []).slice(0, 8),
    ingredientsList: (scanResult?.ingredientsList || []).slice(0, 20).map((i) => ({
      name: i.name,
      mlClass: i.mlClass,
      status: i.status,
      reason: i.reason,
    })),
    disclaimer: scanResult?.disclaimer || BANNED_LIST_DISCLAIMER,
  };
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'http://localhost:3000/';
  return `${base}?report=${b64}`;
}

/**
 * Decodes `?report=...` from window.location.search if present.
 */
export function readSharedReportFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('report');
    if (!token) return null;
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64 + '==='.slice((b64.length + 3) % 4);
    const bin = atob(pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? { ...parsed, isSharedSnapshot: true } : null;
  } catch (e) {
    return null;
  }
}
