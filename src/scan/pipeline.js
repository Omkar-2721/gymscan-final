import { extractProductData } from './extractor.js';
import { normalizeExtractedIngredients } from './normalizer.js';
import { analyzeNormalizedProduct } from './analyzer.js';

export const PIPELINE_STAGES = [
  { id: 'Capturing', label: 'Capturing' },
  { id: 'Reading', label: 'Reading' },
  { id: 'Matching', label: 'Matching' },
  { id: 'Analyzing', label: 'Analyzing' },
  { id: 'Scoring', label: 'Scoring' },
];

/**
 * Step 1 of interactive scan: Capture -> Read (Gemini / Tesseract fallback) -> Match dictionary.
 * Pauses before analysis so the user can review and edit extracted fields if desired.
 */
export async function extractAndMatchPipeline({
  files = [],
  cropRect = null,
  barcode = null,
  manualText = '',
  manualProductName = '',
  fastMode = false,
  skipCache = false,
  onStageChange = null,
} = {}) {
  const notify = (stage, message) => {
    if (typeof onStageChange === 'function') onStageChange(stage, message);
  };

  notify('Capturing', 'Preparing label images & checking local scan cache...');
  notify('Reading', 'Reading printed ingredients & nutrition facts...');
  const extracted = await extractProductData({
    files,
    cropRect,
    barcode,
    manualText,
    manualProductName,
    fastMode,
    skipCache,
  });

  notify('Matching', 'Normalizing ingredients against 300+ supplement dictionary entries...');
  const normalized = normalizeExtractedIngredients(
    extracted.ingredients || [],
    extracted.proprietaryBlends || []
  );

  return { extracted, normalized };
}

/**
 * Step 2 of interactive scan: Re-match edited fields -> Deterministic Stage 4 Rules -> Score & Swaps.
 */
export async function scoreReviewedExtraction({
  extracted,
  healthProfile = {},
  useMLService = true,
  onStageChange = null,
} = {}) {
  const notify = (stage, message) => {
    if (typeof onStageChange === 'function') onStageChange(stage, message);
  };

  notify('Matching', 'Normalizing reviewed ingredient list...');
  const normalized = normalizeExtractedIngredients(
    extracted?.ingredients || [],
    extracted?.proprietaryBlends || []
  );

  notify('Analyzing', 'Checking banned substances, combinations, claim mismatches & health profile...');
  notify('Scoring', 'Computing deterministic purity score & Smart Swaps...');
  return analyzeNormalizedProduct({
    extracted,
    normalized,
    healthProfile,
    useMLService,
  });
}

/**
 * Full 5-stage end-to-end scan pipeline (used by live scans & automated test suite).
 */
export async function runFullScanPipeline(params = {}) {
  const { extracted, normalized } = await extractAndMatchPipeline(params);
  const notify = (stage, message) => {
    if (typeof params.onStageChange === 'function') params.onStageChange(stage, message);
  };

  notify('Analyzing', 'Checking banned substances, combinations, claim mismatches & health profile...');
  notify('Scoring', 'Computing deterministic purity score & Smart Swaps...');

  return analyzeNormalizedProduct({
    extracted,
    normalized,
    healthProfile: params.healthProfile || {},
    useMLService: params.useMLService ?? true,
  });
}
