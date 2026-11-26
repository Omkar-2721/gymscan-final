import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const mlDir = path.resolve('ml-service');
const isWin = process.platform === 'win32';
const venvPython = path.join(mlDir, '.venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python');

function run(cmd, args, cwd = mlDir) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

if (!fs.existsSync(venvPython)) {
  console.log('[ml:setup] Creating Python virtual environment in ml-service/.venv...');
  const sysPy = isWin ? 'python' : 'python3';
  run(sysPy, ['-m', 'venv', '.venv'], mlDir);
}

console.log('[ml:setup] Installing dependencies from ml-service/requirements.txt...');
run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], mlDir);
run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], mlDir);

console.log('[ml:setup] Training GymScan ML models...');
run(venvPython, ['train.py'], mlDir);

console.log('[ml:setup] Complete! Models are ready in ml-service/models.');
