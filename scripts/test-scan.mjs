import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PNG } from 'pngjs';
import { buildPreprocessedVariantsFromRGBA } from '../src/utils/imagePreprocess.js';
import {
  recognizeWithVariants,
  parseLabelAndMatch,
  extractMacrosFromOCR,
} from '../src/utils/ocrEngine.js';
import { extractMetadataFromText, isLikelyNonLabel } from '../src/scan/extractor.js';
import { normalizeExtractedIngredients } from '../src/scan/normalizer.js';
import { analyzeNormalizedProduct } from '../src/scan/analyzer.js';

const SAMPLES_DIR = path.resolve('tests/label-samples');
const ML_DIR = path.resolve('ml-service');

async function ensureMlTestServer() {
  const isWin = process.platform === 'win32';
  const py = fs.existsSync(path.join(ML_DIR, '.venv/Scripts/python.exe'))
    ? path.join(ML_DIR, '.venv/Scripts/python.exe')
    : fs.existsSync(path.join(ML_DIR, '.venv/bin/python'))
    ? path.join(ML_DIR, '.venv/bin/python')
    : isWin
    ? 'python'
    : 'python3';

  const port = 8021;
  const child = spawn(
    py,
    ['-m', 'uvicorn', 'main:app', '--app-dir', ML_DIR, '--host', '127.0.0.1', '--port', String(port)],
    { stdio: 'pipe' }
  );

  const testUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${testUrl}/health`);
      if (res.ok) {
        const j = await res.json();
        if (j?.models_loaded) return { url: testUrl, child };
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 400));
  }

  child.kill();
  return null;
}

function encodePngBuffer(rgba, width, height) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);
  return PNG.sync.write(png);
}

function pad(str, len) {
  const s = String(str ?? '');
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

async function main() {
  const srv = await ensureMlTestServer();
  if (srv) process.env.GYMSCAN_ML_URL = srv.url;

  const jsonFiles = fs
    .readdirSync(SAMPLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (jsonFiles.length < 10) {
    console.error(`Expected at least 10 .json sample tests in ${SAMPLES_DIR}, found ${jsonFiles.length}`);
    process.exit(1);
  }

  let failures = 0;
  const numericScores = [];

  try {
    console.log('\n=========================================================================================================');
    console.log(`GYMSCAN END-TO-END IMAGE SCAN PIPELINE TEST SUITE (${jsonFiles.length} PNG+JSON samples, ML: ${srv ? 'ONLINE' : 'OFFLINE'})`);
    console.log('=========================================================================================================');
    console.log(
      `${pad('Sample File', 30)} | ${pad('Expected', 12)} | ${pad('Actual', 8)} | ${pad('OCR Conf', 8)} | ${pad('Banned/NonLbl', 14)} | Result`
    );
    console.log('-'.repeat(105));

    for (const jf of jsonFiles) {
      const slug = jf.replace(/\.json$/, '');
      const spec = JSON.parse(fs.readFileSync(path.join(SAMPLES_DIR, jf), 'utf-8'));
      const pngBuf = fs.readFileSync(path.join(SAMPLES_DIR, `${slug}.png`));
      const decoded = PNG.sync.read(pngBuf);

      const processed = buildPreprocessedVariantsFromRGBA(
        new Uint8ClampedArray(decoded.data),
        decoded.width,
        decoded.height
      );

      const variantPayloads = processed.variants.map((v) => ({
        ...v,
        buffer: encodePngBuffer(v.rgba, processed.width, processed.height),
      }));

      const ocrRes = await recognizeWithVariants(variantPayloads, {
        fastMode: true,
        imgWidth: processed.width,
        imgHeight: processed.height,
      });

      const rawText = ocrRes?.text || '';
      const parsed = parseLabelAndMatch(rawText);
      const macros = extractMacrosFromOCR(rawText);
      const meta = extractMetadataFromText(rawText, spec.label);
      const nonLabel = isLikelyNonLabel(rawText, parsed.recognizedCount, macros);

      const extracted = {
        isProductLabel: !nonLabel,
        productName: meta.productName || spec.label,
        brand: meta.brand,
        category: meta.category,
        frontClaims: meta.frontClaims,
        ingredients: parsed.ingredients.map((i) => i.raw),
        proprietaryBlends: parsed.proprietaryBlends,
        nutritionPerServing: macros,
        servingSize: macros.servingSizeG != null ? `${macros.servingSizeG}g` : null,
        protein_g: macros.proteinG,
        sugar_g: macros.sugarG,
        caffeine_mg: meta.caffeine_mg,
        allergens: meta.allergens,
        warnings: meta.warnings,
        rawText,
        fieldConfidence: { overall: ocrRes?.confidence ?? 0 },
        engineUsed: 'tesseract.js',
        ocrMeta: { confidence: ocrRes?.confidence ?? 0 },
      };

      const normalized = normalizeExtractedIngredients(
        extracted.ingredients,
        extracted.proprietaryBlends
      );

      const result = await analyzeNormalizedProduct({
        extracted,
        normalized,
        useMLService: Boolean(srv),
      });

      let passed = true;
      if (spec.expectBlocked) {
        passed = Boolean(result.scoreBlocked && result.purityScore == null);
        if (spec.expectNonLabel) {
          passed = passed && result.isProductLabel === false;
        }
      } else {
        passed =
          !result.scoreBlocked &&
          typeof result.purityScore === 'number' &&
          result.purityScore >= spec.minScore &&
          result.purityScore <= spec.maxScore &&
          Boolean(result.flags?.bannedSubstances) === Boolean(spec.expectBanned);
        if (typeof result.purityScore === 'number') numericScores.push(result.purityScore);
      }

      if (!passed) failures++;

      const expLabel = spec.expectBlocked
        ? spec.expectNonLabel
          ? 'N/A (NonLbl)'
          : 'N/A (Blurry)'
        : `${spec.minScore}..${spec.maxScore}`;
      const actLabel = result.scoreBlocked ? 'N/A' : `${result.purityScore}/100`;
      const flagLabel = spec.expectNonLabel
        ? result.isProductLabel === false
          ? 'NonLabel:Yes'
          : 'NonLabel:No'
        : `Ban:${result.flags?.bannedSubstances ? 'YES' : 'NO'}`;

      console.log(
        `${pad(slug, 30)} | ${pad(expLabel, 12)} | ${pad(actLabel, 8)} | ${pad(`${ocrRes?.confidence ?? 0}%`, 8)} | ${pad(flagLabel, 14)} | ${passed ? 'PASS' : 'FAIL'}`
      );
    }

    const spread =
      numericScores.length >= 2
        ? Math.max(...numericScores) - Math.min(...numericScores)
        : 0;
    console.log('-'.repeat(105));
    console.log(`Numeric Score Range: ${Math.min(...numericScores)}..${Math.max(...numericScores)} (Spread: ${spread} pts)`);
    if (spread < 50) {
      console.error(`FAIL: Score spread too narrow (${spread} < 50).`);
      failures++;
    }
    console.log('=========================================================================================================\n');
  } finally {
    if (srv?.child) srv.child.kill();
  }

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('test-scan fatal error:', err);
  process.exit(1);
});
