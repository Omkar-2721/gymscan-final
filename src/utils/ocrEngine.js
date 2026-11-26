/**
 * Singleton Tesseract.js v7 Worker, Multi-Variant OCR Runner,
 * Supplement Label Region Extractor, Fuzzy Dictionary Matcher (Fuse.js + Levenshtein),
 * and OCR-Tolerant Macro Extractor.
 */

import Fuse from 'fuse.js';
import {
  INGREDIENT_DICTIONARY,
  EXACT_INGREDIENT_MAP,
  DICTIONARY_SEARCH_ITEMS,
} from '../data/ingredientDictionary.js';
import { matchBannedOrContamination } from '../data/bannedSubstances.js';

let workerPromise = null;
let workerQueue = Promise.resolve();

/**
 * Reuse a single Tesseract v7 worker across all scans (kept alive in memory).
 */
export async function getTesseractWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      await worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: '6',
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/**
 * Serializes access to the persistent Tesseract worker so live frames or scans never collide.
 */
function enqueueWorkerTask(taskFn) {
  const next = workerQueue.then(taskFn, taskFn);
  workerQueue = next.catch(() => {});
  return next;
}

/**
 * Run OCR on a single image input (dataUrl or Buffer) with tuned PSM.
 */
export async function recognizeSingleVariant(imageInput, psm = '6') {
  return enqueueWorkerTask(async () => {
    const worker = await getTesseractWorker();
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: String(psm),
    });

    const ret = await worker.recognize(imageInput);
    const data = ret?.data || {};
    const rawText = data.text || '';
    const rawLines = Array.isArray(data.lines) ? data.lines : [];

    const lines =
      rawLines.length > 0
        ? rawLines
            .map((ln) => ({
              text: (ln.text || '').trim(),
              confidence: Math.round(Number(ln.confidence ?? data.confidence ?? 0)),
              bbox: ln.bbox || null,
            }))
            .filter((ln) => ln.text.length > 0)
        : rawText
            .split(/\r?\n/)
            .map((t) => ({
              text: t.trim(),
              confidence: Math.round(Number(data.confidence ?? 0)),
              bbox: null,
            }))
            .filter((ln) => ln.text.length > 0);

    const avgConf =
      lines.length > 0
        ? Math.round(lines.reduce((acc, l) => acc + l.confidence, 0) / lines.length)
        : Math.round(Number(data.confidence ?? 0));

    return {
      text: rawText,
      confidence: Math.max(0, Math.min(100, avgConf)),
      lines,
    };
  });
}

/**
 * Scores an OCR variant result by confidence + alphabetic word quality
 * so a binary variant full of punctuation specks doesn't beat clean text.
 */
function scoreVariantQuality(res) {
  const text = (res.text || '').trim();
  if (!text) return -1;
  const alphaChars = (text.match(/[a-zA-Z]/g) || []).length;
  const alphaRatio = alphaChars / Math.max(1, text.length);
  const wordCount = (text.match(/[a-zA-Z]{3,}/g) || []).length;
  return res.confidence * 0.75 + alphaRatio * 25 + Math.min(20, wordCount * 0.7);
}

/**
 * Locates the bounding box [0..1] of the Ingredients / Supplement Facts section
 * from OCR line boxes so full-label photos can automatically run a high-zoom 2nd pass.
 */
