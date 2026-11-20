// Four isolated browser contexts: real host + three anonymous participants, real Nest/Socket.IO.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startScenarioApi, proxyApi } from './scenario-api-harness.mjs';
import { manageSmokeServer } from './smoke-server-lifecycle.mjs';

assert.ok(process.env.CHROME_BIN, 'Set CHROME_BIN to installed Chrome/Edge');
const root = path.resolve(fileURLToPath(new URL('../dist/client/browser/', import.meta.url)));
const artifacts = fileURLToPath(new URL('../.angular/', import.meta.url));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eds-classroom-browser-'));
const api = await startScenarioApi();
const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) { proxyApi(request, response, api.origin); return; }
  const url = new URL(request.url, 'http://localhost');
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
  response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon' }[path.extname(file)] ?? 'application/octet-stream');
  response.end(fs.readFileSync(file));
});
const lifecycle = manageSmokeServer(server);
server.on('upgrade', (request, socket, head) => {
  if (!request.url.startsWith('/api/classroom-socket/')) { socket.destroy(); return; }
  // Preserve original Host so the gateway can enforce browser Origin equality.
  const upstream = http.request(new URL(request.url, api.origin), { headers: request.headers });
  upstream.on('upgrade', (response, remote, remoteHead) => {
    lifecycle.track(remote);
    socket.write(`HTTP/1.1 ${response.statusCode} Switching Protocols\r\n` + Object.entries(response.headers).map(([key, value]) => `${key}: ${value}\r\n`).join('') + '\r\n');
    if (head.length) remote.write(head); if (remoteHead.length) socket.write(remoteHead);
    remote.pipe(socket); socket.pipe(remote);
    remote.on('error', () => socket.destroy()); socket.on('error', () => remote.destroy());
  });
  upstream.on('error', () => socket.destroy()); upstream.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = spawn(process.env.CHROME_BIN, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sockets = []; const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function cdp(url) {
  const socket = new WebSocket(url); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let serial = 0; const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { const task = pending.get(message.id); pending.delete(message.id); message.error ? task.reject(Error(JSON.stringify(message.error))) : task.resolve(message.result); }
    else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(JSON.stringify(message.params.args));
    else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const screenshot = async name => fs.writeFileSync(path.join(artifacts, name + '.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const wait = async expression => {
    for (let attempt = 0; attempt < 250; attempt++) { if (await evaluate(expression)) return; await sleep(40); }
    await screenshot('classroom-failure');
    // Report control states, never the page text containing a PIN/capability.
    const state = await evaluate(`({
      controls: Object.fromEntries(['create','join','open','close','advance','vote'].map(action => {
        const button = document.querySelector('[data-classroom-action="' + action + '"]');
        return [action, button ? { disabled: button.disabled } : null];
      })),
      choices: document.querySelectorAll('[data-classroom-choice]').length,
      voteRecorded: !!document.querySelector('[data-vote-recorded]'),
      aggregate: !!document.querySelector('[data-classroom-results]'),
      debrief: !!document.querySelector('[data-classroom-debrief]'),
      error: !!document.querySelector('[data-classroom-error]')
    })`);
    throw Error('Timeout: ' + expression + '\n' + JSON.stringify(state));
  };
  // Broadcasts can render a control before the command acknowledgement clears busy.
  // Native click()/Enter on a disabled button is ignored; presence alone is insufficient.
  const enabled = selector => wait(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`);
  const click = async selector => { await enabled(selector); return evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); };
  const fill = (selector, value) => evaluate(`(() => {const node=document.querySelector(${JSON.stringify(selector)});node.value=${JSON.stringify(value)};node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const enter = async selector => {
    await enabled(selector);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  };
  return { send, evaluate, wait, click, fill, screenshot, enter };
}
try {
  const activePort = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; !fs.existsSync(activePort) && attempt < 300; attempt++) await sleep(50);
  const port = Number(fs.readFileSync(activePort, 'utf8').split('\n')[0]);
  const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const control = await cdp(info.webSocketDebuggerUrl);
  async function page(url, mobile = false) {
    const context = await control.send('Target.createBrowserContext');
    const target = await control.send('Target.createTarget', { url: 'about:blank', browserContextId: context.browserContextId });
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const client = await cdp(targets.find(item => item.id === target.targetId).webSocketDebuggerUrl);
    await client.send('Runtime.enable'); await client.send('Log.enable'); await client.send('Page.enable');
    if (process.env.SMOKE_CPU_RATE) {
      const rate = Number(process.env.SMOKE_CPU_RATE);
      assert.ok(Number.isFinite(rate) && rate >= 1 && rate <= 20, 'SMOKE_CPU_RATE must be between 1 and 20');
      await client.send('Emulation.setCPUThrottlingRate', { rate });
    }
    await client.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 360 : 1280, height: mobile ? 800 : 960, deviceScaleFactor: 1, mobile });
    await client.send('Page.navigate', { url }); return client;
  }
  const host = await page(base + '/classroom/host');
  await host.wait('!!document.querySelector("[data-classroom-scenario] option")');
  await host.click('[data-classroom-action=create]'); await host.wait('!!document.querySelector("[data-room-pin]")');
  const pin = await host.evaluate('document.querySelector("[data-room-pin]").textContent.trim()');
  assert.match(pin, /^\d{6}$/);
  assert.equal(await host.evaluate('document.querySelector("[data-join-url]").value'), base + '/classroom/join/' + pin);
  const participants = await Promise.all([page(base + '/classroom/join/' + pin, true), page(base + '/classroom/join/' + pin), page(base + '/classroom/join/' + pin)]);
  for (const client of participants) {
    await client.wait('!!document.querySelector("[data-classroom-action=join]")');
    assert.equal(await client.evaluate('document.querySelectorAll("input").length'), 1);
    await client.click('[data-classroom-action=join]'); await client.wait('!!document.querySelector("[data-room-pin]")');
  }
  await host.click('[data-classroom-action=advance]');
  for (let round = 1; round <= 3; round++) {
    await host.wait('!!document.querySelector("[data-classroom-action=open]")'); await host.click('[data-classroom-action=open]');
    for (const [index, client] of participants.entries()) {
      await client.wait('!!document.querySelector("[data-classroom-choice]")');
      if (!index) { await client.enter('[data-classroom-choice]'); await client.wait('!!document.querySelector("[data-classroom-action=vote]")'); await client.enter('[data-classroom-action=vote]'); }
      else { await client.click('[data-classroom-choice]'); await client.click('[data-classroom-action=vote]'); }
      await client.wait('!!document.querySelector("[data-vote-recorded]")');
      assert.equal(await host.evaluate('!!document.querySelector("[data-classroom-results]")'), false);
      assert.equal(await client.evaluate('!!document.querySelector("[data-classroom-results]")'), false);
      assert.equal(await client.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    }
    if (round === 1) await participants[0].screenshot('classroom-participant-mobile');
    await host.click('[data-classroom-action=close]');
    for (const client of [host, ...participants]) { await client.wait('document.querySelectorAll("[data-aggregate-choice]").length === 2'); assert.equal(await client.evaluate('document.body.innerText.includes("Усього голосів: 3")'), true); }
    if (round === 1) await host.screenshot('classroom-host-aggregate');
    await host.evaluate(`(() => {const node=document.querySelector('[data-branch]');node.value=node.options[1].value;node.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await host.click('[data-classroom-action=advance]');
  }
  for (const client of [host, ...participants]) {
    await client.wait('!!document.querySelector("[data-classroom-debrief]")');
    assert.equal(await client.evaluate('localStorage.length + sessionStorage.length'), 0);
  }
  // A second room with only two votes must hide even the exact turnout.
  await host.send('Page.navigate', { url: base + '/classroom/host' });
  await host.wait('!!document.querySelector("[data-classroom-scenario] option")'); await host.click('[data-classroom-action=create]'); await host.wait('!!document.querySelector("[data-room-pin]")');
  const smallPin = await host.evaluate('document.querySelector("[data-room-pin]").textContent.trim()');
  for (const client of participants.slice(0, 2)) { await client.send('Page.navigate', { url: base + '/classroom/join/' + smallPin }); await client.wait('!!document.querySelector("[data-classroom-action=join]")'); await client.click('[data-classroom-action=join]'); await client.wait('!!document.querySelector("[data-room-pin]")'); }
  await host.click('[data-classroom-action=advance]'); await host.wait('!!document.querySelector("[data-classroom-action=open]")'); await host.click('[data-classroom-action=open]');
  for (const client of participants.slice(0, 2)) { await client.wait('!!document.querySelector("[data-classroom-choice]")'); await client.click('[data-classroom-choice]'); await client.click('[data-classroom-action=vote]'); await client.wait('!!document.querySelector("[data-vote-recorded]")'); }
  await host.click('[data-classroom-action=close]');
  for (const client of [host, ...participants.slice(0, 2)]) { await client.wait('!!document.querySelector("[data-results-suppressed]")'); assert.equal(await client.evaluate('document.querySelectorAll("[data-aggregate-choice]").length'), 0); }
  await host.screenshot('classroom-small-group-suppressed');
  assert.deepEqual(errors, []);
  const report = { browserContexts: 4, participants: 3, completeDecisionRounds: 3, keyboardVote: true, noLiveResults: true, afterCloseAggregateOnly: true, sharedEngineDebrief: true, smallGroupTwoVotesSuppressed: true, mobile360Overflow: false, noIdentityPrompt: true, browserStorageEmpty: true, consoleErrors: errors };
  fs.writeFileSync(path.join(artifacts, 'classroom-browser-report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
  await control.send('Browser.close');
} finally {
  for (const socket of sockets) socket.close();
  browser.kill();
  try { await lifecycle.close(); } finally { api.close(); }
}
