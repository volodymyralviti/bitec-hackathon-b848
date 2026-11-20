// Real NestJS API for local browser checks, isolated from the developer's data/keys.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export async function startScenarioApi() {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  assert.ok(fs.existsSync(path.join(root, 'apps/server/dist/main.js')), 'Build server first');
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eds-studio-smoke-'));
  const reserve = http.createServer();
  await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const authorKey = randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [path.join(root, 'apps/server/dist/main.js')], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), DATABASE_URL: '', AUTHOR_KEY: authorKey, REVIEWER_KEY: '', SCENARIO_DATA_FILE: path.join(dataDirectory, 'scenarios.json'), SCENARIO_CONTENT_DIR: path.join(root, 'content/scenarios') }
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const origin = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (child.exitCode !== null) throw new Error('Nest startup failed: ' + output);
      try { if ((await fetch(origin + '/api/health')).ok) return { origin, authorKey, dataDirectory, close: () => child.kill() }; } catch { /* wait for startup */ }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Nest startup timeout: ' + output);
  } catch (error) { child.kill(); throw error; }
}

export function proxyApi(request, response, origin) {
  const upstream = http.request(new URL(request.url, origin), { method: request.method, headers: { ...request.headers, host: new URL(origin).host } }, result => {
    response.writeHead(result.statusCode, result.headers); result.pipe(response);
  });
  upstream.on('error', () => { response.writeHead(502); response.end(); });
  request.pipe(upstream);
}
