import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { manageSmokeServer } from './smoke-server-lifecycle.mjs';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

test('smoke cleanup closes an idle listening server', { timeout: 7000 }, async () => {
  const server = http.createServer();
  const lifecycle = manageSmokeServer(server);
  await listen(server);
  await lifecycle.close();
  assert.equal(server.listening, false);
});

test('smoke cleanup destroys an active HTTP TCP connection', { timeout: 7000 }, async () => {
  const server = http.createServer();
  const lifecycle = manageSmokeServer(server);
  const port = await listen(server);
  const accepted = once(server, 'connection');
  const client = net.connect(port, '127.0.0.1');
  try {
    const [socket] = await accepted;
    const closed = once(client, 'close');
    await lifecycle.close();
    await closed;
    assert.equal(socket.destroyed, true);
    assert.equal(server.listening, false);
  } finally { client.destroy(); }
});

test('smoke cleanup closes both ends of a real upgraded WebSocket proxy', { timeout: 7000 }, async () => {
  const backend = http.createServer();
  const backendLifecycle = manageSmokeServer(backend);
  backend.on('upgrade', (_request, socket) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
  });
  const backendPort = await listen(backend);
  const proxy = http.createServer();
  const lifecycle = manageSmokeServer(proxy);
  let downstream;
  let upstream;
  proxy.on('upgrade', (_request, socket) => {
    downstream = socket;
    const request = http.request({ host: '127.0.0.1', port: backendPort, headers: { Connection: 'Upgrade', Upgrade: 'websocket' } });
    request.on('upgrade', (_response, remote) => {
      upstream = lifecycle.track(remote);
      socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
      remote.pipe(socket); socket.pipe(remote);
    });
    request.end();
  });
  const port = await listen(proxy);
  const client = net.connect(port, '127.0.0.1');
  try {
    await once(client, 'connect');
    const response = once(client, 'data');
    client.write('GET /socket HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
    assert.match(String((await response)[0]), /101 Switching Protocols/);
    const closed = once(client, 'close');
    await lifecycle.close();
    await closed;
    assert.equal(downstream.destroyed, true);
    assert.equal(upstream.destroyed, true);
    assert.equal(proxy.listening, false);
  } finally { client.destroy(); await backendLifecycle.close(); }
});
