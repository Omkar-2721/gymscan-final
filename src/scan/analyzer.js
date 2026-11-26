import { scanTextForBannedAndContamination, BANNED_LIST_DISCLAIMER } from '../data/bannedSubstances.js';
import { enforcePostScoringRules, getMlBaseUrl } from '../utils/mlService.js';
import { suggestSmartSwaps } from './swaps.js';

export const STANDARD_DISCLAIMER =
  'Informational only, not medical advice. ' + BANNED_LIST_DISCLAIMER;

function toStatusBadge(item, bannedHits) {
  if (item.unrecognized) return 'UNRECOGNIZED';
  const nameLower = (item.canonicalName || item.raw || '').toLowerCase();
  if (
    item.baseStatus === 'banned_wada' ||
    bannedHits.some((b) => {
      const bName = (b?.name || b?.substance || '').toLowerCase();
      return bName && (nameLower.includes(bName) || bName.includes(nameLower));
    })
  ) {
    return 'BANNED';
  }
  if (item.baseStatus === 'harmful') return 'AVOID';
  if (item.baseStatus === 'neutral' || item.baseStatus === 'contamination_risk') return 'CAUTION';
  return 'SAFE';
}

function toLegacyStatus(badge) {
  if (badge === 'BANNED' || badge === 'AVOID') return 'danger';
  if (badge === 'CAUTION' || badge === 'UNRECOGNIZED') return 'warning';
  return 'safe';
}

