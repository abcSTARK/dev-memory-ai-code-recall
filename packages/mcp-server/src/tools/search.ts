import { semanticSearch } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z ? z.object({ query: z.string(), k: z.number().optional(), rootPath: z.string().optional() }) : undefined;
  // note: SDK now expects the handler as a separate argument rather than inside
  // the config object.  Previously we passed it in `config.handler` which meant
  // `tool.handler` was undefined at runtime, leading to the mysterious "in
  // operator" error.  The third argument below is the actual callback.
  server.registerTool('semantic_search', {
      title: 'Semantic Search',
      description: 'Performs semantic search over the indexed project',
      inputSchema: inputSchema,
      outputSchema: undefined,
  }, async (params: any) => {
          console.error('[MCP] semantic_search tool called with', params);
          const res = await semanticSearch(params.query, params.k, params.rootPath);
          console.error('[MCP] semantic_search result count', Array.isArray(res) ? res.length : typeof res);
          const text = JSON.stringify(res, null, 2);
          return {
              content: [
                  {
                      type: 'text',
                      text
                  }
              ]
          };
      }
  );
}

