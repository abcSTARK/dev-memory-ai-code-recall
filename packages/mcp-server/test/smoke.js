#!/usr/bin/env node
const { spawn } = require('child_process');

function frameMessage(obj) {
  const json = JSON.stringify(obj);
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
}

function readFrames(stream, onMessage) {
  let buf = Buffer.alloc(0);
  stream.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (true) {
      const hdrEnd = buf.indexOf('\r\n\r\n');
      if (hdrEnd === -1) break;
      const header = buf.slice(0, hdrEnd).toString('utf8');
      const m = header.match(/Content-Length: (\d+)/i);
      if (!m) {
        // no content-length, can't parse
        stream.destroy(new Error('Missing Content-Length in header'));
        return;
      }
      const len = parseInt(m[1], 10);
      const totalLen = hdrEnd + 4 + len;
      if (buf.length < totalLen) break; // wait for more
      const body = buf.slice(hdrEnd + 4, totalLen).toString('utf8');
      try {
        const msg = JSON.parse(body);
        onMessage(msg);
      } catch (err) {
        console.error('Failed to parse message body', err);
      }
      buf = buf.slice(totalLen);
    }
  });
}

async function main() {
  const server = spawn(process.execPath, ['dist/index.js'], {
    cwd: __dirname + '/..',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let responses = 0;
  const maxResponses = 2;

  server.on('exit', (code, sig) => {
    console.error(`[smoke] server exited code=${code} sig=${sig}`);
    process.exit(code ?? 0);
  });

  // listen for ready log on stderr
  let ready = false;
  server.stderr.on('data', (chunk) => {
    const txt = chunk.toString('utf8');
    process.stderr.write(txt); // forward logs
    if (!ready && txt.includes('MCP SDK server connected')) {
      ready = true;
      // send requests now
      sendRequests();
    }
  });

  readFrames(server.stdout, (msg) => {
    console.log('[smoke] <-', JSON.stringify(msg));
    responses += 1;
    if (responses >= maxResponses) {
      console.log('[smoke] received all responses, exiting');
      // allow a tiny delay for logs to flush
      setTimeout(() => process.exit(0), 100);
    }
  });

  // debug raw
  server.stdout.on('data', (chunk) => {
    console.log('[smoke] raw chunk>', chunk.toString('utf8'));
  });

  function sendRequests() {
    // Send tools/list
    const listReq = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
    server.stdin.write(frameMessage(listReq));

    // After a short pause, call semantic_search (if available)
    setTimeout(() => {
      const callReq = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'semantic_search',
          arguments: { query: 'readme', k: 3, rootPath: process.cwd() },
        },
      };
      server.stdin.write(frameMessage(callReq));
    }, 500);
  }

  // Timeout guard
  setTimeout(() => {
    console.error('[smoke] timeout waiting for responses');
    process.exit(1);
  }, 10000);
}

main().catch((err) => {
  console.error('smoke test failed', err);
  process.exit(1);
});
