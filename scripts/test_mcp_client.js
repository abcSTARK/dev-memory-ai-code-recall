const { spawn } = require('child_process');
const path = require('path');

const bundle = path.resolve(__dirname, '..', 'packages', 'vscode-extension', 'dist', 'mcp-server.bundle.js');
console.log('Starting MCP bundle:', bundle);

const child = spawn('node', [bundle], { stdio: ['pipe', 'pipe', 'pipe'] });

child.stderr.on('data', (d) => {
  process.stderr.write('[MCP STDERR] ' + d.toString());
});
child.stdout.on('data', (d) => {
  process.stdout.write('[MCP STDOUT] ' + d.toString());
});

child.on('exit', (code) => {
  console.log('MCP exited with', code);
  process.exit(code);
});

function send(req) {
  console.log('> sending:', JSON.stringify(req));
  child.stdin.write(JSON.stringify(req) + '\n');
}

// Wait a bit for server to start, then send sample calls
setTimeout(() => {
  // 1) semantic_search (quick test)
  send({ tool: 'semantic_search', params: { query: 'authentication', k: 3, rootPath: process.cwd() } });

  // 2) remember_note
  send({ tool: 'remember_note', params: { note: 'Project uses JWT with RS256', tags: ['auth','arch'], rootPath: process.cwd() } });

  // 3) project_summary
  send({ tool: 'project_summary', params: { rootPath: process.cwd(), k: 3 } });

  // 4) ingest_project — run a workspace ingest (can take a while depending on repo size)
  send({ tool: 'ingest_project', params: { rootPath: process.cwd() } });

  // Close stdin after a longer delay to allow ingest to run and produce logs/responses
  setTimeout(() => {
    try { child.stdin.end(); } catch (e) {}
  }, 120000); // 2 minutes
}, 1500);