export function findIngredientRegionBBox(lines, imgWidth, imgHeight) {
  if (!Array.isArray(lines) || lines.length === 0 || !imgWidth || !imgHeight) return null;

  let startIdx = -1;
  let endIdx = lines.length - 1;

  for (let i = 0; i < lines.length; i++) {
    const txt = (lines[i].text || '').toLowerCase();
    if (
      startIdx === -1 &&
      /(?:other\s+ingredients|ingredients|active\s+ingredients|supplement\s+facts)/i.test(txt)
    ) {
      startIdx = i;
      continue;
    }
    if (
      startIdx !== -1 &&
      i > startIdx &&
      /^(?:contains\s*:|allergen|directions|suggested\s+use|war[nm]ing|caution|manufactured\s+(?:for|by)|distributed\s+by)/i.test(
        txt
      )
    ) {
      endIdx = Math.max(startIdx, i - 1);
      break;
    }
  }

  if (startIdx === -1) return null;
  const targetLines = lines.slice(startIdx, endIdx + 1).filter((l) => l.bbox);
  if (targetLines.length === 0) return null;

  let x0 = imgWidth;
  let y0 = imgHeight;
  let x1 = 0;
  let y1 = 0;
  for (const ln of targetLines) {
    x0 = Math.min(x0, ln.bbox.x0 ?? 0);
    y0 = Math.min(y0, ln.bbox.y0 ?? 0);
    x1 = Math.max(x1, ln.bbox.x1 ?? imgWidth);
    y1 = Math.max(y1, ln.bbox.y1 ?? imgHeight);
  }

  // Pad slightly around detected section (~3% W, ~4% H)
  const padX = imgWidth * 0.03;
  const padY = imgHeight * 0.04;
  const nx = Math.max(0, (x0 - padX) / imgWidth);
  const ny = Math.max(0, (y0 - padY) / imgHeight);
  const nw = Math.min(1 - nx, (x1 - x0 + padX * 2) / imgWidth);
  const nh = Math.min(1 - ny, (y1 - y0 + padY * 2) / imgHeight);

  if (nw < 0.12 || nh < 0.08) return null;
  // Only worth re-cropping if it meaningfully zooms in (< 78% of full image area)
  if (nw * nh >= 0.78) return null;
  return { x: nx, y: ny, width: nw, height: nh };
}

/**
 * Runs OCR across all 3 preprocessed variants (grayscale, CLAHE contrast, Sauvola threshold)
 * trying both PSM 6 and PSM 4, picking the best result by confidence + alphabetic quality.
 */
export async function recognizeWithVariants(
  variants,
  { fastMode = false, imgWidth = null, imgHeight = null } = {}
) {
  const passes = [];
  if (fastMode) {
    const v = variants[1] || variants[0];
    if (v) passes.push({ ...v, psm: '6' });
  } else {
    for (const v of variants) {
      passes.push({ ...v, psm: '6' });
      passes.push({ ...v, psm: '4' });
    }
  }

  const variantResults = [];
  for (const pass of passes) {
    const input = pass.buffer || pass.dataUrl;
    const res = await recognizeSingleVariant(input, pass.psm);
    const qualityScore = scoreVariantQuality(res);
    variantResults.push({
      id: pass.id,
      label: pass.label,
      psm: pass.psm,
      ...res,
      qualityScore: Math.round(qualityScore * 10) / 10,
    });

    // Early exit only when already >= 92% confidence and rich extracted text
    if (!fastMode && variantResults.length >= 2 && res.confidence >= 92 && (res.text || '').length > 100) {
      break;
    }
  }

  variantResults.sort((a, b) => b.qualityScore - a.qualityScore);
  const winner = variantResults[0] || {
    id: 'none',
    label: 'None',
    psm: '6',
    text: '',
    confidence: 0,
    lines: [],
  };

  // Merge any high-confidence ingredient-like lines from runner-up if missing in winner
  let mergedText = winner.text;
  if (variantResults.length > 1) {
    const runnerUp = variantResults[1];
    const winnerLower = (winner.text || '').toLowerCase();
    const extraLines = (runnerUp.lines || [])
      .filter((ln) => ln.confidence >= 70 && ln.text.length >= 4)
      .filter((ln) => {
        const key = ln.text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
        return key.length >= 5 && !winnerLower.replace(/[^a-z0-9]/g, '').includes(key);
      })
      .map((ln) => ln.text);

    if (extraLines.length > 0 && winner.confidence < 82) {
      mergedText = `${winner.text}\n${extraLines.join('\n')}`.trim();
    }
  }

  const regionBBox = findIngredientRegionBBox(winner.lines, imgWidth, imgHeight);

  if (typeof console !== 'undefined' && !fastMode) {
    console.info('[GymScan OCR Debug]', {
      winningVariant: `${winner.label} (PSM ${winner.psm})`,
      confidence: winner.confidence,
      lineCount: winner.lines.length,
      perLineConfidence: winner.lines.map((l) => `${l.confidence}%: ${l.text}`),
      rawText: mergedText,
      autoRegionBBox: regionBBox,
    });
  }

  return {
    text: mergedText,
    confidence: winner.confidence,
    perLineConfidence: winner.lines.map(({ text, confidence }) => ({ text, confidence })),
    winningVariant: { id: winner.id, label: winner.label, psm: winner.psm },
    regionBBox,
    variantStats: variantResults.map((v) => ({
      id: v.id,
      label: v.label,
      psm: v.psm,
      confidence: v.confidence,
      qualityScore: v.qualityScore,
      lineCount: v.lines.length,
    })),
  };
}

