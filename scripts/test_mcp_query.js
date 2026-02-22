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

setTimeout(() => {
  send({ tool: 'semantic_search', params: { query: 'mcpLauncher', k: 5, rootPath: process.cwd() } });
  send({ tool: 'project_summary', params: { rootPath: process.cwd(), k: 5 } });
  setTimeout(() => { child.stdin.end(); }, 3000);
}, 1500);
