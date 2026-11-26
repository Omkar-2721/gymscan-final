import { spawn } from 'node:child_process';

const HEALTH_URL = 'http://127.0.0.1:8000/health';
const MAX_WAIT_MS = 45000;
const POLL_MS = 700;

async function waitForMlReady() {
  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) {
        const data = await res.json();
        if (data?.status === 'ok' && data?.models_loaded) {
          console.log('[WEB] ML service /health OK (models_loaded=true). Launching Vite...');
          return true;
        }
      }
    } catch (_) {
      // Service still booting
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  console.warn('[WEB] ML service /health check timed out after 45s — starting Vite anyway (offline fallback ready).');
  return false;
}

await waitForMlReady();

const isWin = process.platform === 'win32';
const viteBin = isWin ? 'npx.cmd' : 'npx';
const child = spawn(viteBin, ['vite'], { stdio: 'inherit', shell: isWin });
child.on('exit', (code) => process.exit(code ?? 0));
