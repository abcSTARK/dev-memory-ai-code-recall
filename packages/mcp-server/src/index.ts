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
	const server = new McpServer({ name: 'devmemory-mcp', version: '1.0.0', capabilities: { tools: {}, logging: {} } });

	// Helper to forward console messages as MCP logging notifications. This
	// mirrors the protocol described in the MCP spec so clients can control
	// verbosity, and also ensures that any existing console-based debug output
	// (e.g. from core.ingest.ts) is sent to the client rather than disappearing
	// into the void. We preserve the original console methods so output still
	// appears on stderr/stdout as before.
	(function attachProtocolLogger(srv: any) {
		// preserve original methods so we can still write to stderr
		const origLog = console.log;
		const origInfo = console.info;
		const origWarn = console.warn;
		const origError = console.error;
		const origDebug = console.debug;

		function send(level: string, args: any[]) {
			if (!srv || !srv.isConnected || !srv.isConnected()) return;
			try {
				srv.sendLoggingMessage({ level, data: { message: args.map(String).join(' ') } });
			} catch {
				// best-effort only
			}
		}

		// redirect all console output to stderr to avoid polluting the JSON-RPC
		// stream on stdout.  We still emit the message via MCP logging.
		console.log = (...a: any[]) => { origError(...a); send('info', a); };
		console.info = (...a: any[]) => { origError(...a); send('info', a); };
		console.warn = (...a: any[]) => { origError(...a); send('warning', a); };
		console.error = (...a: any[]) => { origError(...a); send('error', a); };
		console.debug = (...a: any[]) => { origError(...a); send('debug', a); };
	})(server);

	// Import the existing tool registration helpers which now accept the SDK server
	const { registerTools } = require('./tools');
	// register all tools on the SDK server
	registerTools(server, { z });

	// Connect over stdio
	const transport = new StdioServerTransport();
	// DEBUG: also log raw stdin so we can verify frames are arriving
	process.stdin.on('data', (chunk) => {
		// This goes to stderr to avoid mangling the JSON-RPC stream
		console.error('[MCP-RAW-IN]', chunk.toString());
	});
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
