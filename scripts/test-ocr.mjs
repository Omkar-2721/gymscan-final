/**
 * OCR Accuracy Benchmark Script (`npm run test:ocr`)
 * Compares BEFORE (legacy raw OCR + naive split) vs AFTER (imagePreprocess.js +
 * multi-variant persistent Tesseract worker + label region parser + 300+ fuzzy dictionary)
 * across all sample images and expected JSON files in /test-images.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { createWorker } from 'tesseract.js';
import { buildPreprocessedVariantsFromRGBA } from '../src/utils/imagePreprocess.js';
import {
  getTesseractWorker,
  recognizeWithVariants,
  parseLabelAndMatch,
  extractMacrosFromOCR,
} from '../src/utils/ocrEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT_DIR, 'test-images');

function encodePngBuffer(rgba, width, height) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);
  return PNG.sync.write(png);
}

function normStr(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatchSet(expectedList, extractedList) {
  const expectedNorm = expectedList.map(normStr);
  const extractedNorm = extractedList.map(normStr);

  let hits = 0;
  const missed = [];

  for (let i = 0; i < expectedNorm.length; i++) {
    const exp = expectedNorm[i];
    const found = extractedNorm.some(
      (ext) => ext === exp || (ext.length >= 4 && exp.includes(ext) && ext.length >= exp.length * 0.75)
    );
    if (found) {
      hits++;
    } else {
      missed.push(expectedList[i]);
    }
  }

  const recall = expectedNorm.length > 0 ? hits / expectedNorm.length : 0;
  const precision = extractedNorm.length > 0 ? Math.min(1, hits / extractedNorm.length) : 0;
  const f1 = recall + precision > 0 ? (2 * recall * precision) / (recall + precision) : 0;

  return {
    hits,
    totalExpected: expectedNorm.length,
    totalExtracted: extractedNorm.length,
    recall,
    precision,
    f1,
    missed,
  };
}

async function runLegacyBaseline(pngBuffer, legacyWorker) {
  const ret = await legacyWorker.recognize(pngBuffer);
  const rawText = (ret?.data?.text || '').toLowerCase();
  const tokens = rawText
    .split(/[,;\n•|\t/:]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  return { rawText, tokens };
}

async function runUpgradedPipeline(pngBuffer) {
  const decoded = PNG.sync.read(pngBuffer);
  const processed = buildPreprocessedVariantsFromRGBA(
    new Uint8ClampedArray(decoded.data),
    decoded.width,
    decoded.height
  );

  const variants = processed.variants.map((v) => ({
    ...v,
    buffer: encodePngBuffer(v.rgba, processed.width, processed.height),
  }));

  const ocrRes = await recognizeWithVariants(variants, { fastMode: false });
  const parsed = parseLabelAndMatch(ocrRes.text);
  const macros = extractMacrosFromOCR(ocrRes.text);

  return {
    ocrRes,
    skewAngle: processed.skewAngle,
    parsed,
    macros,
    matchedNames: parsed.ingredients.map((i) => i.matchedName),
  };
}

async function main() {
  const jsonFiles = fs
    .readdirSync(TEST_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (jsonFiles.length === 0) {
    console.error('No expected JSON files found in /test-images.');
    process.exit(1);
  }

  console.log(`\nGymScan OCR Accuracy Benchmark (${jsonFiles.length} Supplement Label Samples)`);
  console.log('='.repeat(78));

  const legacyWorker = await createWorker('eng');
  await getTesseractWorker();

  let beforeHitsTotal = 0;
  let afterHitsTotal = 0;
  let expectedTotal = 0;
  let afterExtractedTotal = 0;
  let macroChecksPassed = 0;
  let macroChecksTotal = 0;

  for (const jf of jsonFiles) {
    const spec = JSON.parse(fs.readFileSync(path.join(TEST_DIR, jf), 'utf8'));
    const imgPath = path.join(TEST_DIR, spec.image);
    const pngBuffer = fs.readFileSync(imgPath);

    // 1. BEFORE baseline
    const beforeOut = await runLegacyBaseline(pngBuffer, legacyWorker);
    const beforeScore = scoreMatchSet(spec.expectedIngredients, beforeOut.tokens);

    // 2. AFTER upgraded pipeline
    const afterOut = await runUpgradedPipeline(pngBuffer);
    const afterScore = scoreMatchSet(spec.expectedIngredients, afterOut.matchedNames);

    beforeHitsTotal += beforeScore.hits;
    afterHitsTotal += afterScore.hits;
    expectedTotal += spec.expectedIngredients.length;
    afterExtractedTotal += afterScore.totalExtracted;

    // Check macro extraction accuracy
    const expMacros = spec.expectedMacros || {};
    for (const [k, expVal] of Object.entries(expMacros)) {
      macroChecksTotal++;
      if (afterOut.macros[k] === expVal) {
        macroChecksPassed++;
      }
    }

    console.log(`\n[${spec.id}] (${spec.image})`);
    console.log(
      `  BEFORE (Raw OCR + Naive Split) : ${beforeScore.hits}/${beforeScore.totalExpected} recalled ` +
        `(${(beforeScore.recall * 100).toFixed(1)}% recall, ${(beforeScore.precision * 100).toFixed(1)}% prec)`
    );
    console.log(
      `  AFTER  (Preprocess + Region + Fuzzy): ${afterScore.hits}/${afterScore.totalExpected} recalled ` +
        `(${(afterScore.recall * 100).toFixed(1)}% recall, ${(afterScore.precision * 100).toFixed(1)}% prec, ` +
        `F1=${(afterScore.f1 * 100).toFixed(1)}%)`
    );
    console.log(
      `  Winning Variant: ${afterOut.ocrRes.winningVariant.label} (PSM ${afterOut.ocrRes.winningVariant.psm}, ` +
        `conf=${afterOut.ocrRes.confidence}%, deskew=${afterOut.skewAngle} deg)`
    );
    if (afterOut.parsed.corrections.length > 0) {
      console.log(`  Corrections: ${afterOut.parsed.corrections.join(' | ')}`);
    }
    if (afterScore.missed.length > 0) {
      console.log(`  Missed (After): ${afterScore.missed.join(', ')}`);
    }
  }

  const overallBeforeRecall = (beforeHitsTotal / Math.max(1, expectedTotal)) * 100;
  const overallAfterRecall = (afterHitsTotal / Math.max(1, expectedTotal)) * 100;
  const overallAfterPrecision = (afterHitsTotal / Math.max(1, afterExtractedTotal)) * 100;
  const overallMacroAcc = (macroChecksPassed / Math.max(1, macroChecksTotal)) * 100;

  console.log('\n' + '='.repeat(78));
  console.log(`OVERALL BEFORE (Legacy Recall) : ${beforeHitsTotal}/${expectedTotal} = ${overallBeforeRecall.toFixed(1)}%`);
  console.log(
    `OVERALL AFTER  (Upgraded Pipeline): ${afterHitsTotal}/${expectedTotal} = ${overallAfterRecall.toFixed(1)}% recall | ` +
      `${overallAfterPrecision.toFixed(1)}% precision`
  );
  console.log(`MACRO REGEX EXTRACTION ACCURACY: ${macroChecksPassed}/${macroChecksTotal} = ${overallMacroAcc.toFixed(1)}%`);
  console.log('='.repeat(78) + '\n');

  await legacyWorker.terminate();
  const singleton = await getTesseractWorker();
  await singleton.terminate();
  process.exit(0);
}

main().catch((err) => {
  console.error('OCR Benchmark failed:', err);
  process.exit(1);
});
