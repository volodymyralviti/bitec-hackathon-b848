// Test-harness sockets only: HTTP closeAllConnections() excludes upgraded sockets.
export function manageSmokeServer(server) {
  const sockets = new Set();
  const track = socket => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    return socket;
  };
  server.on('connection', track);
  return {
    track,
    async close() {
      let timer;
      try {
        await new Promise((resolve, reject) => {
          // Keep this timer referenced: an incomplete cleanup must fail explicitly,
          // not leave an unsettled top-level await when all other handles disappear.
          timer = setTimeout(() => reject(Error('Smoke HTTP/WebSocket server cleanup timed out')), 5000);
          // Stop accepting connections before destroying all tracked TCP endpoints.
          server.close(error => error ? reject(error) : resolve());
          for (const socket of sockets) socket.destroy();
        });
      } finally {
        clearTimeout(timer);
        server.off('connection', track);
      }
    }
  };
}
