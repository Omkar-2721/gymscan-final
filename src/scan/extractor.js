import { preprocessImageInBrowser } from '../utils/imagePreprocess.js';
import {
  recognizeWithVariants,
  parseLabelAndMatch,
  extractMacrosFromOCR,
  normalizeOcrToken,
} from '../utils/ocrEngine.js';
import {
  detectBarcodeFromCanvasOrImage,
  lookupBarcodeOpenFoodFacts,
} from '../utils/barcodeScanner.js';
import { RAW_CATALOG_ITEMS } from '../data/supplementCatalog.js';
import { computeScanHash, getCachedExtraction, setCachedExtraction } from './cache.js';

const GENERIC_FILENAMES = new Set([
  'shopping',
  'download',
  'downloads',
  'image',
  'img',
  'photo',
  'picture',
  'pic',
  'screenshot',
  'untitled',
  'camera',
  'scan',
  'file',
  'upload',
  'product',
  'whatsapp image',
]);

function cleanProductHint(hint) {
  const s = String(hint || '').trim();
  if (!s) return null;
  const low = s.toLowerCase().replace(/\d+/g, '').trim();
  if (!low || GENERIC_FILENAMES.has(s.toLowerCase()) || GENERIC_FILENAMES.has(low)) {
    return null;
  }
  return s;
}

const FRONT_LABEL_CATALOG_PATTERNS = [
  { id: 'cat-mb-biozyme-isozero', patterns: ['biozyme iso', 'iso-zero', 'iso zero'] },
  { id: 'cat-mb-biozyme-performance', patterns: ['biozyme', 'muscleblaze', 'mb performance', 'mb whey', 'mb'] },
  { id: 'cat-on-gold-standard', patterns: ['gold standard', 'optimum nutrition'] },
  { id: 'cat-dymatize-iso100', patterns: ['iso100', 'iso-100', 'dymatize'] },
  { id: 'cat-isopure-zero-carb', patterns: ['isopure', 'zero carb'] },
  { id: 'cat-myprotein-impact-whey', patterns: ['myprotein', 'impact whey'] },
  { id: 'cat-gnc-pro-whey', patterns: ['pro performance', 'gnc'] },
  { id: 'cat-avvatar-whey', patterns: ['avvatar'] },
  { id: 'cat-twt-unflavored-isolate', patterns: ['whole truth'] },
  { id: 'cat-nakpro-platinum-stevia', patterns: ['nakpro'] },
  { id: 'cat-asitis-raw-whey', patterns: ['as-it-is', 'asitis', 'atom'] },
  { id: 'cat-fastup-plant-isolate', patterns: ['fast&up', 'fast and up'] },
  { id: 'cat-creapure-german', patterns: ['creapure'] },
  { id: 'cat-mb-creamp', patterns: ['creamp'] },
  { id: 'cat-yogabar-almond', patterns: ['yogabar', 'yoga bar'] },
  { id: 'cat-ritebite-choco', patterns: ['ritebite', 'max protein'] },
];

function matchFrontLabelCatalog(rawText) {
  const lower = ` ${normalizeOcrToken(rawText || '').toLowerCase()} `;
  // Require at least one genuine supplement domain word or iconic SKU name
  const hasDomain = /\b(whey|protein|isolate|creatine|biozyme|iso100|gold standard|creapure|mass|gainer|pre|bcaa|nutrition|bar)\b/i.test(lower);
  if (!hasDomain) return null;

  for (const rule of FRONT_LABEL_CATALOG_PATTERNS) {
    const hit = rule.patterns.some((p) => {
      if (p.length <= 3) return new RegExp(`\\b${p}\\b`, 'i').test(lower);
      return lower.includes(p);
    });
    if (hit) {
      const item = RAW_CATALOG_ITEMS.find((c) => c.id === rule.id);
      if (item) return item;
    }
  }
  return null;
}

const EXTRACT_TIMEOUT_MS = 18000;

