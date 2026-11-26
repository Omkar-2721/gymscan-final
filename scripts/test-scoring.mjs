import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  analyzeSupplementIngredients,
  analyzeTextWithMLFallback,
} from '../src/utils/analyzer.js';

const SAMPLES_DIR = path.resolve('tests/label-samples');
const ML_DIR = path.resolve('ml-service');

const EXPECTATIONS = [
  { file: '01_clean_isolate_unflavored.txt', label: 'Clean Whey Isolate #1', min: 75, max: 100, expectBanned: false },
  { file: '02_clean_isolate_chocolate.txt', label: 'Clean Whey Isolate #2', min: 75, max: 100, expectBanned: false },
  { file: '03_average_whey_blend.txt', label: 'Average Whey Blend #1', min: 50, max: 75, expectBanned: false },
  { file: '04_average_milk_blend.txt', label: 'Average Milk/Whey Blend #2', min: 50, max: 75, expectBanned: false },
  { file: '05_sugary_mass_gainer.txt', label: 'Sugary Mass Gainer', min: 15, max: 59, expectBanned: false },
  { file: '06_amino_spiked_whey.txt', label: 'Amino-Spiked Protein', min: 0, max: 45, expectBanned: false },
  { file: '07_dmaa_preworkout.txt', label: 'DMAA Pre-Workout', min: 0, max: 20, expectBanned: true },
  { file: '08_sarm_contaminated.txt', label: 'SARM (0starine + LGD-4033)', min: 0, max: 20, expectBanned: true },
];

async function ensureMlTestServer() {
  const isWin = process.platform === 'win32';
  const py = fs.existsSync(path.join(ML_DIR, '.venv/Scripts/python.exe'))
    ? path.join(ML_DIR, '.venv/Scripts/python.exe')
    : fs.existsSync(path.join(ML_DIR, '.venv/bin/python'))
    ? path.join(ML_DIR, '.venv/bin/python')
    : isWin
    ? 'python'
    : 'python3';

  const port = 8019;
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
        if (j?.models_loaded) {
          return { url: testUrl, child };
        }
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 400));
  }

  child.kill();
  throw new Error('Could not start ephemeral ML service for scoring tests.');
}

function pad(str, len) {
  const s = String(str ?? '');
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

async function main() {
  const srv = await ensureMlTestServer();
  process.env.GYMSCAN_ML_URL = srv.url;
  let failures = 0;

  try {
    console.log('\n========================================================================================');
    console.log(`GYMSCAN SCORING REGRESSION & HARD-RULE SUITE (ML Server: ${srv.url})`);
    console.log('========================================================================================');
    console.log(
      `${pad('Sample', 28)} | ${pad('Expected', 9)} | ${pad('ML Score', 8)} | ${pad('Fallback', 8)} | ${pad('Banned/Contam', 15)} | Status`
    );
    console.log('-'.repeat(92));

    const mlScores = [];
    const fbScores = [];

    for (const spec of EXPECTATIONS) {
      const text = fs.readFileSync(path.join(SAMPLES_DIR, spec.file), 'utf-8');
      const fb = analyzeSupplementIngredients(text, spec.label);
      const ml = await analyzeTextWithMLFallback(text, spec.label);

      mlScores.push(ml.purityScore);
      fbScores.push(fb.purityScore);

      const mlOk =
        !ml.mlFallback &&
        typeof ml.purityScore === 'number' &&
        ml.purityScore >= spec.min &&
        ml.purityScore <= spec.max &&
        Boolean(ml.flags?.bannedSubstances) === spec.expectBanned;

      const fbOk =
        typeof fb.purityScore === 'number' &&
        fb.purityScore >= spec.min &&
        fb.purityScore <= spec.max &&
        Boolean(fb.flags?.bannedSubstances) === spec.expectBanned;

      const rowPass = mlOk && fbOk;
      if (!rowPass) failures++;

      const rangeStr = `${spec.min}-${spec.max}`;
      const banStr = `${ml.bannedSubstancesDetected?.length || 0} ban / ${ml.contaminationRisksDetected?.length || 0} contam`;
      console.log(
        `${pad(spec.label, 28)} | ${pad(rangeStr, 9)} | ${pad(ml.purityScore ?? 'N/A', 8)} | ${pad(fb.purityScore ?? 'N/A', 8)} | ${pad(banStr, 15)} | ${rowPass ? 'PASS' : 'FAIL'}`
      );
      if (!rowPass) {
        console.log(`   -> Debug: mlFallback=${ml.mlFallback}, mlScore=${ml.purityScore}, fbScore=${fb.purityScore}, mlVerdict="${ml.verdict}", banned=[${(ml.bannedSubstancesDetected || []).map((b) => b.name).join(', ')}]`);
      }
    }

    // Verify spread (NOT clustered within 10 points)
    const mlSpread = Math.max(...mlScores) - Math.min(...mlScores);
    const fbSpread = Math.max(...fbScores) - Math.min(...fbScores);
    console.log('-'.repeat(92));
    console.log(`Score Spread -> ML Pipeline: ${mlSpread} pts (min=${Math.min(...mlScores)}, max=${Math.max(...mlScores)}) | Fallback: ${fbSpread} pts`);
    if (mlSpread <= 10 || fbSpread <= 10) {
      failures++;
      console.error('FAIL: Scores are collapsed within 10 points of each other!');
    }

    // Verify Unreadable / Unrecognized (>40% unknown / <50% confidence) blocks score cleanly
    const gibberish = analyzeSupplementIngredients(
      'Ingredients: xqzptlk, mnvbrqw, ytrwqaz, klpzmno, zxwqmna',
      'Gibberish Label',
      null,
      'A',
      null,
      { rawOcrConfidence: 36 }
    );
    const blockedOk =
      gibberish.scoreBlocked === true &&
      gibberish.purityScore === null &&
      gibberish.verdict === 'Not enough readable data - retake photo';
    console.log(
      `Low-Confidence / Gibberish Gate Check: scoreBlocked=${gibberish.scoreBlocked}, score=${gibberish.purityScore}, verdict="${gibberish.verdict}" -> ${blockedOk ? 'PASS' : 'FAIL'}`
    );
    if (!blockedOk) failures++;

    console.log('========================================================================================');
    if (failures > 0) {
      console.error(`\nResult: ${failures} check(s) FAILED.`);
      process.exitCode = 1;
    } else {
      console.log('\nResult: ALL SCORING & BANNED-SUBSTANCE ASSERTIONS PASSED!');
    }
  } finally {
    if (srv.child) {
      srv.child.kill();
    }
  }
}

main().catch((err) => {
  console.error('Scoring test suite error:', err);
  process.exit(1);
});
