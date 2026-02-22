import { semanticSearch } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z ? z.object({ query: z.string(), k: z.number().optional(), rootPath: z.string().optional() }) : undefined;
  server.registerTool('semantic_search', {
      title: 'Semantic Search',
      description: 'Performs semantic search over the indexed project',
      inputSchema: inputSchema,
      outputSchema: undefined,
      handler: async (params: any) => {
          const res = await semanticSearch(params.query, params.k, params.rootPath);
          return res;
      }
  });
}

