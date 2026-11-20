// Local production-browser smoke. Requires Node 22 and CHROME_BIN (Chrome/Edge).
// No third-party browser package, external service or learner data is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { startScenarioApi, proxyApi } from './scenario-api-harness.mjs';

assert.ok(process.env.CHROME_BIN, 'Set CHROME_BIN to an installed Chromium browser');
const root = path.resolve(fileURLToPath(new URL('../dist/client/browser/', import.meta.url)));
const artifacts = fileURLToPath(new URL('../.angular/', import.meta.url));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eds-solo-smoke-'));
const api = await startScenarioApi();
const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) { proxyApi(request, response, api.origin); return; }
  const url = new URL(request.url, 'http://localhost');
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(url.pathname)) { response.writeHead(404); response.end(); return; }
    file = path.join(root, 'index.html');
  }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' };
  response.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
  response.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const child = spawn(process.env.CHROME_BIN, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; !fs.existsSync(portFile) && attempt < 300; attempt++) await sleep(50);
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const promise = pending.get(data.id); pending.delete(data.id);
      data.error ? promise.reject(new Error(JSON.stringify(data.error))) : promise.resolve(data.result);
    } else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
    else if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') errors.push(JSON.stringify(data.params.args));
    // A missing scenario deliberately produces one HTTP 404; script/runtime errors still fail.
    else if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error' && !data.params.entry.text.includes('404')) errors.push(data.params.entry.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const request = ++id; pending.set(request, { resolve, reject }); ws.send(JSON.stringify({ id: request, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = async expression => {
    for (let attempt = 0; attempt < 200; attempt++) { if (await evaluate(expression)) return; await sleep(50); }
    console.error(await evaluate('JSON.stringify({url:location.pathname,focus:document.activeElement?.outerHTML,selected:[...document.querySelectorAll("[aria-pressed]")].map(node=>({id:node.dataset.choiceId,pressed:node.getAttribute("aria-pressed")}))})'));
    await screenshot('solo-smoke-failure');
    throw new Error('Timeout: ' + expression);
  };
  const enter = async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  };
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const screenshot = async name => fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base + '/' });
  await wait('document.querySelectorAll(".scenario-card").length === 3');
  assert.equal(await evaluate('location.pathname'), '/scenarios');
  assert.equal(await evaluate('document.documentElement.lang'), 'uk');
  await screenshot('solo-catalog-desktop');
  const cases = ['report-under-pressure', 'fair-selection', 'quiet-after-formation'].map(id => {
    const scenario = JSON.parse(fs.readFileSync(new URL('../../../content/scenarios/' + id + '.json', import.meta.url), 'utf8'));
    const route = JSON.parse(fs.readFileSync(new URL('../../../content/qa/' + id + '.routes.json', import.meta.url), 'utf8')).routes[0];
    return { id, choices: route.choices.map(choice => choice.choiceId), metrics: Object.values(route.finalMetrics), ending: scenario.nodes.find(node => node.id === route.ending).title };
  });
  const results = [];
  for (const [index, item] of cases.entries()) {
    if (index) {
      await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
      await click('.back-link');
      await wait('document.querySelectorAll(".scenario-card").length === 3');
      await screenshot('solo-catalog-mobile');
    }
    await click(`.scenario-card a[href="/scenarios/${item.id}/play"]`);
    await wait('!!document.querySelector("[data-action=advance]")');
    await click('[data-action=advance]');
    for (const [step, choice] of item.choices.entries()) {
      await wait(`!!document.querySelector('[data-choice-id="${choice}"]')`);
      await wait('document.activeElement.id === "node-heading"');
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      await evaluate(`document.querySelector('[data-choice-id="${choice}"]').focus()`);
      await enter();
      await wait('!!document.querySelector("[data-action=confirm]")');
      if (index === 1 && step === 0) await screenshot('solo-decision-mobile');
      await evaluate('document.querySelector("[data-action=confirm]").focus()');
      await enter();
      await wait('!!document.querySelector("#feedback-heading")');
      assert.equal(await evaluate('document.querySelectorAll("[data-choice-id]").length'), 0);
      if (!step) assert.equal(await evaluate('document.body.innerText.includes("Після ще двох рішень")'), false);
      await click('[data-action=feedback-next]');
    }
    await wait(`!!document.querySelector('a[href="/scenarios/${item.id}/debrief"]')`);
    assert.equal(await evaluate('document.body.innerText.includes(' + JSON.stringify(item.ending) + ')'), true);
    await click(`a[href="/scenarios/${item.id}/debrief"]`);
    await wait('document.querySelectorAll(".decision-history li").length === 3');
    assert.equal(await evaluate('document.body.innerText.includes("Відкладений наслідок настав")'), true);
    assert.ok(await evaluate('document.querySelectorAll(".source-card").length >= 2'));
    const actualMetrics = await evaluate('[...document.querySelectorAll(".dimensions strong")].map(node => Number(node.textContent))');
    assert.deepEqual(actualMetrics, item.metrics);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await screenshot('solo-debrief-' + item.id);
    await click('[data-action=restart]');
    await wait('!!document.querySelector("[data-action=advance]")');
    assert.equal(await evaluate('document.body.innerText.includes("Прийнято рішень: 0")'), true);
    results.push({ ...item, decisionCount: 3, restart: true });
  }
  // True page reloads destroy in-memory state, including on a deep debrief URL.
  await send('Page.navigate', { url: base + '/scenarios/report-under-pressure/debrief' });
  await wait('document.body.innerText.includes("Немає завершеного проходження")');
  await send('Page.navigate', { url: base + '/scenarios/missing/play' });
  await wait('document.body.innerText.includes("Сценарій не знайдено")');
  await send('Page.navigate', { url: base + '/play' });
  await wait('document.body.innerText.includes("Оберіть навчальну ситуацію")');
  await send('Page.navigate', { url: base + '/' });
  await wait('document.querySelectorAll(".scenario-card").length === 3');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate('document.activeElement.classList.contains("skip-link")'), true);
  await enter();
  await wait('document.activeElement.id === "main-content"');
  assert.deepEqual(errors, []);
  const report = { browser: 'Headless Chromium', fullJourneys: results, mobile360Overflow: false, keyboardChoices: true, keyboardSkipLink: true, deepLinksWithoutState: true, missingScenario: true, consoleErrors: errors };
  fs.writeFileSync(path.join(artifacts, 'solo-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  await send('Browser.close');
} finally {
  ws?.close(); child.kill(); api.close(); await new Promise(resolve => server.close(resolve));
}
