// This module implements the official MCP SDK usage without fallback.
// It instantiates McpServer, registers tools using the SDK API, and connects
// using the StdioServerTransport. If the SDK is not installed, the process will
// exit with a non-zero status so callers are aware.
try {
	// Require SDK modules dynamically so TypeScript doesn't force an SDK install at compile time.
	// These requires will throw if the packages are not installed, which we want to surface.
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { z } = require('zod');

	// Create the SDK server
	const server = new McpServer({ name: 'devmemory-mcp', version: '1.0.0', capabilities: { tools: {} } });

	// Import the existing tool registration helpers which now accept the SDK server
	const { registerTools } = require('./tools');
	// register all tools on the SDK server
	registerTools(server, { z });

	// Connect over stdio
	const transport = new StdioServerTransport();
	server.connect(transport).then(() => {
		console.error('[MCP] MCP SDK server connected and listening on stdio.');
	}).catch((err: any) => {
		console.error('[MCP] Failed to connect MCP server:', err?.message || String(err));
		process.exit(1);
	});
} catch (err: any) {
	console.error('[MCP] Required MCP SDK packages are not installed or failed to load: ', err?.message || String(err));
	console.error('[MCP] To run this server you must install dependencies:');
	console.error('  npm --prefix packages/mcp-server install @modelcontextprotocol/sdk zod');
	process.exit(2);
}
