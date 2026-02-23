const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function bundle() {
  // repo root is three levels up from this script: packages/vscode-extension/scripts -> repo root
  const repoRoot = path.resolve(__dirname, '..', '..', '..'); // workspace root
  const mcpEntry = path.join(repoRoot, 'packages', 'mcp-server', 'dist', 'index.js');
  const outFile = path.join(__dirname, '..', 'dist', 'mcp-server.bundle.js');

  console.log('Bundling MCP server from', mcpEntry);

  const externalPackages = ['vscode'];

  try {
    await esbuild.build({
      entryPoints: [mcpEntry],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: ['node20'],
      outfile: outFile,
      external: externalPackages,
      sourcemap: false,
      logLevel: 'info'
    });
    console.log('Bundled MCP server to', outFile);
  } catch (err) {
    console.error('Failed to bundle MCP server:', err);
    process.exit(1);
  }
}

bundle();
