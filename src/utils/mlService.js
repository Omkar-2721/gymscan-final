/**
 * Frontend Client for the GymScan Python FastAPI ML Service (/api/ml/*).
 * Falls back gracefully to the built-in heuristic scorer if the ML service is down.
 */

const ML_TIMEOUT_MS = 5000;
const EASYOCR_TIMEOUT_MS = 25000;

function fetchWithTimeout(url, options = {}, timeoutMs = ML_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

function parseFirstNumber(str, fallback) {
  if (typeof str === 'number' && !Number.isNaN(str)) return str;
  const match = String(str || '').match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : fallback;
}

/**
 * Optional EasyOCR endpoint (`POST /api/ml/ocr`).
 */
export async function extractTextWithEasyOCR(imageDataUrl) {
  const res = await fetchWithTimeout(
    '/api/ml/ocr',
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
 * Sends extracted ingredients + macros through:
 *  1) POST /api/ml/classify
 *  2) POST /api/ml/spiking
 *  3) POST /api/ml/score
 *
 * Returns an enriched scanResult with ML fields, or marks mlFallback=true if ML is offline.
 */
export async function analyzeWithMLPipeline({ rawText, localResult }) {
  try {
    const rawTokens = String(rawText || '')
      .split(/[,;\n•|\t/:]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);

    const ingredients =
      rawTokens.length > 0
        ? rawTokens
        : (localResult.ingredientsList || []).map((i) => i.name).filter(Boolean);

    if (ingredients.length === 0) {
      return {
        ...localResult,
        mlPowered: false,
        mlFallback: true,
        mlFallbackReason: 'No ingredient tokens available for ML classification.',
      };
    }

    const claimedProteinG = localResult.category?.includes('Pre-Workout')
      ? 0
      : parseFirstNumber(localResult.claimedProtein, 24);
    const servingSizeG = parseFirstNumber(localResult.servingSize, 32);
    const sugarG = parseFirstNumber(localResult.sugar, 1);

    // Run /classify and /spiking concurrently
    const [classifyRes, spikingRes] = await Promise.all([
      fetchWithTimeout('/api/ml/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, raw_text: rawText || '' }),
      }),
      fetchWithTimeout('/api/ml/spiking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          raw_text: rawText || '',
          claimed_protein_g: claimedProteinG,
          serving_size_g: servingSizeG,
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
    const counts = classifyData.counts || {};
    const harmfulCount = counts.harmful || 0;
    const bannedCount = counts.banned_wada || 0;
    const beneficialCount = counts.beneficial || 0;
    const spikingProb = Number(spikingData.probability || 0);

    const artificialAdditiveCount = mlItems.filter((item) => {
      const n = (item.normalized || '').toLowerCase();
      return (
        item.class === 'harmful' &&
        (n.includes('sucralose') ||
          n.includes('acesulfame') ||
          n.includes('aspartame') ||
          n.includes('saccharin') ||
          n.includes('red ') ||
          n.includes('yellow ') ||
          n.includes('blue ') ||
          n.includes('benzoate') ||
          n.includes('sorbate') ||
          n.includes('titanium'))
      );
    }).length;

    const hasPropBlend = spikingData.features?.has_proprietary_blend === 1;
    const blendTransparency = hasPropBlend ? 0.2 : 1.0;

    // Estimate intact EAA ratio from spiking probability & beneficial vs spiking tokens
    const aminoAcidRatio = Number(
      Math.max(0.25, Math.min(1.0, 0.96 - spikingProb * 0.55 - (harmfulCount > 2 ? 0.08 : 0))).toFixed(3)
    );

    const proteinPercent = Number(((claimedProteinG / Math.max(servingSizeG, 1)) * 100).toFixed(2));

    const scoreRes = await fetchWithTimeout('/api/ml/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protein_per_serving_g: claimedProteinG,
        serving_size_g: servingSizeG,
        protein_percent: proteinPercent,
        sugar_g: sugarG,
        amino_acid_ratio: aminoAcidRatio,
        blend_transparency: blendTransparency,
        number_of_harmful_ingredients: harmfulCount,
        number_of_banned_ingredients: bannedCount,
        artificial_additive_count: artificialAdditiveCount,
        spiking_risk_probability: spikingProb,
      }),
    });

    if (!scoreRes.ok) {
      throw new Error('ML score regression endpoint returned an error.');
    }

    const scoreData = await scoreRes.json();
    const mlScore = Number(scoreData.score ?? localResult.purityScore);

    // Map ML 4-class predictions back to legacy status too for backward compatibility
    const mappedIngredientsList = mlItems.map((item) => ({
      name: item.ingredient,
      normalized: item.normalized,
      mlClass: item.class,
      confidence: item.confidence,
      method: item.method,
      status:
        item.class === 'banned_wada' || item.class === 'harmful'
          ? 'danger'
          : item.class === 'neutral'
          ? 'warning'
          : 'safe',
      reason: item.reason,
    }));

    let riskLevel = 'safe';
    if (bannedCount > 0 || spikingData.spiking_risk === 'high' || mlScore < 55) {
      riskLevel = 'danger';
    } else if (harmfulCount > 0 || spikingData.spiking_risk === 'medium' || mlScore < 80) {
      riskLevel = 'warning';
    }

    let verdict = localResult.verdict;
    if (bannedCount > 0) {
      const bannedNames = mlItems
        .filter((i) => i.class === 'banned_wada')
        .slice(0, 2)
        .map((i) => i.ingredient)
        .join(', ');
      verdict = `Critical ML Alert: ${bannedCount} WADA-category prohibited substance(s) flagged (${bannedNames}).`;
    } else if (spikingData.spiking_risk === 'high') {
      verdict = `High Amino-Spiking Risk (${Math.round(spikingProb * 100)}%): ${spikingData.explanation}`;
    } else if (harmfulCount > 0) {
      verdict = `ML Audit Notice: ${harmfulCount} harmful filler/additive ingredient(s) detected (${beneficialCount} beneficial).`;
    } else {
      verdict = `Clean ML Assay (${mlScore}/100): ${beneficialCount} beneficial ingredients verified with low spiking risk.`;
    }

    return {
      ...localResult,
      purityScore: mlScore,
      riskLevel,
      verdict,
      ingredientsList: mappedIngredientsList.length > 0 ? mappedIngredientsList : localResult.ingredientsList,
      flags: {
        ...localResult.flags,
        aminoSpiking: spikingData.spiking_risk !== 'low',
        bannedSubstances: bannedCount > 0,
        fillerCount: harmfulCount,
        trueProteinRatio: `${Math.round(aminoAcidRatio * 100)}%`,
      },
      mlPowered: true,
      mlFallback: false,
      mlClassifierModel: classifyData.model_used,
      mlCounts: counts,
      mlIngredients: mlItems,
      mlSpiking: spikingData,
      mlScore: scoreData,
    };
  } catch (err) {
    return {
      ...localResult,
      mlPowered: false,
      mlFallback: true,
      mlFallbackReason:
        err?.name === 'AbortError'
          ? 'ML service timed out — using built-in heuristic scorer.'
          : 'ML service offline — using built-in heuristic fallback scorer.',
    };
  }
}