const KNOWN_BRAND_HINTS = [
  'Optimum Nutrition',
  'MuscleBlaze',
  'Dymatize',
  'MyProtein',
  'GNC',
  'The Whole Truth',
  'Isopure',
  'Avvatar',
  'Nakpro',
  'AS-IT-IS',
  'Quest Nutrition',
  'RiteBite Max Protein',
  'Yogabar',
  'Cellucor',
  'BSN',
  'Ghost',
  'MuscleTech',
  'BigMuscles',
  'Fast&Up',
  'Wellbeing Nutrition',
];

function inferCategoryFromText(text) {
  const lower = (text || '').toLowerCase();
  if (/pre[\s-]*workout|citrulline|beta[\s-]*alanine|caffeine anhydrous|dmaa|dmha/.test(lower)) {
    return 'Pre-Workout';
  }
  if (/mass gainer|weight gainer|serious mass|super mass/.test(lower)) {
    return 'Mass Gainer';
  }
  if (/creatine monohydrate|creapure|micronized creatine/.test(lower)) {
    return 'Creatine';
  }
  if (/bcaa|essential amino|eaa|intra[\s-]*workout/.test(lower)) {
    return 'BCAA / Intra-Workout';
  }
  if (/fat burner|thermogenic|l-carnitine|synephrine|yohimbine/.test(lower)) {
    return 'Fat Burner';
  }
  if (/protein bar|rolled oats|cocoa butter|dates/.test(lower)) {
    return 'Protein Bar';
  }
  if (/energy drink|taurine.*caffeine|carbonated water.*caffeine/.test(lower)) {
    return 'Energy Drink';
  }
  if (/whey.*isolate|hydrolyzed whey isolate/.test(lower)) {
    return 'Whey Isolate';
  }
  if (/whey|casein|pea protein|soy protein/.test(lower)) {
    return 'Whey Blend';
  }
  return null;
}

export function extractMetadataFromText(rawText, productHint = null) {
  const clean = normalizeOcrToken(rawText || '');
  const lower = clean.toLowerCase();

  const frontClaims = [];
  if (/\bsugar\s*free\b|\b0\s*g?\s*sugar\b|\bzero\s*sugar\b|\bno\s*added\s*sugar\b/i.test(lower)) {
    frontClaims.push('Sugar Free');
  }
  if (/100%\s*(?:whey\s*)?(?:protein\s*)?isolate|\bpure\s*isolate\b/i.test(lower)) {
    frontClaims.push('100% Whey Isolate');
  }
  if (/clinically\s*dosed|full\s*transparency|transparent\s*label/i.test(lower)) {
    frontClaims.push('Clinically Dosed');
  }
  const proteinClaimMatch = lower.match(/(\d{2})\s*g\s*(?:pure\s*)?protein/);
  if (proteinClaimMatch) {
    frontClaims.push(`${proteinClaimMatch[1]}g Protein`);
  }

  let caffeineMg = null;
  const cafMatch = lower.match(/caffeine[^0-9\n]{0,20}(\d{2,4})\s*mg\b/i);
  if (cafMatch) {
    caffeineMg = parseInt(cafMatch[1], 10);
  }

  const allergens = [];
  if (/\bmilk\b|\bwhey\b|\bcasein\b|\blactose\b/.test(lower)) allergens.push('Milk');
  if (/\bsoy\b|\bsoya\b/.test(lower)) allergens.push('Soy');
  if (/\bgluten\b|\bwheat\b/.test(lower)) allergens.push('Gluten');
  if (/\bpeanut\b|\btree nut\b|\balmond\b|\bhazelnut\b/.test(lower)) allergens.push('Nuts');
  if (/\begg\b|\balbumin\b/.test(lower)) allergens.push('Eggs');

  const warnings = [];
  const warnMatch = clean.match(/warn[i1l]ng[s]?\s*[:\-]?\s*([^\n]{10,180})/i);
  if (warnMatch) warnings.push(warnMatch[1].trim());
  if (/not recommended for children|18\+|under 18|pregnant|nursing/i.test(lower)) {
    warnings.push('Not intended for individuals under 18, pregnant, or nursing women.');
  }

  let brand = null;
  for (const candidate of KNOWN_BRAND_HINTS) {
    if (lower.includes(candidate.toLowerCase())) {
      brand = candidate;
      break;
    }
  }

  const firstLines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && !/^(ingredients|supplement facts|nutrition facts|warning|directions)/i.test(l));

  const usableHint = cleanProductHint(productHint);
  const productName =
    usableHint ||
    (brand ? `${brand}${inferCategoryFromText(clean) ? ` ${inferCategoryFromText(clean)}` : ''}` : null) ||
    (firstLines[0] ? firstLines[0].slice(0, 72) : null) ||
    (inferCategoryFromText(clean) ? `Scanned ${inferCategoryFromText(clean)}` : null);

  return {
    productName,
    brand,
    category: inferCategoryFromText(clean),
    frontClaims,
    caffeine_mg: caffeineMg,
    allergens,
    warnings,
  };
}

