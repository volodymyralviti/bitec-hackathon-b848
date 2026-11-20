// Full-stack production UI smoke: real Nest API + real Edge/Chrome, temporary data only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { startScenarioApi, proxyApi } from './scenario-api-harness.mjs';

assert.ok(process.env.CHROME_BIN, 'Set CHROME_BIN');
const root = path.resolve(fileURLToPath(new URL('../dist/client/browser/', import.meta.url)));
const artifacts = fileURLToPath(new URL('../.angular/', import.meta.url));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eds-studio-browser-'));
const downloads = path.join(profile, 'downloads'); fs.mkdirSync(downloads);
const api = await startScenarioApi();
const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) { proxyApi(request, response, api.origin); return; }
  const url = new URL(request.url, 'http://localhost');
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
  response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)] ?? 'application/octet-stream');
  response.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const child = spawn(process.env.CHROME_BIN, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  assert.equal((await fetch(api.origin + '/api/author/scenarios')).status, 401);
  assert.equal((await fetch(api.origin + '/api/reviewer/scenarios/test/1.0.0/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 503);
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; !fs.existsSync(portFile) && attempt < 300; attempt++) await sleep(50);
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.id) { const promise = pending.get(data.id); pending.delete(data.id); data.error ? promise.reject(new Error(JSON.stringify(data.error))) : promise.resolve(data.result); }
    else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
    else if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') errors.push(JSON.stringify(data.params.args));
    else if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') errors.push(data.params.entry.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const request = ++id; pending.set(request, { resolve, reject }); ws.send(JSON.stringify({ id: request, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const screenshot = async name => fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const wait = async expression => {
    for (let attempt = 0; attempt < 250; attempt++) { if (await evaluate(expression)) return; await sleep(40); }
    await screenshot('studio-smoke-failure'); throw new Error('Timeout: ' + expression + '\n' + await evaluate('document.body.innerText.slice(0,3000)'));
  };
  const click = selector => evaluate(`(() => {const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw Error('Missing button');for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;node.click();})()`);
  const fill = (selector, value) => evaluate(`(() => {const field=document.querySelector(${JSON.stringify(selector)});if(!field)throw Error('Missing field');for(let p=field.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;field.value=${JSON.stringify(value)};field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const field = (name, value) => fill(`[data-field-path="${name}"]`, value);
  const buttonByText = text => evaluate(`(() => {const button=[...document.querySelectorAll('button')].find(node=>node.textContent.includes(${JSON.stringify(text)}));if(!button)throw Error('Missing button');button.click();})()`);
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base + '/studio' });
  await wait('!!document.querySelector("[data-action=author-key]")');
  await fill('[data-action=author-key]', api.authorKey); await click('[data-action=login]');
  await wait('!!document.querySelector("[data-action=new-draft]")');
  assert.equal(await evaluate('document.querySelector("[data-action=author-key]")'), null);
  await click('[data-action=new-draft]'); await wait('!!document.querySelector("[data-field-path=id]")');
  await field('id', 'browser-authored');
  await field('title', 'Навчальний простір: доступність і термін');
  await field('summary', 'Вигадана дилема навчального центру сектору безпеки й оборони: узгодження доступності загального курсу без персональних чи операційних відомостей.');
  await field('nodes.0.narrative', 'Навчальний центр планує відкритий загальний курс. Потрібно узгодити термін запуску, доступність матеріалів і спроможність команди.');
  const stages = [
    ['До запуску бракує перевірки доступності матеріалів. Що зробити спочатку?', 'Провести коротку консультацію', 'Зберегти термін і звузити обсяг'],
    ['Колеги пропонують два способи перевірки. Яку участь організувати?', 'Запросити різні перспективи', 'Залучити невелику фахову групу'],
    ['Обмеження залишаються. Як зафіксувати остаточне рішення?', 'Запустити обмежений пілот', 'Відкласти запуск для перевірки']
  ];
  for (const [index, [narrative, first, second]] of stages.entries()) {
    await field(`nodes.${index + 1}.narrative`, narrative);
    await field(`nodes.${index + 1}.choices.0.label`, first);
    await field(`nodes.${index + 1}.choices.1.label`, second);
    for (let choice = 0; choice < 2; choice++) await field(`nodes.${index + 1}.choices.${choice}.explanation`, choice ? 'Зберігає зосередженість команди, але звужує коло врахованих перспектив і потребує подальшого перегляду.' : 'Посилює обґрунтованість рішення, але потребує додаткового часу й узгодження очікувань.');
  }
  // Add and edit an actual extra choice using the recursive form, no JSON/code edits.
  await click('[data-add="nodes.1.choices"]');
  await wait(`!!document.querySelector('[data-field-path="nodes.1.choices.2.nextNodeId"]')`);
  await field('nodes.1.choices.2.label', 'Підготувати поетапний запуск');
  await field('nodes.1.choices.2.nextNodeId', 'decision-2');
  await field('nodes.1.choices.2.explanation', 'Дає ранній доступ до частини матеріалу, але створює додаткову роботу з пояснення меж пілоту.');
  // Broken graph is rejected before any private save/public exposure.
  await field('startNodeId', 'ending-a'); await click('[data-action=save-draft]');
  await wait('document.body.innerText.includes("TOO_SHORT_PATH")');
  assert.equal((await fetch(api.origin + '/api/scenarios/browser-authored')).status, 404);
  await field('startNodeId', 'intro'); await click('[data-action=validate]');
  await click('[data-action=save-draft]');
  await wait('document.body.innerText.includes("Публічний каталог не змінено")');
  assert.equal((await fetch(api.origin + '/api/scenarios/browser-authored')).status, 404);
  await screenshot('studio-editor-desktop');
  await click('[data-action=export]');
  const exportedFile = path.join(downloads, 'browser-authored-1.0.0.json');
  for (let attempt = 0; !fs.existsSync(exportedFile) && attempt < 200; attempt++) await sleep(50);
  const exported = JSON.parse(fs.readFileSync(exportedFile, 'utf8'));
  assert.equal(exported.nodes.filter(node => node.type === 'decision').length, 3);
  assert.equal(JSON.stringify(exported).includes(api.authorKey), false);
  await click('[data-action=preview]'); await wait('!!document.querySelector("[data-action=advance]")');
  assert.equal(await evaluate('document.body.innerText.includes("Приватний preview")'), true);
  await click('[data-action=advance]');
  for (let number = 0; number < 3; number++) {
    await wait('!!document.querySelector("[data-choice-id]")'); await click('[data-choice-id]');
    await click('[data-action=confirm]'); await wait('!!document.querySelector("[data-action=feedback-next]")'); await click('[data-action=feedback-next]');
  }
  await wait(`!!document.querySelector('a[href="/studio/preview/browser-authored/debrief"]')`);
  await click('a[href="/studio/preview/browser-authored/debrief"]');
  await wait('document.querySelectorAll(".decision-history li").length === 3');
  await screenshot('studio-private-debrief');
  assert.equal((await fetch(api.origin + '/api/scenarios/browser-authored')).status, 404);
  await click('.back-link'); await wait('!!document.querySelector("[data-action=export]")');
  // Roundtrip the browser-downloaded JSON through the editor import UI.
  await fill('[data-action=import-json]', JSON.stringify(exported)); await click('[data-action=import]');
  const roundtripDirectory = path.join(profile, 'roundtrip'); fs.mkdirSync(roundtripDirectory);
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: roundtripDirectory });
  await click('[data-action=export]');
  const roundtripFile = path.join(roundtripDirectory, 'browser-authored-1.0.0.json');
  for (let attempt = 0; !fs.existsSync(roundtripFile) && attempt < 200; attempt++) await sleep(50);
  assert.deepEqual(JSON.parse(fs.readFileSync(roundtripFile, 'utf8')), exported);
  // Open the saved private revision, then explicitly expose only an unreviewed demo.
  await click('[data-record-id="browser-authored@1.0.0"]');
  await evaluate(`(() => {const checkbox=[...document.querySelectorAll('input[type=checkbox]')].find(node=>node.parentElement.textContent.includes('підтверджую публічний'));checkbox.click();})()`);
  await buttonByText('Відкрити збережену версію як demo-only');
  await wait('document.body.innerText.includes("Вона тепер незмінна")');
  const demo = await (await fetch(api.origin + '/api/scenarios/browser-authored')).json();
  assert.equal(demo.publicationStatus, 'demo'); assert.equal(demo.contentReview.status, 'draft'); assert.equal(demo.contentReview.aiAssisted, true);
  assert.equal(await evaluate('document.querySelector("[data-action=save-draft]").disabled'), true);
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelectorAll('.studio-editor details').forEach(node => node.open=true)`);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await evaluate(`document.querySelector('[data-field-path="nodes.1.choices.0.immediateEffects.0.delta"]').scrollIntoView({block:'center'})`);
  await screenshot('studio-editor-mobile');
  await evaluate('document.querySelector("[data-action=export]").focus()');
  assert.equal(await evaluate('document.activeElement.dataset.action'), 'export');
  assert.equal(await evaluate('localStorage.length + sessionStorage.length'), 0);
  assert.deepEqual(errors, []);
  const report = { backend: 'real NestJS, isolated temporary file store', unauthorizedAuthor: 401, disabledReviewer: 503, authoredViaForms: true, decisions: 3, addedChoice: true, brokenGraphBlocked: true, privateDraftHidden: true, browserJsonRoundtrip: true, isolatedParticipantPreview: true, previewDecisions: 3, explicitDemoOnly: true, expertApproved: false, immutableDemo: true, mobile360Overflow: false, keyStoredInBrowserStorage: false, consoleErrors: errors };
  fs.writeFileSync(path.join(artifacts, 'studio-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2)); await send('Browser.close');
} finally { ws?.close(); child.kill(); api.close(); await new Promise(resolve => server.close(resolve)); }
