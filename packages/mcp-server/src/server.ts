// Legacy server implementation removed.
// This package now uses the official @modelcontextprotocol/sdk via src/index.ts.
// If you see an import of this module, please update your tooling to run the
// MCP SDK-based entrypoint (packages/mcp-server/dist/index.js) instead.
export function startServer() {
  console.error('[MCP] Legacy server removed. Use the MCP SDK entrypoint (dist/index.js).');
  process.exit(1);
}
