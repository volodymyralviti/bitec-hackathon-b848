// Stage 10D: real curated manifest and production assets; isolated author store only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { COLLEGE_IDS, loadCollege } from './college-qa.mjs';

assert.ok(process.env.CHROME_BIN, 'Set CHROME_BIN to installed Chrome/Edge');
const project = fileURLToPath(new URL('../../', import.meta.url));
const web = path.join(project, 'apps/client/dist/client/browser');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'eds-college-browser-'));
const seed = path.join(project, 'content/scenarios');
const store = path.join(temporary, 'store.json');
const realManifest = fs.readFileSync(path.join(seed, 'index.json'));
assert.deepEqual(JSON.parse(realManifest), COLLEGE_IDS.map(id => id + '.json'));
const artifacts = path.join(project, '.angular/stage10d'); fs.mkdirSync(artifacts, { recursive: true });
const reserve = http.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
const apiPort = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
const authorKey = randomBytes(32).toString('hex');
const apiOrigin = 'http://127.0.0.1:' + apiPort;
const api = spawn(process.execPath, [path.join(project, 'apps/server/dist/main.js')], {
  cwd: project, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(apiPort), DATABASE_URL: '', AUTHOR_KEY: authorKey, REVIEWER_KEY: '', SCENARIO_CONTENT_DIR: seed, SCENARIO_DATA_FILE: store },
});
let startup = ''; api.stdout.on('data', data => { startup += data; }); api.stderr.on('data', data => { startup += data; });
const connections = new Set();
const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) {
    const upstream = http.request(new URL(request.url, apiOrigin), { method: request.method, headers: { ...request.headers, host: new URL(apiOrigin).host } }, remote => { response.writeHead(remote.statusCode, remote.headers); remote.pipe(response); });
    upstream.on('error', () => { response.writeHead(502); response.end(); }); request.pipe(upstream); return;
  }
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let file = path.resolve(web, '.' + pathname);
  if (file !== web && !file.startsWith(web + path.sep)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(pathname)) { response.writeHead(404); response.end(); return; }
    file = path.join(web, 'index.html');
  }
  response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' }[path.extname(file)] ?? 'application/octet-stream');
  response.end(fs.readFileSync(file));
});
server.on('connection', socket => { connections.add(socket); socket.on('close', () => connections.delete(socket)); });
server.on('upgrade', (request, socket, head) => {
  if (!request.url.startsWith('/api/classroom-socket/')) { socket.destroy(); return; }
  const upstream = http.request(new URL(request.url, apiOrigin), { headers: request.headers });
  upstream.on('upgrade', (response, remote, remoteHead) => {
    socket.write(`HTTP/1.1 ${response.statusCode} Switching Protocols\r\n` + Object.entries(response.headers).map(([key, value]) => `${key}: ${value}\r\n`).join('') + '\r\n');
    if (head.length) remote.write(head); if (remoteHead.length) socket.write(remoteHead);
    remote.pipe(socket); socket.pipe(remote); remote.on('error', () => socket.destroy()); socket.on('error', () => remote.destroy());
  });
  upstream.on('error', () => socket.destroy()); upstream.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const profile = path.join(temporary, 'profile');
const browser = spawn(process.env.CHROME_BIN, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sockets = []; const errors = [];
async function cdp(url) {
  const socket = new WebSocket(url); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let serial = 0; const tasks = new Map(); const protectedCalls = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; tasks.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  socket.onmessage = event => {
    const value = JSON.parse(event.data);
    if (value.id) { const task = tasks.get(value.id); tasks.delete(value.id); value.error ? task.reject(Error(JSON.stringify(value.error))) : task.resolve(value.result); }
    else if (value.method === 'Runtime.exceptionThrown') errors.push('Runtime exception');
    else if (value.method === 'Runtime.consoleAPICalled' && value.params.type === 'error') errors.push('Console error');
    else if (value.method === 'Log.entryAdded' && value.params.entry.level === 'error') errors.push(value.params.entry.text);
    else if (value.method === 'Page.javascriptDialogOpening') void send('Page.handleJavaScriptDialog', { accept: true });
    else if (value.method === 'Network.requestWillBeSent' && /^\/api\/(author|reviewer)(\/|$)/.test(new URL(value.params.request.url).pathname)) protectedCalls.push(new URL(value.params.request.url).pathname);
  };
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails)); return response.result.value; };
  const wait = async expression => {
    for (let attempt = 0; attempt < 300; attempt++) {
      try { if (await evaluate(expression)) return; } catch (error) { if (!/Inspected target navigated|Execution context was destroyed|Cannot find context/.test(error.message)) throw error; }
      await sleep(40);
    }
    throw Error('Browser timeout: ' + expression); // Never log a PIN/capability or body.
  };
  const click = async selector => {
    await wait(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`);
    return evaluate(`(() => {const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw Error('Missing control');for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;node.click();})()`);
  };
  const fill = (selector, text) => evaluate(`(() => {const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw Error('Missing field');for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;node.value=${JSON.stringify(text)};node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const enter = async selector => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); };
  return { send, evaluate, wait, click, fill, enter, protectedCalls };
}
try {
  let healthy = false;
  const readyBy = Date.now() + 45_000;
  while (!healthy && Date.now() < readyBy) { if (api.exitCode !== null) throw Error('Isolated API startup failed: ' + startup.slice(-1500)); try { healthy = (await fetch(apiOrigin + '/api/health', { signal: AbortSignal.timeout(500) })).ok; } catch { /* bounded startup retry */ } if (!healthy) await sleep(40); }
  if (!healthy) throw Error('Isolated API health timeout; startup: ' + startup.slice(-1500));
  const httpChecks = [];
  for (const file of ['index.json', ...COLLEGE_IDS.map(id => id + '.json')]) {
    const response = await fetch(base + '/scenarios/' + file);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /application\/json/);
    const json = await response.json();
    if (file === 'index.json') assert.deepEqual(json, COLLEGE_IDS.map(id => id + '.json'));
    else assert.deepEqual(json, loadCollege(file.slice(0, -5)));
    httpChecks.push({ url: base + '/scenarios/' + file, status: response.status, contentType: response.headers.get('content-type') });
  }
  for (const id of ['urgent-supply', 'truth-under-pressure', 'missing']) {
    assert.equal((await fetch(base + '/scenarios/' + id + '.json')).status, 404);
    assert.equal((await fetch(base + '/api/scenarios/' + id)).status, 404);
  }
  assert.deepEqual((await (await fetch(base + '/api/scenarios')).json()).map(item => item.id), COLLEGE_IDS);
  assert.equal((await fetch(base + '/api/health')).status, 200);
  const portFile = path.join(profile, 'DevToolsActivePort'); for (let attempt = 0; !fs.existsSync(portFile) && attempt < 300; attempt++) await sleep(40);
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  const control = await cdp((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl);
  async function page(route, mobile = false) {
    const { browserContextId } = await control.send('Target.createBrowserContext');
    const { targetId } = await control.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const client = await cdp(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
    for (const method of ['Runtime.enable','Log.enable','Page.enable','Network.enable']) await client.send(method);
    await client.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 360 : 1280, height: mobile ? 800 : 960, deviceScaleFactor: 1, mobile });
    await client.send('Page.navigate', { url: base + route });
    return { ...client, browserContextId, close: () => control.send('Target.disposeBrowserContext', { browserContextId }) };
  }
  async function journey(client, id, prefix) {
    await client.wait('!!document.querySelector("[data-action=advance]")'); await client.enter('[data-action=advance]');
    for (let round = 0; round < 3; round++) {
      await client.wait('!!document.querySelector("[data-choice-id]")'); await client.click('[data-choice-id]');
      assert.ok(await client.evaluate('document.querySelectorAll("app-sources [data-source-id]").length >= 2'));
      assert.equal(await client.evaluate('[...document.querySelectorAll("app-sources a")].every(node=>node.href.startsWith("https://data.rada.gov.ua/"))'), true);
      assert.equal(await client.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      await client.enter('[data-action=confirm]'); await client.wait('!!document.querySelector("[data-action=feedback-next]")'); await client.click('[data-action=feedback-next]');
    }
    await client.wait(`!!document.querySelector('a[href="${prefix}/${id}/debrief"]')`); await client.click(`a[href="${prefix}/${id}/debrief"]`);
    await client.wait('document.querySelectorAll(".decision-history li").length === 3');
    const expected = JSON.parse(fs.readFileSync(new URL(`./${id}.routes.json`, import.meta.url), 'utf8')).routes[0];
    assert.deepEqual(await client.evaluate('[...document.querySelectorAll(".dimensions strong")].map(node=>Number(node.textContent))'), Object.values(expected.finalMetrics));
    assert.equal(await client.evaluate('document.body.textContent.includes("Не перевірено") && document.body.textContent.includes("Не встановлена")'), true);
    assert.ok(await client.evaluate('document.querySelectorAll("app-sources a").length >= 2'));
  }
  const reports = [];
  for (const id of COLLEGE_IDS) {
    const scenario = loadCollege(id);
    const solo = await page('/scenarios', true); await solo.wait('document.querySelectorAll(".scenario-card").length === 3');
    assert.equal(await solo.evaluate(`document.body.textContent.includes(${JSON.stringify(scenario.title)})`), true);
    assert.deepEqual(await solo.evaluate('[...document.querySelectorAll(".scenario-card a.button")].map(node=>node.getAttribute("href"))'), COLLEGE_IDS.map(id => '/scenarios/' + id + '/play'));
    assert.equal(await solo.evaluate('document.querySelectorAll("[data-demo-disclaimer]").length'), 3);
    await solo.send('Page.navigate', { url: base + '/scenarios/' + id + '/play' });
    await solo.wait('!!document.querySelector("[data-action=advance]")');
    await solo.send('Page.reload', { ignoreCache: true });
    await solo.wait('!!document.querySelector("[data-demo-disclaimer]")');
    await journey(solo, id, '/scenarios');
    await solo.click('[data-action=restart]'); await solo.wait('!!document.querySelector("[data-action=advance]")'); await solo.close();

    const demo = await page('/studio/demo', true); await demo.wait('!!document.querySelector("[data-action=import-json]")');
    const beforeDemo = fs.readFileSync(store);
    await demo.fill('[data-action=import-json]', JSON.stringify(scenario)); await demo.click('[data-action=import]'); await demo.wait('!!document.querySelector("[data-action=export]")');
    const download = path.join(temporary, id + '-demo'); fs.mkdirSync(download);
    await control.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: download, browserContextId: demo.browserContextId });
    await demo.click('[data-action=validate]'); await demo.wait('document.body.textContent.includes("Структура й граф валідні")');
    await demo.click('[data-action=export]'); const exported = path.join(download, `${id}-1.0.0.json`);
    for (let attempt = 0; !fs.existsSync(exported) && attempt < 200; attempt++) await sleep(40);
    assert.deepEqual(JSON.parse(fs.readFileSync(exported, 'utf8')), scenario);
    await demo.click('[data-action=preview]'); await journey(demo, id, '/studio/demo/preview');
    await demo.click('.back-link'); await demo.wait('!!document.querySelector("[data-action=reset-demo]")'); await demo.click('[data-action=reset-demo]');
    await demo.fill('[data-action=import-json]', fs.readFileSync(exported, 'utf8')); await demo.click('[data-action=import]'); await demo.wait('!!document.querySelector("[data-action=export]")');
    assert.deepEqual(demo.protectedCalls, []); assert.equal(fs.readFileSync(store).equals(beforeDemo), true); await demo.close();

    const author = await page('/studio'); await author.wait('!!document.querySelector("[data-action=author-key]")');
    await author.fill('[data-action=author-key]', authorKey); await author.click('[data-action=login]'); await author.wait('!!document.querySelector("[data-action=import-json]")');
    await author.fill('[data-action=import-json]', JSON.stringify(scenario)); await author.click('[data-action=import]'); await author.wait('!!document.querySelector("[data-action=save-draft]")');
    const privateId = 'qa-private-' + id;
    await author.fill('[data-field-path="id"]', privateId); await author.click('[data-action=save-draft]'); await author.wait('document.body.textContent.includes("Приватну версію збережено")');
    assert.equal((await fetch(apiOrigin + '/api/scenarios/' + privateId)).status, 404);
    const saved = await (await fetch(apiOrigin + `/api/author/scenarios/${privateId}/1.0.0`, { headers: { Authorization: `Bearer ${authorKey}` } })).json();
    assert.deepEqual(saved.scenario.sources, scenario.sources); assert.equal(saved.scenario.contentReview.status, 'draft'); await author.close();

    const host = await page('/classroom/host'); await host.wait('!!document.querySelector("[data-classroom-scenario] option")');
    assert.deepEqual(await host.evaluate('[...document.querySelectorAll("[data-classroom-scenario] option")].map(node=>node.value)'), COLLEGE_IDS);
    await host.fill('[data-classroom-scenario]', id); await host.click('[data-classroom-action=create]'); await host.wait('!!document.querySelector("[data-room-pin]")');
    const pin = await host.evaluate('document.querySelector("[data-room-pin]").textContent.trim()');
    const members = await Promise.all([page('/classroom/join/' + pin, true), page('/classroom/join/' + pin), page('/classroom/join/' + pin)]);
    for (const member of members) { await member.wait('!!document.querySelector("[data-classroom-action=join]")'); await member.click('[data-classroom-action=join]'); await member.wait('!!document.querySelector("[data-room-pin]")'); }
    await host.click('[data-classroom-action=advance]');
    for (let round = 0; round < 3; round++) {
      await host.wait('!!document.querySelector("[data-classroom-action=open]")'); await host.click('[data-classroom-action=open]');
      for (const member of members) { await member.wait('!!document.querySelector("[data-classroom-choice]")'); await member.click('[data-classroom-choice]'); await member.click('[data-classroom-action=vote]'); await member.wait('!!document.querySelector("[data-vote-recorded]")'); assert.equal(await host.evaluate('!!document.querySelector("[data-classroom-results]")'), false); }
      await host.click('[data-classroom-action=close]'); await host.wait('document.querySelectorAll("[data-aggregate-choice]").length === 2');
      await host.evaluate('(() => {const field=document.querySelector("[data-branch]");field.value=field.options[1].value;field.dispatchEvent(new Event("change",{bubbles:true}));})()'); await host.click('[data-classroom-action=advance]');
    }
    for (const client of [host, ...members]) { await client.wait('!!document.querySelector("[data-classroom-debrief]")'); assert.equal(await client.evaluate('document.documentElement.scrollWidth <= innerWidth'), true); }
    for (const client of [host, ...members]) await client.close();
    reports.push({ id, soloDecisions: 3, soloRestart: true, sourceLocatorsAndUnknownRevisionShown: true, demoRoundtrip: true, demoProtectedCalls: 0, demoStoreUnchanged: true, authorPrivateSave: true, privateGetWithoutKey: (await fetch(apiOrigin + `/api/author/scenarios/${privateId}/1.0.0`)).status, classroomRounds: 3, classroomParticipants: 3, mobile360Overflow: false });
  }
  assert.deepEqual(errors, []); assert.equal(fs.readFileSync(path.join(project, 'content/scenarios/index.json')).equals(realManifest), true);
  const report = { scope: 'Real curated public manifest and production assets; isolated writable author store; local HTTP, not hosted deployment', base, apiOrigin, httpChecks, actualPublicCatalog: COLLEGE_IDS, newProductionAssetsStatus: 200, officialSourceCheck: 'PARTIAL', expertApproval: 'PENDING', reports, consoleErrors: errors };
  fs.writeFileSync(path.join(artifacts, 'college-browser-report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
  await control.send('Browser.close');
} finally { for (const socket of sockets) socket.close(); browser.kill(); api.kill(); for (const connection of connections) connection.destroy(); await new Promise(resolve => server.close(resolve)); }