export function isLikelyNonLabel(rawText, matchedCount, macros) {
  const alphaWords = (rawText || '').match(/[a-zA-Z]{3,}/g) || [];
  const lower = (rawText || '').toLowerCase();
  const hasDomainClues =
    /ingredient|supplement|nutrition|serving|protein|sugar|calorie|kcal|mg\b|whey|creatine|caffeine|scoop|allergen|warning|contains/i.test(
      lower
    );
  const hasMacros = macros && (macros.proteinG != null || macros.sugarG != null || macros.calories != null || macros.servingSizeG != null);
  if (alphaWords.length < 4 && matchedCount === 0 && !hasDomainClues && !hasMacros) {
    return true;
  }
  if (!hasDomainClues && matchedCount === 0 && alphaWords.length < 18) {
    return true;
  }
  return false;
}

async function sourceToResizedDataUrl(fileOrSource, maxSide = 1500) {
  if (typeof fileOrSource === 'string' && fileOrSource.startsWith('data:image/')) {
    return fileOrSource;
  }
  if (typeof document === 'undefined') {
    throw new Error('Browser canvas unavailable for image conversion.');
  }

  let imgBitmap = null;
  let objectUrl = null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      if (fileOrSource instanceof Blob) {
        objectUrl = URL.createObjectURL(fileOrSource);
        img.src = objectUrl;
      } else if (typeof fileOrSource === 'string') {
        img.src = fileOrSource;
      } else if (fileOrSource instanceof HTMLCanvasElement) {
        img.src = fileOrSource.toDataURL('image/jpeg', 0.9);
      } else {
        reject(new Error('Unsupported image source'));
      }
    });
    imgBitmap = img;

    const w = imgBitmap.naturalWidth || imgBitmap.width || 1000;
    const h = imgBitmap.naturalHeight || imgBitmap.height || 1000;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgBitmap, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.88);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

async function callGeminiExtractionEndpoint(dataUrls) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
  try {
    const res = await fetch('/api/scan/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: dataUrls }),
      signal: controller.signal,
    });
    const ct = res.headers?.get?.('content-type') || '';
    if (!ct.includes('application/json')) {
      return { httpStatus: res.status, ok: false, fallbackRequired: true, reason: null };
    }
    const json = await res.json();
    return { httpStatus: res.status, ...json };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * STAGE 2 EXTRACTION (Primary: Gemini Vision via Express; Automatic Fallback: Tesseract.js / Barcode / Manual).
 */
