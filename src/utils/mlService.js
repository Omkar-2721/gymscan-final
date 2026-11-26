/**
 * Frontend Client for the GymScan Python FastAPI ML Service (/api/ml/*).
 * Provides:
 *   - checkMLHealth() -> GET /api/ml/health
 *   - extractTextWithEasyOCR() -> POST /api/ml/ocr
 *   - analyzeWithMLPipeline() -> /classify + /spiking + /score with conservative fallback
 */

import { scanTextForBannedAndContamination, BANNED_LIST_DISCLAIMER } from '../data/bannedSubstances.js';

const ML_TIMEOUT_MS = 7000;
const HEALTH_TIMEOUT_MS = 3500;
const EASYOCR_TIMEOUT_MS = 25000;

export function getMlBaseUrl() {
  if (typeof process !== 'undefined' && process.env?.GYMSCAN_ML_URL) {
    return process.env.GYMSCAN_ML_URL.replace(/\/$/, '');
  }
  return '/api/ml';
}

function fetchWithTimeout(url, options = {}, timeoutMs = ML_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

function parseOptionalNumber(str) {
  if (typeof str === 'number' && !Number.isNaN(str)) return str;
  const match = String(str || '').match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Health check called on app/modal load to report green/red ML Online status.
 */
export async function checkMLHealth() {
  const baseUrl = getMlBaseUrl();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/health`, { method: 'GET' }, HEALTH_TIMEOUT_MS);
    if (!res.ok) {
      return { online: false, modelsLoaded: false, status: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const online = Boolean(data?.status === 'ok' && data?.models_loaded);
    return {
      online,
      modelsLoaded: Boolean(data?.models_loaded),
      models: data?.models || {},
      easyocrAvailable: Boolean(data?.easyocr_available),
      trainingInProgress: Boolean(data?.training_in_progress),
      status: data?.status || (online ? 'ok' : 'models_missing'),
    };
  } catch (err) {
    return {
      online: false,
      modelsLoaded: false,
      status: err?.name === 'AbortError' ? 'timeout' : 'offline',
    };
  }
}

/**
 * Optional EasyOCR endpoint (`POST /api/ml/ocr`).
 */
export async function extractTextWithEasyOCR(imageDataUrl) {
  const baseUrl = getMlBaseUrl();
  const res = await fetchWithTimeout(
    `${baseUrl}/ocr`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageDataUrl }),
    },
    EASYOCR_TIMEOUT_MS
  );

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('EasyOCR endpoint returned an invalid response.');
  }

  if (!res.ok) {
    throw new Error(data.detail || data.error || 'EasyOCR service is unavailable.');
  }

  return data;
}

/**
 * Enforces identical hard safety rules after either ML prediction or offline fallback:
 *  - isNonLabel OR 0 recognized ingredients (and 0 banned) -> blocked score (null)
 *  - < 2 recognized AND confidence < 0.45 (and 0 banned) -> blocked score (null)
 *  - banned_count > 0 -> cap at 20, verdict "BANNED / UNSAFE"
 *  - spiking_risk_probability >= 0.65 -> cap at 45
 *  - blend_transparency <= 0.35 -> subtract 10 pts
 */
export function enforcePostScoringRules(rawScore, ctx) {
  const {
    bannedCount = 0,
    spikingProb = 0,
    hasPropBlend = false,
    unrecognizedRatio = 0,
    ocrMatchConfidence = 1,
    recognizedCount = null,
    isNonLabel = false,
    baseWhy = [],
  } = ctx;

  const shouldBlock =
    isNonLabel ||
    (bannedCount === 0 && recognizedCount !== null && recognizedCount === 0) ||
    (bannedCount === 0 && recognizedCount !== null && recognizedCount < 2 && ocrMatchConfidence < 0.45) ||
    (bannedCount === 0 && recognizedCount === null && (unrecognizedRatio > 0.70 || ocrMatchConfidence < 0.30));

  if (shouldBlock) {
    const reasons = [...baseWhy];
    if (isNonLabel) {
      reasons.push({
        label: 'Non-label image detected',
        impact: 0,
        detail: "This doesn't look like a product label.",
      });
    } else if (recognizedCount === 0) {
      reasons.push({
        label: 'No supplement ingredients matched',
        impact: 0,
        detail: 'Not enough readable data — retake clear photo of the Ingredients box.',
      });
    } else {
      reasons.push({
        label: `Readable confidence ${Math.round(ocrMatchConfidence * 100)}%`,
        impact: 0,
        detail: 'Retake clear photo of the Ingredients box.',
      });
    }
    return {
      score: null,
      scoreBlocked: true,
      verdict: isNonLabel
        ? "This doesn't look like a product label"
        : 'Not enough readable data - retake photo',
      whyThisScore: reasons,
    };
  }

  let score = Math.max(0, Math.min(96, Math.round(Number(rawScore ?? 50))));
  const whyThisScore = [...baseWhy];

  const hasBlendPenaltyAlready = whyThisScore.some((w) =>
    String(w.label || '').toLowerCase().includes('proprietary blend')
  );
  if (hasPropBlend && !hasBlendPenaltyAlready) {
    score = Math.max(0, score - 10);
    whyThisScore.push({ label: 'Proprietary blend without disclosed doses', impact: -10 });
  }

  if (spikingProb >= 0.65) {
    if (score > 45) {
      whyThisScore.push({
        label: 'High amino-spiking cap (max 45)',
        impact: 45 - score,
      });
      score = 45;
    }
  }

  let forcedVerdict = null;
  if (bannedCount > 0) {
    if (score > 20) {
      whyThisScore.unshift({
        label: `${bannedCount} banned substance(s) detected (capped at 20)`,
        impact: 20 - score,
      });
      score = 20;
    }
    forcedVerdict = 'BANNED / UNSAFE';
  }

  return {
    score,
    scoreBlocked: false,
    verdict: forcedVerdict,
    whyThisScore,
  };
}

/**
 * Sends extracted ingredients + macros through:
 *  1) POST /api/ml/classify
 *  2) POST /api/ml/spiking
 *  3) POST /api/ml/score
 *
 * Also merges fuzzy banned/contamination screening (>= 0.85) and enforces conservative rules.
 */
export async function analyzeWithMLPipeline({ rawText, localResult }) {
  const baseUrl = getMlBaseUrl();
  const localIngredients = localResult.ingredientsList || [];

  try {
    const rawTokens = localIngredients.length > 0
      ? localIngredients.map((i) => i.matchedName || i.name).filter(Boolean)
      : String(rawText || '')
          .split(/[,;\n•|\t/:]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2);

    const unrecognizedRatio = typeof localResult.unrecognizedRatio === 'number'
      ? localResult.unrecognizedRatio
      : localIngredients.length > 0
      ? localIngredients.filter((i) => i.unrecognized).length / localIngredients.length
      : 1.0;

    const matchConfFrac =
      typeof localResult.ocrMeta?.combinedConfidence === 'number'
        ? localResult.ocrMeta.combinedConfidence / 100
        : typeof localResult.ocrMeta?.matchRate === 'number'
        ? localResult.ocrMeta.matchRate
        : unrecognizedRatio <= 0.4
        ? 0.9
        : 0.35;

    const recognizedLocalCount = localIngredients.filter((i) => !i.unrecognized).length;

    // Do not call ML /score to fabricate a score if genuinely empty or zero known tokens & no banned clues
    if (rawTokens.length === 0 || (recognizedLocalCount === 0 && (localResult.bannedSubstancesDetected?.length || 0) === 0 && unrecognizedRatio >= 1.0 && matchConfFrac < 0.30)) {
      return {
        ...localResult,
        purityScore: null,
        scoreBlocked: true,
        riskLevel: 'warning',
        verdict: 'Not enough readable data - retake photo',
        mlPowered: false,
        mlFallback: false,
        disclaimer: BANNED_LIST_DISCLAIMER,
      };
    }

    const macros = localResult.scanDetails?.macrosExtracted || {};
    const isZeroProteinCat =
      /Pre-Workout|Creatine|Intra-Workout|Fat Burner/i.test(localResult.category || '');
    const proteinVal =
      macros.proteinG ??
      (isZeroProteinCat ? 0 : parseOptionalNumber(localResult.claimedProtein));
    const servingVal =
      macros.servingSizeG ?? parseOptionalNumber(localResult.servingSize);
    const sugarVal =
      macros.sugarG ?? (isZeroProteinCat ? 0 : parseOptionalNumber(localResult.sugar));

    // Run /classify and /spiking concurrently
    const [classifyRes, spikingRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: rawTokens, raw_text: rawText || '' }),
      }),
      fetchWithTimeout(`${baseUrl}/spiking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: rawTokens,
          raw_text: rawText || '',
          claimed_protein_g: proteinVal ?? 0,
          serving_size_g: servingVal ?? 32,
          category: localResult.category || '',
        }),
      }),
    ]);

    if (!classifyRes.ok || !spikingRes.ok) {
      throw new Error('ML classification/spiking endpoint returned an error.');
    }

    const classifyData = await classifyRes.json();
    const spikingData = await spikingRes.json();

    const mlItems = classifyData.results || [];
    // Overlay strict banned & contamination check (>= 0.85 fuzzy threshold)
    const bannedScan = scanTextForBannedAndContamination(
      `${rawText || ''} ${localResult.rawText || ''}`,
      rawTokens
    );
    const localBannedList = localResult.bannedSubstancesDetected?.length
      ? localResult.bannedSubstancesDetected
      : bannedScan.bannedDetected;
    const localContamList = localResult.contaminationRisksDetected?.length
      ? localResult.contaminationRisksDetected
      : bannedScan.contaminationDetected;

    const mappedIngredientsList = mlItems.map((item, idx) => {
      const localMatch = localIngredients[idx] || {};
      const isLocalContam =
        localMatch.mlClass === 'contamination_risk' || localMatch.severity === 'contamination_risk';
      const isBanned =
        localMatch.mlClass === 'banned_wada' || item.class === 'banned_wada';

      const finalClass = isBanned
        ? 'banned_wada'
        : isLocalContam
        ? 'contamination_risk'
        : item.class;

      const isUnrecognized = Boolean(localMatch.unrecognized && !item.recognized);

      return {
        name: isUnrecognized ? item.ingredient : localMatch.name || item.ingredient,
        raw: localMatch.raw || item.ingredient,
        normalized: item.normalized,
        mlClass: finalClass,
        confidence: item.confidence,
        similarity: localMatch.similarity ?? null,
        correctionMade: localMatch.correctionMade ?? null,
        unrecognized: isUnrecognized,
        method: item.method,
        status:
          finalClass === 'banned_wada' || finalClass === 'harmful'
            ? 'danger'
            : finalClass === 'contamination_risk' || finalClass === 'neutral'
            ? 'warning'
            : 'safe',
        reason: isUnrecognized
          ? 'Unrecognized - tap to correct'
          : isBanned && localMatch.reason
          ? localMatch.reason
          : isLocalContam && localMatch.reason
          ? localMatch.reason
          : item.reason,
      };
    });

    const bannedCount = Math.max(
      classifyData.counts?.banned_wada || 0,
      mappedIngredientsList.filter((i) => i.mlClass === 'banned_wada').length,
      localBannedList.length
    );

    const harmfulItems = mappedIngredientsList.filter((i) => i.mlClass === 'harmful');
    const harmfulCount = harmfulItems.length + localContamList.length;
    const beneficialCount = mappedIngredientsList.filter((i) => i.mlClass === 'beneficial').length;
    const spikingProb = Number(spikingData.probability || 0);

    const artificialSweetenerCount = mappedIngredientsList.filter((item) => {
      const n = `${item.normalized || ''} ${item.name || ''}`.toLowerCase();
      return (
        n.includes('sucralose') ||
        n.includes('acesulfame') ||
        n.includes('ace-k') ||
        n.includes('aspartame') ||
        n.includes('saccharin') ||
        n.includes('neotame') ||
        n.includes('maltitol') ||
        n.includes('sorbitol')
      );
    }).length;

    const artificialColorCount = mappedIngredientsList.filter((item) => {
      const n = `${item.normalized || ''} ${item.name || ''}`.toLowerCase();
      return (
        n.includes('red 40') ||
        n.includes('red #40') ||
        n.includes('allura red') ||
        n.includes('yellow 5') ||
        n.includes('tartrazine') ||
        n.includes('yellow 6') ||
        n.includes('sunset yellow') ||
        n.includes('blue 1') ||
        n.includes('brilliant blue') ||
        n.includes('titanium dioxide')
      );
    }).length;

    const hasPropBlend =
      spikingData.features?.has_proprietary_blend === 1 ||
      (localResult.scanDetails?.proprietaryBlends?.length || 0) > 0;
    const blendTransparency = hasPropBlend ? 0.2 : 1.0;

    // For ingredient-only isolates/wheys without nutrition table printed, estimate macro proxy safely
    let scoreProtein = proteinVal;
    let scorePercent =
      proteinVal != null && servingVal != null
        ? Number(((proteinVal / Math.max(1, servingVal)) * 100).toFixed(2))
        : null;
    let scoreSugar = sugarVal;

    // Detect clean intact protein or sugary mass gainer clues if macros weren't on cropped ingredient label
    if (scoreProtein == null && !isZeroProteinCat) {
      const hasIsolate = mappedIngredientsList.some((i) =>
        /isolate|hydrolyzed whey/i.test(i.name || '')
      );
      const hasSugarFiller = mappedIngredientsList.some((i) =>
        /maltodextrin|dextrose|corn syrup|sucrose|fructose/i.test(i.name || '')
      );
      if (hasSugarFiller) {
        scoreProtein = 12;
        scorePercent = 28;
        scoreSugar = scoreSugar ?? 14;
      } else if (hasIsolate && harmfulCount === 0 && spikingProb < 0.25) {
        scoreProtein = 25;
        scorePercent = 83;
        scoreSugar = scoreSugar ?? 1;
      } else {
        // Conservative default treated as average/risk, NEVER safe isolate
        scoreProtein = 16;
        scorePercent = 48;
        scoreSugar = scoreSugar ?? 5;
      }
    } else if (isZeroProteinCat) {
      scoreProtein = scoreProtein ?? 0;
      scorePercent = 0;
      scoreSugar = scoreSugar ?? 0;
    }

    const scoreRes = await fetchWithTimeout(`${baseUrl}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        harmful_count: harmfulCount,
        banned_count: bannedCount,
        artificial_sweetener_count: artificialSweetenerCount,
        artificial_color_count: artificialColorCount,
        sugar_g: scoreSugar,
        protein_per_serving_g: scoreProtein,
        serving_size_g: servingVal ?? (isZeroProteinCat ? 12 : 34),
        protein_percent: scorePercent,
        spiking_risk_probability: spikingProb,
        blend_transparency: blendTransparency,
        unrecognized_ratio: unrecognizedRatio,
        ocr_match_confidence: matchConfFrac,
        recognized_count: mappedIngredientsList.filter((i) => !i.unrecognized).length,
        is_non_label: Boolean(localResult.isNonLabel),
      }),
    });

    if (!scoreRes.ok) {
      throw new Error('ML score regression endpoint returned an error.');
    }

    const scoreData = await scoreRes.json();
    const finalRecognizedCount = mappedIngredientsList.filter((i) => !i.unrecognized).length;

    // Re-run hard rule enforcement in JS too (ensures local fuzzy-caught SARMs/warnings also enforce <=20 / blocked)
    const enforced = scoreData.score_blocked
      ? {
          score: null,
          scoreBlocked: true,
          verdict: scoreData.verdict || 'Not enough readable data - retake photo',
          whyThisScore: scoreData.why_this_score || [],
        }
      : enforcePostScoringRules(scoreData.score, {
          bannedCount,
          spikingProb,
          hasPropBlend,
          unrecognizedRatio,
          ocrMatchConfidence: matchConfFrac,
          recognizedCount: finalRecognizedCount,
          isNonLabel: Boolean(localResult.isNonLabel),
          baseWhy: scoreData.why_this_score || [],
        });

    const mlScore = enforced.score;

    let riskLevel = 'safe';
    if (enforced.scoreBlocked || (harmfulCount > 0 && mlScore >= 46 && bannedCount === 0 && spikingProb < 0.65) || localContamList.length > 0) {
      riskLevel = bannedCount > 0 || spikingData.spiking_risk === 'high' || (mlScore !== null && mlScore < 50)
        ? 'danger'
        : 'warning';
    }
    if (bannedCount > 0 || spikingData.spiking_risk === 'high' || (mlScore !== null && mlScore < 50)) {
      riskLevel = 'danger';
    }

    let verdict = enforced.verdict;
    if (!verdict) {
      if (bannedCount > 0) {
        verdict = 'BANNED / UNSAFE';
      } else if (spikingData.spiking_risk === 'high') {
        verdict = `High Amino-Spiking Risk (${Math.round(spikingProb * 100)}%): ${spikingData.explanation}`;
      } else if (localContamList.length > 0) {
        verdict = `Contamination / Regulatory Caution: ${localContamList[0].name} detected alongside ${harmfulCount} risk item(s).`;
      } else if (harmfulCount > 0) {
        verdict = `ML Audit Notice: ${harmfulCount} harmful filler/additive ingredient(s) detected (${beneficialCount} beneficial).`;
      } else {
        verdict = `Clean ML Assay (${mlScore}/100): ${beneficialCount} beneficial ingredients verified with low spiking risk.`;
      }
    }

    return {
      ...localResult,
      purityScore: mlScore,
      scoreBlocked: enforced.scoreBlocked,
      riskLevel,
      verdict,
      whyThisScore: enforced.whyThisScore,
      bannedSubstancesDetected: localBannedList,
      contaminationRisksDetected: localContamList,
      ingredientsList:
        mappedIngredientsList.length > 0 ? mappedIngredientsList : localResult.ingredientsList,
      flags: {
        ...localResult.flags,
        aminoSpiking: spikingData.spiking_risk !== 'low',
        bannedSubstances: bannedCount > 0,
        contaminationRisk: localContamList.length > 0,
        fillerCount: harmfulCount,
        trueProteinRatio:
          spikingProb >= 0.65
            ? '~40-55%'
            : harmfulCount > 1
            ? '65-75%'
            : '88-94%',
      },
      mlPowered: true,
      mlFallback: false,
      mlClassifierModel: classifyData.model_used,
      mlCounts: classifyData.counts,
      mlIngredients: mlItems,
      mlSpiking: spikingData,
      mlScore: scoreData,
      disclaimer: BANNED_LIST_DISCLAIMER,
    };
  } catch (err) {
    return {
      ...localResult,
      mlPowered: false,
      mlFallback: true,
      mlFallbackReason:
        err?.name === 'AbortError'
          ? 'ML service timed out — using conservative built-in fallback scorer.'
          : 'ML service offline — using conservative built-in fallback scorer.',
    };
  }
}
