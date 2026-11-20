// Fresh private visitor, actual production Angular + Nest, synthetic data only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startScenarioApi, proxyApi } from './scenario-api-harness.mjs';

const requireSchema = createRequire(new URL('../../../packages/scenario-schema/package.json', import.meta.url));
const { validateScenario } = requireSchema('@eds/scenario-schema');
assert.ok(process.env.CHROME_BIN, 'Set CHROME_BIN to installed Chrome/Edge');
const root = path.resolve(fileURLToPath(new URL('../dist/client/browser/', import.meta.url)));
const artifacts = fileURLToPath(new URL('../.angular/', import.meta.url));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eds-public-demo-'));
const downloads = path.join(profile, 'downloads'); fs.mkdirSync(downloads);
const api = await startScenarioApi();
const storeFile = path.join(api.dataDirectory, 'scenarios.json');
const originalStore = fs.readFileSync(storeFile);
const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) { proxyApi(request, response, api.origin); return; }
  const url = new URL(request.url, 'http://localhost');
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(url.pathname)); }
  catch { response.writeHead(400); response.end(); return; }
  if (!file.startsWith(root) || path.relative(root, file).startsWith('..')) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(url.pathname)) { response.writeHead(404); response.end(); return; }
    file = path.join(root, 'index.html');
  }
  response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' }[path.extname(file)] ?? 'application/octet-stream');
  response.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = spawn(process.env.CHROME_BIN, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws; let browserControl;
try {
  const httpChecks = [];
  for (const filename of ['index.json', 'report-under-pressure.json', 'fair-selection.json', 'quiet-after-formation.json']) {
    const response = await fetch(base + '/scenarios/' + filename);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /application\/json/);
    const value = await response.json();
    if (filename === 'index.json') assert.deepEqual(value, ['report-under-pressure.json', 'fair-selection.json', 'quiet-after-formation.json']);
    else assert.equal(validateScenario(value).success, true);
    httpChecks.push({ path: '/scenarios/' + filename, status: response.status, contentType: response.headers.get('content-type') });
  }
  assert.equal((await fetch(base + '/scenarios/private.json')).status, 404);
  for (const route of ['/studio/demo', '/play', '/debrief', '/scenarios']) {
    const response = await fetch(base + route); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/html/);
  }
  const health = await fetch(base + '/api/health'); assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', service: 'ethical-dilemmas-api' });
  assert.equal((await fetch(base + '/api/scenarios')).status, 200);
  assert.equal((await fetch(base + '/api/author/scenarios')).status, 401);
  assert.equal((await fetch(base + '/api/reviewer/scenarios/x/1.0.0/review', { method: 'POST' })).status, 503);
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; !fs.existsSync(portFile) && attempt < 300; attempt++) await sleep(50);
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  const browserInfo = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  browserControl = new WebSocket(browserInfo.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { browserControl.onopen = resolve; browserControl.onerror = reject; });
  let browserSerial = 0; const browserPending = new Map();
  browserControl.onmessage = event => {
    const value = JSON.parse(event.data); if (!value.id) return;
    const task = browserPending.get(value.id); browserPending.delete(value.id);
    value.error ? task.reject(Error(JSON.stringify(value.error))) : task.resolve(value.result);
  };
  const browserSend = (method, params = {}) => new Promise((resolve, reject) => { const id = ++browserSerial; browserPending.set(id, { resolve, reject }); browserControl.send(JSON.stringify({ id, method, params })); });
  // CDP-created browser contexts are off-the-record and have isolated storage.
  const { browserContextId } = await browserSend('Target.createBrowserContext');
  const { targetId } = await browserSend('Target.createTarget', { url: 'about:blank', browserContextId });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let serial = 0; const pending = new Map(); const errors = []; const privilegedCalls = []; const draftBodyCalls = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject, method }); ws.send(JSON.stringify({ id, method, params })); });
  ws.onmessage = event => {
    const value = JSON.parse(event.data);
    if (value.id) { const task = pending.get(value.id); pending.delete(value.id); value.error ? task.reject(Error(task.method + ': ' + JSON.stringify(value.error))) : task.resolve(value.result); }
    else if (value.method === 'Runtime.exceptionThrown') errors.push(value.params.exceptionDetails.text);
    else if (value.method === 'Runtime.consoleAPICalled' && value.params.type === 'error') errors.push('console.error');
    else if (value.method === 'Log.entryAdded' && value.params.entry.level === 'error') errors.push(value.params.entry.text);
    else if (value.method === 'Page.javascriptDialogOpening') void send('Page.handleJavaScriptDialog', { accept: true });
    else if (value.method === 'Network.requestWillBeSent') {
      const request = value.params.request; const pathname = new URL(request.url).pathname;
      if (/^\/api\/(author|reviewer)(\/|$)/.test(pathname)) privilegedCalls.push(pathname);
      if (request.postData?.includes('demo-browser-dilemma')) draftBodyCalls.push(pathname);
      assert.equal(Object.keys(request.headers).some(key => key.toLowerCase() === 'authorization'), false);
    }
  };
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const screenshot = async name => fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const wait = async expression => {
    for (let attempt = 0; attempt < 300; attempt++) {
      try { if (await evaluate(expression)) return; }
      catch (error) { if (!/Inspected target navigated|Execution context was destroyed|Cannot find context/.test(error.message)) throw error; }
      await sleep(40);
    }
    await screenshot('demo-studio-failure'); throw Error('Timeout: ' + expression + '\n' + await evaluate('document.body.innerText.slice(0,2500)'));
  };
  const click = selector => evaluate(`(() => {const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw Error('Missing control');for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;node.click();})()`);
  const fill = (selector, text) => evaluate(`(() => {const field=document.querySelector(${JSON.stringify(selector)});if(!field)throw Error('Missing field');for(let p=field.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;field.value=${JSON.stringify(text)};field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const field = (name, value) => fill(`[data-field-path="${name}"]`, value);
  const enter = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable');
  await browserSend('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, browserContextId });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base + '/' }); await wait('!!document.querySelector("[data-action=try-studio]")');
  await enter('[data-action=try-studio]'); await wait('!!document.querySelector("[data-action=new-draft]")');
  assert.equal(await evaluate('!!document.querySelector("[data-action=author-key]")'), false);
  await click('[data-action=new-draft]'); await wait('!!document.querySelector("[data-field-path=id]")');
  await field('id', 'demo-browser-dilemma'); await field('title', 'Навчальна дилема');
  await field('summary', 'Синтетичний навчальний приклад розподілу часу відкритого курсу, без персональних або службових даних.');
  await field('nodes.0.narrative', 'Вигаданий навчальний центр узгоджує час відкритого курсу. Треба врахувати доступність, точність і терміни.');
  for (let step = 1; step <= 3; step++) {
    await field(`nodes.${step}.narrative`, `Етап ${step}: команда має обрати обґрунтований спосіб узгодження навчального курсу.`);
    for (let choice = 0; choice < 2; choice++) {
      await field(`nodes.${step}.choices.${choice}.label`, choice ? `Звузити обсяг на етапі ${step}` : `Уточнити потреби на етапі ${step}`);
      await field(`nodes.${step}.choices.${choice}.explanation`, 'Це навчальна альтернатива: зважте витрати часу та доступність, без автоматичного правового висновку.');
      await field(`nodes.${step}.choices.${choice}.immediateEffects.0.delta`, String(step === 1 ? 1 : 2));
    }
  }
  await field('nodes.1.choices.0.schedule.0.trigger.count', '1');
  await field('nodes.1.choices.0.schedule.0.effects.0.metric', 'trust');
  await field('nodes.1.choices.0.schedule.0.effects.0.delta', '2');
  await field('nodes.1.choices.0.schedule.0.consequenceText', 'Після наступного рішення команда отримує відгук про узгоджені очікування.');
  for (const ending of [4, 5]) {
    await field(`nodes.${ending}.narrative`, 'Команда завершила навчальне узгодження та повертається до припущень.');
    for (const key of ['summary', 'shortTerm', 'longTerm', 'trustAndReputation']) await field(`nodes.${ending}.debrief.${key}`, 'Навчальний результат: обговоріть баланс доступності, часу й обґрунтованості. Це авторська модель, не оцінка особи.');
    await field(`nodes.${ending}.debrief.reflectionQuestions.0`, 'Який додатковий факт змінив би обраний компроміс?');
  }
  const sourceIndex = await evaluate('document.querySelectorAll(\'[data-field-path$=".sourceId"]\').length');
  await click('[data-add="sources"]');
  for (const [key, value] of Object.entries({ sourceId: 'demo-method', title: 'Синтетична методична нотатка — не правове першоджерело', sourceType: 'methodology', documentType: 'methodology', pinpoint: 'Пункт 1 синтетичної нотатки', versionAsOf: '2026-11-20', revision: 'Синтетична навчальна редакція 1', relevance: 'Пояснює потребу враховувати різні перспективи у вигаданому курсі.', applicabilityQuestions: 'Немає зовнішньої перевірки; матеріал лише демонстраційний.' })) await field(`sources.${sourceIndex}.${key}`, value);
  const refIndex = await evaluate('document.querySelectorAll(\'select[data-field-path^="nodes.1.choices.0.sourceIds."]\').length');
  await click('[data-add="nodes.1.choices.0.sourceIds"]'); await field(`nodes.1.choices.0.sourceIds.${refIndex}`, 'demo-method');
  await field('nodes.1.choices.0.legalStatus', 'uncertain');
  await field(`sources.${sourceIndex}.sourceId`, 'broken-reference'); await click('[data-action=validate]');
  await wait('document.body.innerText.includes("SOURCE_NOT_FOUND")');
  await field(`sources.${sourceIndex}.sourceId`, 'demo-method');
  await field('startNodeId', 'ending-a'); await click('[data-action=validate]'); await wait('document.body.innerText.includes("TOO_SHORT_PATH")');
  await field('startNodeId', 'intro'); await click('[data-action=validate]'); await wait('document.body.innerText.includes("Структура й граф валідні")');
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  await evaluate('document.querySelectorAll(".studio-editor details").forEach(node=>node.open=true)');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true); await screenshot('demo-studio-mobile');
  await enter('[data-action=export]');
  const exportedFile = path.join(downloads, 'demo-browser-dilemma-1.0.0.json');
  for (let attempt = 0; !fs.existsSync(exportedFile) && attempt < 200; attempt++) await sleep(50);
  const exported = JSON.parse(fs.readFileSync(exportedFile, 'utf8')); assert.equal(validateScenario(exported).success, true);
  assert.equal(exported.sources.at(-1).verificationStatus, 'unverified'); assert.equal(exported.contentReview.demoOnly, true);
  const play = async () => {
    await click('[data-action=preview]'); await wait('!!document.querySelector("[data-action=advance]")'); await click('[data-action=advance]');
    for (let step = 0; step < 3; step++) { await wait('!!document.querySelector("[data-choice-id]")'); await click('[data-choice-id]'); await click('[data-action=confirm]'); await wait('!!document.querySelector("[data-action=feedback-next]")'); await click('[data-action=feedback-next]'); }
    await wait('!!document.querySelector(\'a[href$="/demo-browser-dilemma/debrief"]\')'); await click('a[href$="/demo-browser-dilemma/debrief"]');
    await wait('document.querySelectorAll(".decision-history li").length === 3');
    assert.equal(await evaluate('!!document.querySelector(\'[data-source-id="demo-method"]\')'), true);
    assert.equal(await evaluate('document.body.textContent.includes("Відкладений наслідок настав")'), true);
    assert.equal(await evaluate('document.body.textContent.includes("Не перевірено")'), true);
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".dimensions strong")].map(node=>Number(node.textContent))'), [3, 0, 2, 2]);
    await screenshot('demo-studio-debrief');
    await click('.back-link'); await wait('!!document.querySelector("[data-action=export]")');
  };
  await play();
  await click('[data-action=reset-demo]'); await wait('!document.querySelector("[data-action=export]")');
  await fill('[data-action=import-json]', JSON.stringify(exported)); await click('[data-action=import]'); await wait('!!document.querySelector("[data-action=export]")');
  const roundtripDirectory = path.join(profile, 'roundtrip'); fs.mkdirSync(roundtripDirectory);
  await browserSend('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: roundtripDirectory, browserContextId }); await click('[data-action=export]');
  const roundtripFile = path.join(roundtripDirectory, 'demo-browser-dilemma-1.0.0.json');
  for (let attempt = 0; !fs.existsSync(roundtripFile) && attempt < 200; attempt++) await sleep(50);
  assert.deepEqual(JSON.parse(fs.readFileSync(roundtripFile, 'utf8')), exported); await play();
  const forged = structuredClone(exported);
  forged.sources.at(-1).verificationStatus = 'expert_checked'; forged.sources.at(-1).verifiedAt = '2026-11-20';
  for (const [payload, code] of [['{', 'INVALID_JSON'], [JSON.stringify({ ...exported, legalAssessments: [] }), 'INVALID_STRUCTURE'], [JSON.stringify(forged), 'SOURCE_METADATA_INCOMPLETE']]) {
    await fill('[data-action=import-json]', payload); await click('[data-action=import]');
    await wait(`document.body.textContent.includes(${JSON.stringify(code)})`);
    assert.equal(await evaluate('document.querySelector("[data-field-path=id]").value'), exported.id);
  }
  await send('Page.reload'); await wait('!!document.querySelector("[data-action=new-draft]")');
  assert.equal(await evaluate('!!document.querySelector("[data-action=export]")'), false);
  assert.equal(await evaluate('localStorage.length + sessionStorage.length'), 0);
  assert.deepEqual(privilegedCalls, []); assert.deepEqual(draftBodyCalls, []); assert.deepEqual(errors, []);
  assert.equal(fs.readFileSync(storeFile).equals(originalStore), true);
  assert.equal((await fetch(base + '/api/scenarios/demo-browser-dilemma')).status, 404);
  const privateRecords = await (await fetch(api.origin + '/api/author/scenarios', { headers: { Authorization: `Bearer ${api.authorKey}` } })).json();
  assert.equal(privateRecords.some(record => record.scenario.id === exported.id), false);
  fs.writeFileSync(path.join(artifacts, 'demo-created-scenario.json'), JSON.stringify(exported, null, 2) + '\n');
  const report = { privateVisitor: true, keyRequired: false, reusedStudioForms: true, uiDecisions: 3, finalMetrics: [3, 0, 2, 2], delayedEventVisible: true, replayAfterImport: true, sourceMetadataRoundtrip: true, sourceStatus: 'unverified', forgedReviewMetadataRejected: true, malformedAndUnknownFieldsRejected: true, brokenSourceReferenceBlocked: true, shortPathBlocked: true, protectedBrowserRequests: privilegedCalls, draftBodyRequests: draftBodyCalls, serverStoreUnchanged: true, absentFromPrivateAndPublicCatalog: true, refreshClearsDraft: true, browserStorageEntries: 0, mobile360Overflow: false, keyboardEntryAndExport: true, httpChecks, missingJson: 404, consoleErrors: errors, productionProxy: 'local HTTP harness, not hosted Nginx/TLS' };
  fs.writeFileSync(path.join(artifacts, 'demo-studio-browser-report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
  await browserSend('Browser.close');
} finally { ws?.close(); browserControl?.close(); browser.kill(); api.close(); await new Promise(resolve => server.close(resolve)); }