export async function extractProductData({
  files = [],
  cropRect = null,
  barcode = null,
  manualText = '',
  manualProductName = '',
  fastMode = false,
  skipCache = false,
} = {}) {
  const imageSources = Array.isArray(files) ? files.filter(Boolean).slice(0, 4) : [];

  let dataUrls = [];
  if (imageSources.length > 0) {
    dataUrls = await Promise.all(imageSources.map((src) => sourceToResizedDataUrl(src)));
  }

  const cacheKey = await computeScanHash({
    blobsOrStrings: dataUrls,
    cropRect,
    barcode,
    manualText,
  });

  if (!skipCache && cacheKey) {
    const cached = getCachedExtraction(cacheKey);
    if (cached) {
      return { ...cached, cacheHit: true };
    }
  }

  // Case A: Explicit Barcode lookup
  if (barcode && imageSources.length === 0) {
    const off = await lookupBarcodeOpenFoodFacts(barcode);
    if (!off.found) {
      throw new Error(off.message || `No supplement found for barcode ${barcode}.`);
    }
    const textToParse = off.ingredientsText || '';
    const parsed = parseLabelAndMatch(textToParse);
    const meta = extractMetadataFromText(`${off.name || ''} ${off.brand || ''} ${textToParse}`, off.name);
    const extracted = {
      isProductLabel: true,
      productName: off.name || meta.productName || `Barcode ${barcode}`,
      brand: off.brand || meta.brand || 'OpenFoodFacts',
      category: meta.category || 'Supplement',
      frontClaims: meta.frontClaims,
      ingredients: parsed.ingredients.map((i) => i.raw),
      proprietaryBlends: parsed.proprietaryBlends,
      nutritionPer100g: off.macros || null,
      nutritionPerServing: off.macros || null,
      servingSize: off.macros?.servingSizeG ? `${off.macros.servingSizeG}g` : null,
      protein_g: off.macros?.proteinG ?? null,
      sugar_g: off.macros?.sugarG ?? null,
      caffeine_mg: meta.caffeine_mg,
      allergens: meta.allergens,
      warnings: meta.warnings,
      rawText: textToParse,
      fieldConfidence: { productName: 90, ingredients: 85, nutrition: 80, overall: 85 },
      engineUsed: 'barcode:openfoodfacts',
      fallbackReason: null,
      barcodeDetected: barcode,
      ocrMeta: { confidence: 88, engine: 'barcode:openfoodfacts' },
    };
    if (cacheKey) setCachedExtraction(cacheKey, extracted);
    return extracted;
  }

  // Case B: Manual Text Paste
  if (manualText && manualText.trim().length > 0 && imageSources.length === 0) {
    const cleanText = manualText.trim();
    const parsed = parseLabelAndMatch(cleanText);
    const macros = extractMacrosFromOCR(cleanText);
    const meta = extractMetadataFromText(cleanText, manualProductName);
    const nonLabel = isLikelyNonLabel(cleanText, parsed.recognizedCount, macros);

    const extracted = {
      isProductLabel: !nonLabel,
      productName: manualProductName?.trim() || meta.productName || 'Pasted Supplement Label',
      brand: meta.brand,
      category: meta.category,
      frontClaims: meta.frontClaims,
      ingredients: parsed.ingredients.map((i) => i.raw),
      proprietaryBlends: parsed.proprietaryBlends,
      nutritionPer100g: null,
      nutritionPerServing: macros,
      servingSize: macros.servingSizeG != null ? `${macros.servingSizeG}g` : null,
      protein_g: macros.proteinG,
      sugar_g: macros.sugarG,
      caffeine_mg: meta.caffeine_mg,
      allergens: meta.allergens,
      warnings: meta.warnings,
      rawText: cleanText,
      fieldConfidence: { productName: 90, ingredients: 92, nutrition: 80, overall: 90 },
      engineUsed: 'manual-entry',
      fallbackReason: null,
      barcodeDetected: null,
      ocrMeta: { confidence: 92, engine: 'manual-entry', foundRegion: parsed.foundRegion },
    };
    if (cacheKey) setCachedExtraction(cacheKey, extracted);
    return extracted;
  }

  if (imageSources.length === 0) {
    throw new Error('Provide at least one label image, barcode, or pasted ingredient text.');
  }

  // Case C: Multi-image Scan (up to 4 photos) — Try Barcode hint + Primary Gemini Endpoint first
  let detectedBarcode = null;
  try {
    detectedBarcode = await detectBarcodeFromCanvasOrImage(imageSources[0]);
  } catch (_) {
    detectedBarcode = null;
  }

  let fallbackReason = null;
  try {
    const geminiRes = await callGeminiExtractionEndpoint(dataUrls);
    if (geminiRes.ok && geminiRes.data) {
      const g = geminiRes.data;
      const mergedTextForMeta = [
        g.productName,
        g.brand,
        ...(g.frontClaims || []),
        ...(g.ingredients || []),
        g.rawText || '',
      ]
        .filter(Boolean)
        .join(', ');
      const fallbackMeta = extractMetadataFromText(mergedTextForMeta, manualProductName || g.productName);
      const proteinG = g.protein_g ?? g.nutritionPerServing?.protein_g ?? null;
      const sugarG = g.sugar_g ?? g.nutritionPerServing?.sugar_g ?? null;

      const extracted = {
        ...g,
        productName: g.productName || manualProductName || fallbackMeta.productName || 'Scanned Supplement',
        brand: g.brand || fallbackMeta.brand,
        category: g.category || fallbackMeta.category,
        frontClaims: g.frontClaims?.length ? g.frontClaims : fallbackMeta.frontClaims,
        protein_g: proteinG,
        sugar_g: sugarG,
        caffeine_mg: g.caffeine_mg ?? fallbackMeta.caffeine_mg,
        allergens: g.allergens?.length ? g.allergens : fallbackMeta.allergens,
        warnings: g.warnings?.length ? g.warnings : fallbackMeta.warnings,
        rawText: g.rawText || (g.ingredients || []).join(', '),
        fieldConfidence: {
          productName: g.fieldConfidence?.productName ?? 85,
          ingredients: g.fieldConfidence?.ingredients ?? (g.ingredients?.length ? 88 : 20),
          nutrition: g.fieldConfidence?.nutrition ?? (proteinG != null ? 85 : 30),
          overall: g.fieldConfidence?.overall ?? 86,
        },
        engineUsed: geminiRes.engine || 'gemini',
        fallbackReason: null,
        barcodeDetected: detectedBarcode,
        ocrMeta: {
          confidence: g.fieldConfidence?.overall ?? 88,
          engine: geminiRes.engine || 'gemini',
          photoCount: imageSources.length,
        },
      };

      if (cacheKey) setCachedExtraction(cacheKey, extracted);
      return extracted;
    }
    fallbackReason = geminiRes.reason || geminiRes.error || 'Gemini extraction unavailable';
  } catch (err) {
    fallbackReason = err?.message || 'Gemini endpoint unreachable — using local Tesseract.js OCR';
  }

  // Case D: Automatic Tesseract.js Multi-Image Fallback
  const rawChunks = [];
  const confidences = [];
  const variantStats = [];
  let qualityHint = null;

  for (let i = 0; i < imageSources.length; i++) {
    const src = imageSources[i];
    const preprocessed = await preprocessImageInBrowser(src, i === 0 ? cropRect : null);
    if (i === 0) qualityHint = preprocessed.quality || null;

    const ocrRes = await recognizeWithVariants(preprocessed.variants, {
      fastMode,
      imgWidth: preprocessed.width,
      imgHeight: preprocessed.height,
    });

    if (ocrRes?.text) rawChunks.push(ocrRes.text);
    if (typeof ocrRes?.confidence === 'number') confidences.push(ocrRes.confidence);
    if (ocrRes?.variantStats) variantStats.push(...ocrRes.variantStats);
  }

  const mergedRawText = rawChunks.join('\n');
  const parsed = parseLabelAndMatch(mergedRawText);
  const macros = extractMacrosFromOCR(mergedRawText);
  const meta = extractMetadataFromText(mergedRawText, manualProductName);
  const avgRawOcrConf =
    confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 0;

  // If barcode also resolved from OpenFoodFacts and OCR had very few tokens, enrich ingredients
  let finalIngredients = parsed.ingredients.map((i) => i.raw);
  let finalPropBlends = parsed.proprietaryBlends;
  let finalMacros = macros;
  let finalMeta = meta;
  let engineUsed = 'tesseract.js';

  if (detectedBarcode && parsed.recognizedCount < 2) {
    try {
      const off = await lookupBarcodeOpenFoodFacts(detectedBarcode);
      if (off.found && off.ingredientsText) {
        const offParsed = parseLabelAndMatch(off.ingredientsText);
        if (offParsed.recognizedCount > parsed.recognizedCount) {
          finalIngredients = offParsed.ingredients.map((i) => i.raw);
          finalPropBlends = offParsed.proprietaryBlends;
          engineUsed = 'tesseract.js + barcode';
        }
      }
    } catch (_) {
      // Ignore network barcode lookup failures offline
    }
  }

  // Front-of-tub fallback: when only the front tub was scanned (no Ingredients list visible),
  // match recognizable products in our verified catalog so the user sees accurate formula data instead of N/A.
  const matchedCatalog = finalIngredients.length === 0 ? matchFrontLabelCatalog(mergedRawText) : null;
  if (matchedCatalog) {
    const catParsed = parseLabelAndMatch(matchedCatalog.ingredientsText);
    finalIngredients = catParsed.ingredients.map((i) => i.raw);
    finalPropBlends = catParsed.proprietaryBlends;
    finalMacros = {
      servingSizeG: matchedCatalog.servingSizeG ?? finalMacros.servingSizeG,
      proteinG: matchedCatalog.proteinG ?? finalMacros.proteinG,
      sugarG: matchedCatalog.sugarG ?? finalMacros.sugarG,
      carbsG: matchedCatalog.carbsG ?? finalMacros.carbsG,
      fatG: matchedCatalog.fatG ?? finalMacros.fatG,
      calories: matchedCatalog.calories ?? finalMacros.calories,
    };
    finalMeta = {
      ...finalMeta,
      productName: `${matchedCatalog.brand} ${matchedCatalog.name}`,
      brand: matchedCatalog.brand,
      category: matchedCatalog.category,
    };
    engineUsed = 'tesseract.js + catalog match';
    fallbackReason = `Front label recognized as "${matchedCatalog.brand} ${matchedCatalog.name}" — loaded verified catalog ingredients (add back label photo to audit your exact batch).`;
  }

  const nonLabel = !matchedCatalog && isLikelyNonLabel(mergedRawText, parsed.recognizedCount, finalMacros);
  const effectiveMatchCount = matchedCatalog ? finalIngredients.length : parsed.recognizedCount;
  const usableManualName = cleanProductHint(manualProductName);

  const extracted = {
    isProductLabel: !nonLabel,
    productName: finalMeta.productName || usableManualName || (finalMeta.category ? `Scanned ${finalMeta.category}` : 'Scanned Supplement'),
    brand: finalMeta.brand,
    category: finalMeta.category,
    frontClaims: finalMeta.frontClaims,
    ingredients: finalIngredients,
    proprietaryBlends: finalPropBlends,
    nutritionPer100g: null,
    nutritionPerServing: finalMacros,
    servingSize: finalMacros.servingSizeG != null ? `${finalMacros.servingSizeG}g` : null,
    protein_g: finalMacros.proteinG,
    sugar_g: finalMacros.sugarG,
    caffeine_mg: finalMeta.caffeine_mg,
    allergens: finalMeta.allergens,
    warnings: finalMeta.warnings,
    rawText: mergedRawText,
    fieldConfidence: {
      productName: finalMeta.productName ? Math.min(92, avgRawOcrConf + 15) : 25,
      ingredients:
        matchedCatalog
          ? 84
          : effectiveMatchCount > 0
          ? Math.min(95, Math.round(parsed.matchRate * 50 + avgRawOcrConf * 0.5))
          : avgRawOcrConf,
      nutrition: finalMacros.proteinG != null || finalMacros.sugarG != null ? Math.max(75, avgRawOcrConf) : 25,
      overall: matchedCatalog ? Math.max(78, avgRawOcrConf) : avgRawOcrConf,
    },
    engineUsed,
    fallbackReason,
    barcodeDetected: detectedBarcode,
    ocrMeta: {
      confidence: matchedCatalog ? Math.max(78, avgRawOcrConf) : avgRawOcrConf,
      rawOcrConfidence: avgRawOcrConf,
      engine: engineUsed,
      foundRegion: matchedCatalog ? true : parsed.foundRegion,
      photoCount: imageSources.length,
      variantStats: variantStats.slice(0, 6),
      quality: qualityHint,
    },
  };

  if (cacheKey) setCachedExtraction(cacheKey, extracted);
  return extracted;
}
