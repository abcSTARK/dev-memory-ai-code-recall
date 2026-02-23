export function registerTools(server: any, ctx?: { z?: any }) {
	// Each tool module exports a `register` function accepting the server and an optional context
	require('./ingest').register(server, ctx);
	require('./search').register(server, ctx);
	require('./remember').register(server, ctx);
	require('./summary').register(server, ctx);
	require('./embedding-status').register(server, ctx);
}
