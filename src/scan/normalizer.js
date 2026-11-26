/**
 * Stage 3 Normalization: Maps extracted ingredient strings against:
 *  - src/data/bannedSubstances.js (exact + synonym + fuzzy >= 0.85)
 *  - src/data/ingredientDictionary.js (300+ entries with Fuse.js + Levenshtein)
 * Ensures unmatched tokens are explicitly marked "Unrecognized" (NEVER as safe).
 */

import { matchIngredientToDictionary } from '../utils/ocrEngine.js';
import { matchBannedOrContamination } from '../data/bannedSubstances.js';

export function normalizeExtractedIngredients(rawIngredients = [], proprietaryBlends = []) {
  const flatTokens = [];
  const seenRaw = new Set();

  const pushToken = (tok, blendName = null) => {
    const clean = String(tok || '').trim();
    if (!clean || clean.length < 2) return;
    const key = clean.toLowerCase();
    if (seenRaw.has(key)) return;
    seenRaw.add(key);
    flatTokens.push({ raw: clean, blendName });
  };

  for (const ing of rawIngredients || []) {
    pushToken(ing, null);
  }

  for (const blend of proprietaryBlends || []) {
    for (const comp of blend.components || []) {
      pushToken(comp, blend.name);
    }
  }

  const normalizedItems = [];
  const dedupeMatched = new Set();

  for (const entry of flatTokens) {
    // Strip minor leading quantity markers e.g. "2% or less of:" or "- "
    const cleanedTok = entry.raw
      .replace(/^(?:contains?\s+\d+%\s+or\s+less\s+of\s*:?|and\/?or\s+|[-•*]+\s*)/i, '')
      .trim();

    if (!cleanedTok || cleanedTok.length < 2) continue;

    // Skip pure macro/nutrition/weight noise lines
    if (/^\d+(?:\.\d+)?\s*(?:g|mg|mcg|kcal|cal|%|iu)$/i.test(cleanedTok)) continue;
    if (/^(?:serving\s*size|servings\s*per|calories|total\s*(?:fat|carb|sugar)|amount\s*per|daily\s*value)/i.test(cleanedTok)) {
      continue;
    }

    const matched = matchIngredientToDictionary(cleanedTok);
    const bannedHit = matchBannedOrContamination(cleanedTok, 0.85);

    if (!matched && !bannedHit) continue;

    if (bannedHit) {
      const isBanned = bannedHit.severity === 'banned';
      const dedupeKey = `ban_${bannedHit.name.toLowerCase()}`;
      if (dedupeMatched.has(dedupeKey)) continue;
      dedupeMatched.add(dedupeKey);

      normalizedItems.push({
        raw: entry.raw,
        blendName: entry.blendName,
        canonicalName: bannedHit.name,
        displayName: bannedHit.name,
        category: bannedHit.category,
        baseStatus: isBanned ? 'banned_wada' : 'contamination_risk',
        similarity: bannedHit.similarity,
        correctionMade: bannedHit.similarity < 1 ? `"${entry.raw}" → "${bannedHit.name}"` : null,
        unrecognized: false,
        reason: bannedHit.whyProblem,
      });
      continue;
    }

    const dedupeKey = matched.unrecognized
      ? `unk_${matched.cleaned.toLowerCase()}`
      : `dict_${matched.matchedName.toLowerCase()}`;
    if (dedupeMatched.has(dedupeKey)) continue;
    dedupeMatched.add(dedupeKey);

    normalizedItems.push({
      raw: entry.raw,
      blendName: entry.blendName,
      canonicalName: matched.unrecognized ? matched.cleaned : matched.matchedName,
      displayName: matched.displayName,
      category: matched.category,
      baseStatus: matched.unrecognized ? 'unrecognized' : matched.status,
      similarity: matched.similarity,
      correctionMade: matched.correctionMade,
      unrecognized: Boolean(matched.unrecognized),
      reason: matched.unrecognized
        ? 'Unrecognized ingredient — counted conservatively as risk (tap to correct)'
        : matched.reason,
    });
  }

  const totalCount = normalizedItems.length;
  const recognizedCount = normalizedItems.filter((i) => !i.unrecognized).length;
  const unrecognizedCount = totalCount - recognizedCount;
  const unrecognizedRatio = totalCount > 0 ? unrecognizedCount / totalCount : 1.0;

  return {
    items: normalizedItems,
    totalCount,
    recognizedCount,
    unrecognizedCount,
    unrecognizedRatio: Math.round(unrecognizedRatio * 1000) / 1000,
    matchRatePct: totalCount > 0 ? Math.round((recognizedCount / totalCount) * 100) : 0,
    corrections: normalizedItems.map((i) => i.correctionMade).filter(Boolean),
  };
}
