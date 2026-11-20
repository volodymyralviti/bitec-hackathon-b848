// Copy source-only working snapshot for a clean install/build rehearsal. Never copies .git,
// ignored instructions, .env, node_modules, dist, scenario stores or browser profiles.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'eds-release-source-'));
const paths = execFileSync('git', ['ls-files', '-c', '-o', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
let count = 0;
for (const relative of new Set(paths)) {
  if (relative.split(/[\\/]/).some(part => ['.git', '.data', '.angular', 'node_modules', 'dist', 'coverage'].includes(part)) || /^\.env(?:\.|$)/.test(path.basename(relative)) && !relative.endsWith('.env.example')) continue;
  const source = path.resolve(root, relative); const target = path.resolve(destination, relative);
  if (!target.startsWith(destination + path.sep)) throw Error('Unsafe snapshot path');
  if (!fs.existsSync(source)) continue;
  const stat = fs.lstatSync(source);
  if (!stat.isFile()) throw Error('Snapshot accepts ordinary files only: ' + relative);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); count++;
}
console.log(JSON.stringify({ directory: destination, files: count, sourceOnly: true, includesUncommittedReleaseWork: true }));