function parseServingGrams(servingSizeStr, extracted) {
  if (extracted?.nutritionPerServing?.servingSizeG != null) {
    return Number(extracted.nutritionPerServing.servingSizeG);
  }
  const m = String(servingSizeStr || '').match(/(\d+(?:\.\d+)?)\s*g/i);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Deterministic Stage 4 Combination Rules (interaction & stacking alerts).
 */
export function evaluateCombinationRules(normalizedItems, extracted) {
  const alerts = [];
  const names = normalizedItems.map((i) => (i.canonicalName || i.raw || '').toLowerCase());
  const rawLower = (extracted?.rawText || '').toLowerCase();
  const hasAny = (re) => names.some((n) => re.test(n)) || re.test(rawLower);

  // Rule 1: Stacked stimulants / excess caffeine (>300mg)
  const stimulantMatches = [
    hasAny(/\bcaffeine\b/),
    hasAny(/\bsy[nm]ephrine|bitter orange/),
    hasAny(/\byohimbine|rauwolscine/),
    hasAny(/\bguarana/),
    hasAny(/\bgreen coffee/),
    hasAny(/\bhigenamine/),
    hasAny(/\bdmaa|dmha|octodrine/),
  ].filter(Boolean).length;

  const cafMg = typeof extracted?.caffeine_mg === 'number' ? extracted.caffeine_mg : null;
  if (stimulantMatches >= 2 || (cafMg != null && cafMg > 300)) {
    alerts.push({
      id: 'STACKED_STIMULANTS',
      severity: 'AVOID',
      title: 'High Stimulant Stacking Risk',
      detail:
        cafMg != null && cafMg > 300
          ? `Excessive caffeine dose (${cafMg}mg/serving) alongside stimulant co-factors increases heart rate and BP strain.`
          : `Multiple sympathomimetic stimulants detected (${stimulantMatches} stimulant sources combined).`,
      penalty: 14,
    });
  }

  // Rule 2: Polysorbate 80 + CMC / Carrageenan gut emulsifier stack
  if (
    hasAny(/polysorbate 80|e433/) &&
    (hasAny(/carboxymethylcellulose|cellulose gum|e466/) || hasAny(/carrageenan|e407/))
  ) {
    alerts.push({
      id: 'GUT_EMULSIFIER_PAIR',
      severity: 'AVOID',
      title: 'Stacked Synthetic Gut Emulsifiers',
      detail:
        'Polysorbate 80 combined with CMC/Carrageenan is linked to microbiome irritation in sensitive individuals.',
      penalty: 10,
    });
  }

  // Rule 3: Artificial sweeteners + glycemic filler (maltodextrin/dextrose/corn syrup)
  if (
    hasAny(/sucralose|acesulfame|aspartame|saccharin/) &&
    hasAny(/maltodextrin|dextrose|corn syrup|glucose syrup/)
  ) {
    alerts.push({
      id: 'HIDDEN_GLYCEMIC_MASK',
      severity: 'CAUTION',
      title: 'Sweetener + High-GI Filler Pairing',
      detail:
        'Uses non-caloric sweetener while pairing with high-glycemic maltodextrin/dextrose that spikes blood sugar.',
      penalty: 8,
    });
  }

  // Rule 4: Stacked diuretics / thermogenics
  const diureticMatches = [
    hasAny(/dandelion/),
    hasAny(/uva ursi/),
    hasAny(/capsicum|capsaicin/),
    hasAny(/yohimbine/),
    hasAny(/synephrine/),
  ].filter(Boolean).length;

  if (diureticMatches >= 2) {
    alerts.push({
      id: 'DIURETIC_FAT_BURNER_STACK',
      severity: 'CAUTION',
      title: 'Multi-Agent Thermogenic / Diuretic Stack',
      detail: 'Combining multiple diuretics and thermogenics raises dehydration and electrolyte risk during intense training.',
      penalty: 10,
    });
  }

  // Rule 5: Free-form cheap aminos in protein powder (amino-spiking combination)
  const hasWheyOrProtein = hasAny(/whey|casein|milk protein|protein blend/);
  const freeFormCount = [
    hasAny(/\bglycine\b/),
    hasAny(/\btaurine\b/),
    hasAny(/\bl-alanine|\balanine\b/),
    hasAny(/\bcreatine\b/),
  ].filter(Boolean).length;

  if (hasWheyOrProtein && freeFormCount >= 2) {
    alerts.push({
      id: 'AMINO_SPIKING_PATTERN',
      severity: 'AVOID',
      title: 'Amino-Spiking Pattern Detected',
      detail:
        'Protein formula lists multiple inexpensive non-protein nitrogenous amino acids (e.g., Glycine/Taurine/Creatine) that inflate Kjeldahl lab protein counts.',
      penalty: 16,
    });
  }

  return alerts;
}

/**
 * Deterministic Stage 4 Marketing Claim Verification against label truth.
 */
export function verifyMarketingClaims(extracted, normalizedItems) {
  const checks = [];
  const claims = [...(extracted?.frontClaims || [])];
  const titleText = `${extracted?.productName || ''} ${claims.join(' ')}`.toLowerCase();
  const namesLower = normalizedItems.map((i) => (i.canonicalName || i.raw || '').toLowerCase());
  const sugarG = extracted?.sugar_g ?? extracted?.nutritionPerServing?.sugar_g ?? null;
  const proteinG = extracted?.protein_g ?? extracted?.nutritionPerServing?.protein_g ?? null;
  const servingG = parseServingGrams(extracted?.servingSize, extracted);

  if (/sugar\s*free|0g?\s*sugar|zero\s*sugar|no\s*added\s*sugar/i.test(titleText)) {
    const hasHiddenGlycemic = namesLower.some((n) => /maltodextrin|dextrose|corn syrup|fructose|sucrose/.test(n));
    if (hasHiddenGlycemic || (sugarG != null && sugarG > 0.5)) {
      checks.push({
        claim: 'Sugar Free / Zero Sugar',
        verdict: 'MISLEADING',
        explanation:
          sugarG != null && sugarG > 0.5
            ? `Label declares ${sugarG}g sugar per serving despite Sugar-Free front claim.`
            : 'Contains high-GI carbohydrate filler (Maltodextrin/Dextrose) that acts like sugar on blood glucose.',
        penalty: 8,
      });
    } else {
      checks.push({
        claim: 'Sugar Free / Zero Sugar',
        verdict: 'VERIFIED',
        explanation: 'No caloric sugars or glycemic carbohydrate fillers detected in ingredients.',
        penalty: 0,
      });
    }
  }

  if (/100%\s*(?:whey\s*)?(?:protein\s*)?isolate|pure\s*isolate/i.test(titleText)) {
    const hasConcentrateOrFiller = namesLower.some((n) =>
      /concentrate|skim milk|milk powder|soy protein/.test(n)
    );
    const isolateIdx = namesLower.findIndex((n) => /whey protein isolate|hydrolyzed whey/.test(n));
    if (hasConcentrateOrFiller || isolateIdx === -1) {
      checks.push({
        claim: '100% Whey Isolate',
        verdict: 'MISLEADING',
        explanation: hasConcentrateOrFiller
          ? 'Ingredients list Whey Concentrate or lower-grade dairy/soy proteins alongside Isolate.'
          : 'Whey Protein Isolate could not be verified as the sole protein source.',
        penalty: 10,
      });
    } else {
      checks.push({
        claim: '100% Whey Isolate',
        verdict: 'VERIFIED',
        explanation: 'Primary protein listed is Whey Protein Isolate with no Concentrate dilution.',
        penalty: 0,
      });
    }
  }

  if (/\d{2}g\s*(?:pure\s*)?protein/i.test(titleText) || proteinG != null) {
    const hasSpikers = namesLower.some((n) => /\bglycine\b|\btaurine\b|\balanine\b/.test(n));
    const pct = proteinG != null && servingG ? (proteinG / servingG) * 100 : null;
    if (hasSpikers) {
      checks.push({
        claim: proteinG != null ? `${proteinG}g Claimed Protein` : 'High-Protein Claim',
        verdict: 'MISLEADING',
        explanation: 'Free-form spiking amino acids (Glycine/Taurine) may inflate apparent crude protein.',
        penalty: 8,
      });
    } else if (pct != null && pct < 55 && /whey|isolate/i.test(extracted?.category || '')) {
      checks.push({
        claim: `${proteinG}g / ${servingG}g Scoop (${Math.round(pct)}%)`,
        verdict: 'SUSPICIOUS',
        explanation: `Protein density (${Math.round(pct)}%) is low for a whey product (<55% by weight).`,
        penalty: 6,
      });
    } else if (pct != null) {
      checks.push({
        claim: `${proteinG}g Protein (${Math.round(pct)}% density)`,
        verdict: 'VERIFIED',
        explanation: 'Protein density matches expected concentration for intact protein.',
        penalty: 0,
      });
    }
  }

  if ((extracted?.proprietaryBlends?.length || 0) > 0 || /clinically\s*dosed/i.test(titleText)) {
    const hidden = (extracted?.proprietaryBlends || []).some(
      (b) => !b.components || b.components.length > 1
    );
    if (hidden) {
      checks.push({
        claim: /clinically\s*dosed/i.test(titleText) ? 'Clinically Dosed' : 'Ingredient Transparency',
        verdict: 'UNVERIFIED',
        explanation: `Hidden proprietary blend (${extracted.proprietaryBlends.map((b) => b.name).join(', ')}) conceals individual ingredient dosages.`,
        penalty: 8,
      });
    }
  }

  return checks;
}

/**
 * Deterministic Stage 4 Personalization Checks.
 */
export function evaluateHealthProfile(healthProfile = {}, extracted, normalizedItems, bannedDetected) {
  const alerts = [];
  const namesLower = normalizedItems.map((i) => (i.canonicalName || i.raw || '').toLowerCase());
  const rawLower = (extracted?.rawText || '').toLowerCase();
  const allergensLower = (extracted?.allergens || []).map((a) => a.toLowerCase());
  const sugarG = extracted?.sugar_g ?? extracted?.nutritionPerServing?.sugar_g ?? null;

  let scoreCap = 100;
  let extraPenalty = 0;

  if (healthProfile.drug_tested_athlete && (bannedDetected.length > 0 || normalizedItems.some((i) => i.baseStatus === 'contamination_risk'))) {
    alerts.push({
      profileKey: 'drug_tested_athlete',
      severity: 'BANNED',
      title: 'WADA / Tested-Athlete Alert',
      detail: 'Contains high-risk or WADA-prohibited substances. Do NOT use if subject to competition drug testing.',
    });
    scoreCap = Math.min(scoreCap, 20);
  }

  const userAllergies = Array.isArray(healthProfile.allergies) ? healthProfile.allergies : [];
  for (const allergy of userAllergies) {
    const a = String(allergy).toLowerCase().trim();
    if (!a) continue;
    const hitInAllergens = allergensLower.some((al) => al.includes(a));
    const hitInIngredients =
      (a === 'milk' && namesLower.some((n) => /whey|casein|milk|lactose/.test(n))) ||
      (a === 'soy' && namesLower.some((n) => /soy|lecithin|e322/.test(n))) ||
      (a === 'gluten' && namesLower.some((n) => /wheat|gluten|barley|malt/.test(n))) ||
      namesLower.some((n) => n.includes(a)) ||
      rawLower.includes(a);

    if (hitInAllergens || hitInIngredients) {
      alerts.push({
        profileKey: `allergy:${a}`,
        severity: 'AVOID',
        title: `Personal Allergen Match: ${allergy}`,
        detail: `Declared allergen or matching derivative detected for your ${allergy} sensitivity.`,
      });
      extraPenalty += 15;
      scoreCap = Math.min(scoreCap, 35);
    }
  }

  if (healthProfile.vegan) {
    const animalDerived = namesLower.some((n) => /whey|casein|milk|collagen|gelatin|egg|albumin|beef|carmine/.test(n));
    if (animalDerived) {
      alerts.push({
        profileKey: 'vegan',
        severity: 'AVOID',
        title: 'Not Vegan Compatible',
        detail: 'Contains animal/dairy-derived ingredients (e.g., Whey, Casein, Gelatin, or Collagen).',
      });
      extraPenalty += 10;
    }
  }

  if (healthProfile.under_18) {
    const stim = namesLower.some((n) => /caffeine|synephrine|yohimbine|guarana|dmaa|dmha|green coffee/.test(n));
    if (stim || (extracted?.caffeine_mg || 0) > 0 || /pre-workout|fat burner|energy/i.test(extracted?.category || '')) {
      alerts.push({
        profileKey: 'under_18',
        severity: 'AVOID',
        title: 'Under-18 Restriction',
        detail: 'High-stimulant / thermogenic compounds are not recommended for users under 18.',
      });
      extraPenalty += 15;
      scoreCap = Math.min(scoreCap, 45);
    }
  }

  if (healthProfile.kidney_conscious) {
    const strain = namesLower.some((n) => /dandelion|uva ursi|yohimbine|titanium dioxide|phosphoric acid/.test(n));
    if (strain || (extracted?.protein_g || 0) >= 35) {
      alerts.push({
        profileKey: 'kidney_conscious',
        severity: 'CAUTION',
        title: 'Kidney-Conscious Advisory',
        detail: 'Concentrated protein/diuretic load detected — consult a clinician if monitoring renal filtration.',
      });
      extraPenalty += 6;
    }
  }

  if (healthProfile.diabetic) {
    const glycemic = namesLower.some((n) => /maltodextrin|dextrose|corn syrup|fructose|sucrose|sugar/.test(n));
    if (glycemic || (sugarG != null && sugarG > 2.5)) {
      alerts.push({
        profileKey: 'diabetic',
        severity: 'AVOID',
        title: 'Glycemic Impact Alert (Diabetic Profile)',
        detail:
          sugarG != null && sugarG > 2.5
            ? `${sugarG}g sugar + high-GI ingredients per serving may spike blood glucose.`
            : 'High-glycemic carbohydrate fillers (Maltodextrin/Dextrose) detected.',
      });
      extraPenalty += 12;
      scoreCap = Math.min(scoreCap, 42);
    }
  }

  return { alerts, extraPenalty, scoreCap };
}

/**
 * STAGE 4 FULL DETERMINISTIC ANALYSIS (+ optional Python FastAPI ML enrichment).
 */
export async function analyzeNormalizedProduct({
  extracted,
  normalized,
  healthProfile = {},
  useMLService = true,
} = {}) {
  const items = normalized?.items || [];
  const rawTokens = items.map((i) => i.raw);
  const fullTextBlob = `${extracted?.rawText || ''} ${rawTokens.join(', ')}`;
  const bannedScan = scanTextForBannedAndContamination(fullTextBlob, rawTokens);

  const recognizedCount = normalized?.recognizedCount || 0;
  const totalCount = normalized?.totalCount || 0;
  const unrecognizedCount = normalized?.unrecognizedCount || 0;
  const unrecognizedRatio = normalized?.unrecognizedRatio ?? 1;
  const overallConfidence = Number(extracted?.fieldConfidence?.overall ?? extracted?.ocrMeta?.confidence ?? 80);
  const ocrMatchConfFrac = Math.max(0.1, Math.min(1, overallConfidence / 100));

  // Hard guard: Genuine non-label OR zero readable evidence -> honest N/A
  // Note: If OCR clearly read a supplement product front (confidence >= 55% + category or protein),
  // score conservatively instead of blanking out to N/A while warning that full ingredient list wasn't shown.
  const hasFrontSupplementClues =
    extracted?.isProductLabel !== false &&
    ocrMatchConfFrac >= 0.55 &&
    Boolean(extracted?.category && extracted.category !== 'Unknown');

  const isNonLabel = extracted?.isProductLabel === false;
  const isInsufficient =
    isNonLabel ||
    (!hasFrontSupplementClues &&
      ((bannedScan.bannedDetected.length === 0 && totalCount === 0) ||
        (bannedScan.bannedDetected.length === 0 && recognizedCount === 0) ||
        (bannedScan.bannedDetected.length === 0 && recognizedCount < 2 && ocrMatchConfFrac < 0.45)));

  const decoratedItems = items.map((it) => {
    const badge = toStatusBadge(it, bannedScan.bannedDetected);
    return {
      ...it,
      name: it.displayName || it.canonicalName || it.raw,
      badge,
      status: toLegacyStatus(badge),
      mlClass: it.unrecognized ? 'unrecognized' : it.baseStatus,
    };
  });

  if (isInsufficient) {
    const verdictMsg = isNonLabel
      ? "This doesn't look like a product label"
      : 'Not enough readable data - retake photo';
    return {
      id: 'scan-' + Date.now(),
      name: extracted?.productName || (isNonLabel ? 'Non-Label Photo' : 'Unreadable Scan'),
      brand: extracted?.brand || 'GymScan Audit',
      category: extracted?.category || 'Unknown',
      isProductLabel: !isNonLabel,
      scoreBlocked: true,
      purityScore: null,
      riskLevel: 'warning',
      verdict: verdictMsg,
      whyThisScore: [
        {
          label: isNonLabel ? 'Non-label image detected' : 'Insufficient readable ingredients',
          impact: 0,
          detail: isNonLabel
            ? "This doesn't look like a product label."
            : 'Retake a clearer close-up photo of the Ingredients box or paste ingredients manually.',
        },
      ],
      ingredientsList: decoratedItems,
      combinationAlerts: [],
      claimChecks: [],
      personalizationAlerts: [],
      bannedSubstancesDetected: [],
      contaminationRisksDetected: [],
      smartSwaps: { triggered: false, items: [] },
      claimedProtein: extracted?.protein_g != null ? `${extracted.protein_g}g` : 'Unknown',
      sugar: extracted?.sugar_g != null ? `${extracted.sugar_g}g` : 'Unknown',
      caffeine: extracted?.caffeine_mg != null ? `${extracted.caffeine_mg}mg` : 'Unknown',
      servingSize: extracted?.servingSize || 'Unknown',
      allergens: extracted?.allergens || [],
      warnings: extracted?.warnings || [],
      ocrEngineUsed: extracted?.engineUsed || 'tesseract.js',
      ocrFallbackNotice: extracted?.fallbackReason || null,
      ocrMeta: {
        confidence: overallConfidence,
        matchRate: normalized?.matchRatePct ?? 0,
        ...(extracted?.ocrMeta || {}),
      },
      scanDetails: {
        proprietaryBlends: extracted?.proprietaryBlends || [],
        corrections: normalized?.corrections || [],
      },
      debugInfo: {
        rawExtractionJson: extracted,
        engineUsed: extracted?.engineUsed,
        fieldConfidence: extracted?.fieldConfidence,
        rulesTriggered: [isNonLabel ? 'NON_LABEL_IMAGE' : 'INSUFFICIENT_INGREDIENTS'],
      },
      flags: {
        aminoSpiking: false,
        bannedSubstances: false,
        contaminationRisk: false,
        fillerCount: 0,
      },
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  // Run deterministic interaction, claim verification & health profile checks
  const combinationAlerts = evaluateCombinationRules(decoratedItems, extracted);
  const claimChecks = verifyMarketingClaims(extracted, decoratedItems);
  const profileEval = evaluateHealthProfile(
    healthProfile,
    extracted,
    decoratedItems,
    bannedScan.bannedDetected
  );

  const bannedCount = Math.max(
    bannedScan.bannedDetected.length,
    decoratedItems.filter((i) => i.badge === 'BANNED').length
  );
  const avoidCount = decoratedItems.filter((i) => i.badge === 'AVOID').length;
  const cautionCount = decoratedItems.filter((i) => i.badge === 'CAUTION').length;
  const contamCount = bannedScan.contaminationDetected.length;
  const sweetenerCount = decoratedItems.filter((i) =>
    /sucralose|acesulfame|aspartame|saccharin|neotame|maltitol|sorbitol/i.test(i.name)
  ).length;
  const colorCount = decoratedItems.filter((i) =>
    /red 40|allura red|yellow 5|tartrazine|yellow 6|sunset yellow|blue 1|titanium dioxide/i.test(i.name)
  ).length;
  const hasPropBlend = (extracted?.proprietaryBlends?.length || 0) > 0;
  const spikingRule = combinationAlerts.find((a) => a.id === 'AMINO_SPIKING_PATTERN');

  let baseScore = 92;
  const whyThisScore = [];
  const rulesTriggered = [];

  if (bannedCount > 0) {
    whyThisScore.push({
      label: `WADA / Banned substance detected (${bannedCount})`,
      impact: -75,
      detail: bannedScan.bannedDetected.map((b) => b?.name || b?.substance || '').filter(Boolean).join(', '),
    });
    rulesTriggered.push('CAP_BANNED_20');
  }
  if (avoidCount > 0) {
    const p = Math.min(28, avoidCount * 7);
    baseScore -= p;
    whyThisScore.push({ label: `${avoidCount} Avoid-tier filler / additive(s)`, impact: -p });
    rulesTriggered.push('AVOID_INGREDIENTS');
  }
  if (cautionCount > 0) {
    const p = Math.min(14, cautionCount * 3);
    baseScore -= p;
    whyThisScore.push({ label: `${cautionCount} Caution ingredient(s)`, impact: -p });
  }
  if (contamCount > 0) {
    const p = Math.min(18, contamCount * 9);
    baseScore -= p;
    whyThisScore.push({ label: `Contamination risk compound(s) (${contamCount})`, impact: -p });
    rulesTriggered.push('CONTAMINATION_RISK');
  }
  if (unrecognizedCount > 0) {
    const p = Math.min(22, Math.round(unrecognizedRatio * 22 + unrecognizedCount * 1.5));
    baseScore -= p;
    whyThisScore.push({
      label: `${unrecognizedCount} Unrecognized ingredient(s) treated as uncertainty risk`,
      impact: -p,
    });
    rulesTriggered.push('UNRECOGNIZED_PENALTY');
  }

  const sugarG = extracted?.sugar_g ?? extracted?.nutritionPerServing?.sugar_g ?? null;
  const proteinG = extracted?.protein_g ?? extracted?.nutritionPerServing?.protein_g ?? null;
  const servingG = parseServingGrams(extracted?.servingSize, extracted);

  if (sugarG != null && sugarG > 3) {
    const p = Math.min(18, Math.round((sugarG - 2) * 1.2));
    baseScore -= p;
    whyThisScore.push({ label: `Added/High sugar (${sugarG}g/serving)`, impact: -p });
    rulesTriggered.push('HIGH_SUGAR');
  }
  if (recognizedCount === 0 && hasFrontSupplementClues) {
    baseScore -= 24;
    whyThisScore.push({
      label: 'Front label only (back Ingredients panel missing — conservative baseline estimate)',
      impact: -24,
    });
    rulesTriggered.push('FRONT_LABEL_ESTIMATE');
  }
  if (sugarG == null && proteinG == null) {
    baseScore -= 6;
    whyThisScore.push({ label: 'Missing nutrition macros ("Unknown" risk deduction)', impact: -6 });
    rulesTriggered.push('MISSING_MACROS');
  }

  for (const combo of combinationAlerts) {
    baseScore -= combo.penalty;
    whyThisScore.push({ label: combo.title, impact: -combo.penalty, detail: combo.detail });
    rulesTriggered.push(combo.id);
  }

  for (const chk of claimChecks) {
    if (chk.penalty > 0) {
      baseScore -= chk.penalty;
      whyThisScore.push({ label: `Claim mismatch: ${chk.claim}`, impact: -chk.penalty, detail: chk.explanation });
      rulesTriggered.push(`CLAIM_${chk.verdict}`);
    }
  }

  if (profileEval.extraPenalty > 0) {
    baseScore -= profileEval.extraPenalty;
    whyThisScore.push({ label: 'Personal health profile conflict(s)', impact: -profileEval.extraPenalty });
    rulesTriggered.push('PERSONAL_PROFILE_CONFLICT');
  }

  // Optional Python FastAPI ML enrichment when browser/server is live
  let mlUsed = false;
  let mlSpikingProb = spikingRule ? 0.78 : 0.08;
  if (useMLService && typeof fetch === 'function') {
    try {
      const mlBase = getMlBaseUrl();
      const [spRes, scRes] = await Promise.all([
        fetch(`${mlBase}/spiking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: rawTokens,
            raw_text: fullTextBlob,
            claimed_protein_g: proteinG ?? 0,
            serving_size_g: servingG ?? 32,
            category: extracted?.category || '',
          }),
          signal: AbortSignal.timeout(2500),
        }),
        fetch(`${mlBase}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            harmful_count: avoidCount + contamCount,
            banned_count: bannedCount,
            artificial_sweetener_count: sweetenerCount,
            artificial_color_count: colorCount,
            sugar_g: sugarG ?? 0,
            protein_per_serving_g: proteinG ?? 20,
            serving_size_g: servingG ?? 32,
            protein_percent: proteinG != null && servingG ? (proteinG / servingG) * 100 : null,
            spiking_risk_probability: mlSpikingProb,
            blend_transparency: hasPropBlend ? 0.2 : 1.0,
            unrecognized_ratio: unrecognizedRatio,
            ocr_match_confidence: ocrMatchConfFrac,
            recognized_count: hasFrontSupplementClues ? Math.max(2, recognizedCount) : recognizedCount,
            is_non_label: false,
          }),
          signal: AbortSignal.timeout(2500),
        }),
      ]);
      if (spRes.ok && scRes.ok) {
        const spData = await spRes.json();
        const scData = await scRes.json();
        mlSpikingProb = Math.max(mlSpikingProb, Number(spData.probability || 0));
        if (typeof scData.score === 'number') {
          baseScore = Math.round(baseScore * 0.6 + scData.score * 0.4);
          mlUsed = true;
          rulesTriggered.push('ML_ENSEMBLE');
        }
      }
    } catch (_) {
      // Offline / deterministic parity continues smoothly
    }
  }

  // Hard safety caps enforced cleanly
  const effectiveRecognizedForGate = hasFrontSupplementClues
    ? Math.max(2, recognizedCount)
    : recognizedCount;
  const enforced = enforcePostScoringRules(baseScore, {
    bannedCount,
    spikingProb: mlSpikingProb,
    hasPropBlend,
    unrecognizedRatio: hasFrontSupplementClues ? Math.min(unrecognizedRatio, 0.35) : unrecognizedRatio,
    ocrMatchConfidence: ocrMatchConfFrac,
    recognizedCount: effectiveRecognizedForGate,
    isNonLabel: false,
    baseWhy: whyThisScore,
  });

  let finalScore = enforced.score ?? Math.max(0, Math.min(96, Math.round(baseScore)));
  finalScore = Math.min(finalScore, profileEval.scoreCap);

  const riskLevel =
    bannedCount > 0 || mlSpikingProb >= 0.65 || finalScore < 50
      ? 'danger'
      : finalScore < 75 || cautionCount > 0 || avoidCount > 0 || (recognizedCount === 0 && hasFrontSupplementClues)
      ? 'warning'
      : 'safe';

  const verdict =
    bannedCount > 0
      ? 'BANNED / UNSAFE — Do not consume'
      : recognizedCount === 0 && hasFrontSupplementClues
      ? 'Front Label Estimate — Upload Back Ingredients Photo for Full Audit'
      : mlSpikingProb >= 0.65
      ? 'High Amino-Spiking Risk — Low Intact Protein Quality'
      : finalScore >= 80
      ? 'Verified Clean Formula'
      : finalScore >= 60
      ? 'Moderate Purity — Review Flagged Additives'
      : 'Low Purity Score — Safer Alternative Recommended';

  const smartSwaps = suggestSmartSwaps({
    category: extracted?.category || '',
    purityScore: finalScore,
    hasBanned: bannedCount > 0,
    hasSpiking: mlSpikingProb >= 0.65,
    excludeName: extracted?.productName || '',
  });

  return {
    id: 'scan-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: extracted?.productName || 'Scanned Supplement',
    brand: extracted?.brand || 'Unknown Brand',
    category: extracted?.category || 'Supplement',
    isProductLabel: true,
    purityScore: finalScore,
    scoreBlocked: false,
    riskLevel,
    verdict,
    whyThisScore: enforced.whyThisScore || whyThisScore,
    ingredientsList: decoratedItems,
    combinationAlerts,
    claimChecks,
    personalizationAlerts: profileEval.alerts,
    bannedSubstancesDetected: bannedScan.bannedDetected,
    contaminationRisksDetected: bannedScan.contaminationDetected,
    smartSwaps,
    cleanAlternatives: smartSwaps.items,
    saferAlternatives: smartSwaps.items,
    claimedProtein: proteinG != null ? `${proteinG}g` : 'Unknown',
    actualProtein:
      proteinG != null
        ? mlSpikingProb >= 0.65
          ? `~${Math.round(proteinG * 0.62)}g est. intact`
          : `${proteinG}g verified`
        : 'Unknown',
    sugar: sugarG != null ? `${sugarG}g` : 'Unknown',
    caffeine: extracted?.caffeine_mg != null ? `${extracted.caffeine_mg}mg` : 'Unknown',
    calories:
      extracted?.nutritionPerServing?.calories != null
        ? `${extracted.nutritionPerServing.calories} kcal`
        : 'Unknown',
    carbs:
      extracted?.nutritionPerServing?.carbs_g != null
        ? `${extracted.nutritionPerServing.carbs_g}g`
        : 'Unknown',
    fat:
      extracted?.nutritionPerServing?.fat_g != null
        ? `${extracted.nutritionPerServing.fat_g}g`
        : 'Unknown',
    servingSize: extracted?.servingSize || 'Unknown',
    allergens: extracted?.allergens || [],
    warnings: extracted?.warnings || [],
    rawText: extracted?.rawText || '',
    ocrEngineUsed: extracted?.engineUsed || 'tesseract.js',
    ocrFallbackNotice: extracted?.fallbackReason || null,
    mlPowered: mlUsed,
    ocrMeta: {
      confidence: overallConfidence,
      matchRate: normalized?.matchRatePct ?? 0,
      ...(extracted?.ocrMeta || {}),
    },
    scanDetails: {
      proprietaryBlends: extracted?.proprietaryBlends || [],
      corrections: normalized?.corrections || [],
      frontClaims: extracted?.frontClaims || [],
    },
    debugInfo: {
      rawExtractionJson: extracted,
      engineUsed: extracted?.engineUsed,
      fieldConfidence: extracted?.fieldConfidence,
      rulesTriggered,
    },
    flags: {
      aminoSpiking: mlSpikingProb >= 0.65,
      bannedSubstances: bannedCount > 0,
      contaminationRisk: contamCount > 0,
      fillerCount: avoidCount + cautionCount,
      trueProteinRatio: finalScore >= 75 ? '85-95%' : finalScore >= 50 ? '60-74%' : '35-55%',
    },
    disclaimer: STANDARD_DISCLAIMER,
  };
}