// ------------------ TEXT CLEANUP, REGION PARSING & FUZZY MATCHING ------------------

/**
 * Normalize common OCR character confusions (0/O, 1/l/I, 5/S, rn/m) and stray symbols.
 */
export function normalizeOcrToken(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim();

  // Fix common OCR multi-char confusion "rn" inside words when adjacent to vowels/consonants
  // (targeted replacements + general letter/digit confusion cleanup)
  s = s
    .replace(/\|/g, 'l')
    .replace(/(?<=[a-zA-Z])0(?=[a-zA-Z])/g, 'o')
    .replace(/\b0(?=[a-zA-Z]{2,})/g, 'o')
    .replace(/(?<=[a-zA-Z])1(?=[a-zA-Z])/g, 'l')
    .replace(/(?<=[a-zA-Z])5(?=[a-zA-Z])/g, 's')
    .replace(/(?<=[a-z])I(?=[a-z])/g, 'l')
    .replace(/rnaltodextrin/gi, 'maltodextrin')
    .replace(/amin0/gi, 'amino')
    .replace(/caff[e3]1ne/gi, 'caffeine')
    .replace(/sucra[1iI]ose/gi, 'sucralose')
    .replace(/g[1iI]yc[i1]ne/gi, 'glycine')
    .replace(/taur[1iI]ne/gi, 'taurine')
    .replace(/creat[1iI]ne/gi, 'creatine')
    .replace(/aspartarne/gi, 'aspartame')
    .replace(/\bwarming\s*:/gi, 'Warning:')
    // Fix OCR letter/digit confusion inside E-numbers (e.g. E95l -> E951, E9S1 -> E951)
    .replace(/\b[eE]([0-9oOlIiSs]{3,4})\b/g, (_, digits) =>
      'e' + digits.replace(/[oO]/g, '0').replace(/[lIi|]/g, '1').replace(/[sS]/g, '5')
    );

  // Remove stray punctuation while retaining letters, digits, spaces, hyphens, parentheses
  s = s.replace(/[~`^*_+={}[\]\\<>@#$"“”‘’!?]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Normalize for dictionary comparison (lowercase, alphanumeric + single space).
 */
export function toMatchKey(str) {
  return normalizeOcrToken(str)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits a string by top-level commas/semicolons WITHOUT splitting inside parentheses.
 * e.g. "Whey Protein Isolate (Milk, Soy), Lecithin (Soy)"
 *   -> ["Whey Protein Isolate (Milk, Soy)", "Lecithin (Soy)"]
 */
export function splitRespectingParentheses(text) {
  const parts = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === ']') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if ((ch === ',' || ch === ';' || ch === '•') && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Extracts the Ingredients / Other Ingredients / Supplement Facts region from full label OCR,
 * stopping before Contains / Allergen / Directions / Warning sections.
 * Handles hyphenated line breaks, multi-line wrapping, parentheses, and proprietary blends.
 */
export function extractLabelSection(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { sectionText: '', foundRegion: false, proprietaryBlends: [], tokens: [] };
  }

  // 1. Rejoin hyphenated line breaks ("hydro-\nlyzed" -> "hydrolyzed")
  let text = rawText.replace(/([a-zA-Z])-\s*\r?\n\s*([a-zA-Z])/g, '$1$2');

  // 2. Locate section start: prefer explicit Ingredients / Other Ingredients over Supplement Facts header
  const ingredientsStart = text.match(
    /(?:other\s+ingredients|ingredients|active\s+ingredients)\s*[:\-]?\s*/i
  );
  const factsStart = text.match(/supplement\s+facts\s*[:\-]?\s*/i);
  const startMatch = ingredientsStart || factsStart;

  let foundRegion = false;
  let region = text;

  if (startMatch && startMatch.index !== undefined) {
    foundRegion = true;
    region = text.slice(startMatch.index + startMatch[0].length);
  }

  // 3. Locate section end: Contains / Allergen / Directions / Suggested Use / Warning (including OCR "Warming")
  const stopMatch = region.match(
    /(?:\n|\.|^|\s)\s*(?:contains\s*:|allergen\s*(?:info|information|warning)?\s*[:\-]|directions\s*[:\-]|suggested\s+use\s*[:\-]|how\s+to\s+use\s*[:\-]|war[nm]ing[s]?\s*[:\-]|caution\s*[:\-]|manufactured\s+(?:for|by)|distributed\s+by|storage\s*[:\-])/i
  );
  if (stopMatch && stopMatch.index !== undefined && stopMatch.index > 3) {
    region = region.slice(0, stopMatch.index);
  }

  // 4. Handle multi-line wrapping: collapse newlines into spaces unless line looks like a separate bullet/table row
  const lines = region
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Strip Nutrition/Supplement table header noise lines if Supplement Facts matched
  const cleanedLines = lines.filter(
    (l) =>
      !/^(serving\s+size|servings\s+per|amount\s+per\s+serving|%?\s*daily\s+value|\*\s*percent)/i.test(
        l
      )
  );

  // Join wrapped lines while keeping comma boundaries intact
  let joined = '';
  for (const line of cleanedLines) {
    if (!joined) {
      joined = line;
    } else if (/[,;:]$/.test(joined)) {
      joined += ' ' + line;
    } else if (/^[a-z(]/.test(line) || !/[.,;]$/.test(joined)) {
      // Wrapped sentence or ingredient list continuation
      joined += ' ' + line;
    } else {
      joined += ', ' + line;
    }
  }

  // 5. Extract proprietary blend names & amounts in mg/g while flattening sub-ingredients
  const proprietaryBlends = [];
  joined = joined.replace(
    /([a-zA-Z0-9\s\-&]+(?:proprietary\s+blend|blend|matrix|complex))\s*(?:\(\s*(\d+(?:,\d+)?(?:\.\d+)?\s*(?:mg|g|mcg))\s*\))?\s*[:\-]/gi,
    (_, blendName, amount) => {
      proprietaryBlends.push({
        name: blendName.trim(),
        amount: amount || 'undisclosed',
      });
      return ', ';
    }
  );

  // Also capture standalone mg/g quantities attached to ingredients in Supplement Facts, e.g. "Beta-Alanine 3200 mg"
  const rawTokens = splitRespectingParentheses(joined)
    .map((tok) => tok.replace(/\.+$/, '').trim())
    .filter((tok) => tok.length >= 2 && /[a-zA-Z]{2,}/.test(tok));

  // If proprietary blend had inner list inside parentheses e.g. "Energy Matrix 500mg (Caffeine, Taurine)"
  const expandedTokens = [];
  for (const tok of rawTokens) {
    const propParen = tok.match(
      /^([a-zA-Z0-9\s\-]+?(?:blend|matrix|complex))(?:\s+\d+(?:\.\d+)?\s*(?:mg|g))?\s*\(([^)]+)\)$/i
    );
    if (propParen) {
      proprietaryBlends.push({ name: propParen[1].trim(), amount: 'proprietary' });
      const innerParts = splitRespectingParentheses(propParen[2]);
      expandedTokens.push(...innerParts);
    } else {
      expandedTokens.push(tok);
    }
  }

  return {
    sectionText: joined,
    foundRegion,
    proprietaryBlends,
    tokens: expandedTokens,
  };
}

/**
 * Standard Levenshtein edit distance & normalized similarity [0..1].
 */
export function levenshteinSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}

const fuseIndex = new Fuse(DICTIONARY_SEARCH_ITEMS, {
  keys: ['term'],
  includeScore: true,
  threshold: 0.42,
  ignoreLocation: true,
  minMatchCharLength: 3,
});

const SIMILARITY_ACCEPT_THRESHOLD = 0.72;

/**
 * Matches a single noisy ingredient string against the 300+ ingredient dictionary
 * using exact lookup -> Fuse.js candidate search + Levenshtein similarity.
 */
export function matchIngredientToDictionary(rawToken) {
  const cleanedRaw = normalizeOcrToken(rawToken);
  // Separate parenthetical allergen/detail suffix e.g. "Whey Protein Isolate (Milk)" -> base + parenNote
  const parenMatch = cleanedRaw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  const baseText = parenMatch ? parenMatch[1].trim() : cleanedRaw;
  const parenNote = parenMatch ? parenMatch[2].trim() : null;

  // Strip trailing dosage amounts like "3.2 g" or "200mg" or "2%" for dictionary lookup
  const baseNoDose = baseText
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug|g|kg|iu|ml|%)\b/gi, '')
    .replace(/^\d+(?:\.\d+)?%?\s+/, '')
    .trim();

  const key = toMatchKey(baseNoDose || baseText);
  if (!key || key.length < 2) {
    return null;
  }

  // 0. Check Banned / Contamination-Risk matcher first with strict >= 0.85 threshold (catches OCR typos like "0starine")
  const bannedHit = matchBannedOrContamination(baseNoDose || rawToken, 0.85);
  if (bannedHit) {
    const isBanned = bannedHit.severity === 'banned';
    return {
      raw: rawToken.trim(),
      cleaned: cleanedRaw,
      matchedName: bannedHit.name,
      displayName: parenNote ? `${bannedHit.name} (${parenNote})` : bannedHit.name,
      parenNote,
      similarity: bannedHit.similarity,
      correctionMade:
        bannedHit.similarity < 1
          ? `"${rawToken.trim()}" → "${bannedHit.name}" (${Math.round(bannedHit.similarity * 100)}%)`
          : null,
      unrecognized: false,
      category: bannedHit.category,
      status: isBanned ? 'banned_wada' : 'contamination_risk',
      severity: bannedHit.severity,
      reason: bannedHit.whyProblem,
    };
  }

  // 1. Exact dictionary/alias/E-number match
  const exact = EXACT_INGREDIENT_MAP.get(key);
  if (exact) {
    return {
      raw: rawToken.trim(),
      cleaned: cleanedRaw,
      matchedName: exact.name,
      displayName: parenNote ? `${exact.name} (${parenNote})` : exact.name,
      parenNote,
      similarity: 1.0,
      correctionMade:
        key !== exact.normalizedName ? `"${rawToken.trim()}" → "${exact.name}"` : null,
      unrecognized: false,
      category: exact.category,
      status: exact.status,
      reason: exact.reason,
    };
  }

  // 2. Fuzzy search via Fuse.js + Levenshtein verification
  const fuseHits = fuseIndex.search(key, { limit: 6 });
  let bestEntry = null;
  let bestSim = 0;

  for (const hit of fuseHits) {
    const candidateTerm = hit.item.term;
    const levSim = levenshteinSimilarity(key, candidateTerm);
    const fuseSim = 1 - (hit.score ?? 1);
    const combinedSim = Math.max(levSim, (levSim * 0.65 + fuseSim * 0.35));
    if (combinedSim > bestSim) {
      bestSim = combinedSim;
      bestEntry = hit.item.entry;
    }
  }

  // Also check word-subsequence exact containment for long compound OCR tokens
  if (bestSim < SIMILARITY_ACCEPT_THRESHOLD) {
    for (const entry of INGREDIENT_DICTIONARY) {
      if (key.includes(entry.normalizedName) && entry.normalizedName.length >= 5) {
        bestEntry = entry;
        bestSim = Math.max(bestSim, 0.86);
        break;
      }
    }
  }

  if (bestEntry && bestSim >= SIMILARITY_ACCEPT_THRESHOLD) {
    const roundedSim = Math.round(bestSim * 100) / 100;
    return {
      raw: rawToken.trim(),
      cleaned: cleanedRaw,
      matchedName: bestEntry.name,
      displayName: parenNote ? `${bestEntry.name} (${parenNote})` : bestEntry.name,
      parenNote,
      similarity: roundedSim,
      correctionMade: `"${rawToken.trim()}" → "${bestEntry.name}" (${Math.round(roundedSim * 100)}%)`,
      unrecognized: false,
      category: bestEntry.category,
      status: bestEntry.status,
      reason: bestEntry.reason,
    };
  }

  // Below threshold -> flag as Unrecognized so user can tap to edit/correct
  return {
    raw: rawToken.trim(),
    cleaned: cleanedRaw,
    matchedName: cleanedRaw,
    displayName: cleanedRaw,
    parenNote,
    similarity: Math.round(bestSim * 100) / 100,
    correctionMade: null,
    unrecognized: true,
    category: 'unrecognized',
    status: 'neutral',
    reason: 'Unrecognized - tap to correct',
  };
}

/**
 * Full section extraction + fuzzy dictionary matching pipeline.
 */
export function parseLabelAndMatch(rawText) {
  const region = extractLabelSection(rawText);
  const matched = [];
  const seen = new Set();

  for (const tok of region.tokens) {
    const item = matchIngredientToDictionary(tok);
    if (!item) continue;
    const dedupeKey = item.unrecognized ? toMatchKey(item.cleaned) : item.matchedName.toLowerCase();
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    matched.push(item);
  }

  const corrections = matched
    .filter((m) => m.correctionMade)
    .map((m) => m.correctionMade);

  const recognizedCount = matched.filter((m) => !m.unrecognized).length;
  const totalCount = matched.length;
  const matchRate = totalCount > 0 ? recognizedCount / totalCount : 0;
  const unrecognizedRatio = totalCount > 0 ? (totalCount - recognizedCount) / totalCount : 1;

  return {
    foundRegion: region.foundRegion,
    sectionText: region.sectionText,
    proprietaryBlends: region.proprietaryBlends,
    ingredients: matched,
    corrections,
    recognizedCount,
    totalCount,
    matchRate: Math.round(matchRate * 1000) / 1000,
    unrecognizedRatio: Math.round(unrecognizedRatio * 1000) / 1000,
  };
}

/**
 * Extract serving size, protein per serving, sugar, carbs, fat, and calories
 * with regexes tolerant of common OCR noise (0/O, 1/l/i, 5/S).
 */
export function extractMacrosFromOCR(rawText) {
  const norm = normalizeOcrToken(rawText || '').toLowerCase();

  const findVal = (patterns) => {
    for (const pat of patterns) {
      const m = norm.match(pat);
      if (m && m[1]) {
        return m[1].replace(/[oO]/g, '0').replace(/\s+/g, '');
      }
    }
    return null;
  };

  const servingSizeG = findVal([
    /serv[i1l]ng\s*s[i1l]ze[^0-9\n]{0,20}(\d{1,3}(?:\.\d+)?)\s*g\b/i,
    /1\s*(?:scoop|bar|packet|sachet)\s*\(?(\d{1,3}(?:\.\d+)?)\s*g\)?/i,
  ]);

  const proteinG = findVal([
    /pr[o0]te[i1l]n\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*g\b/i,
    /(\d{1,3}(?:\.\d+)?)\s*g\s*pr[o0]te[i1l]n/i,
  ]);

  const sugarG = findVal([
    /(?:total\s+)?[s5]ugar[s5]?\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*g\b/i,
    /added\s+[s5]ugar[s5]?\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*g\b/i,
  ]);

  const carbsG = findVal([
    /(?:total\s+)?carb[o0]hydrate[s5]?\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*g\b/i,
  ]);

  const fatG = findVal([
    /(?:total\s+)?fat\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*g\b/i,
  ]);

  const calories = findVal([
    /cal[o0]r[i1l]e[s5]?\s*[:\-]?\s*(\d{2,4})\b/i,
    /energy\s*[:\-]?\s*(\d{2,4})\s*k?cal/i,
    /\b(\d{2,3})\s*kcal\b/i,
  ]);

  return {
    servingSizeG: servingSizeG ? parseFloat(servingSizeG) : null,
    proteinG: proteinG ? parseFloat(proteinG) : null,
    sugarG: sugarG ? parseFloat(sugarG) : null,
    carbsG: carbsG ? parseFloat(carbsG) : null,
    fatG: fatG ? parseFloat(fatG) : null,
    calories: calories ? parseInt(calories, 10) : null,
  };
}
