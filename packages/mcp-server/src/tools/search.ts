import { semanticSearch } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({
        query: z.string().min(2).describe("User question or phrase to search in the codebase."),
        workspace_root: z.string().optional().describe("Workspace root path. Preferred over rootPath."),
        rootPath: z.string().optional().describe("Legacy alias for workspace_root."),
        top_k: z.number().int().min(1).max(20).optional().describe("Maximum number of results to return (1-20)."),
        k: z.number().int().min(1).max(20).optional().describe("Legacy alias for top_k.")
      })
    : undefined;

  const handler = async (params: any) => {
    const workspaceRoot = params?.workspace_root || params?.rootPath;
    const topK = params?.top_k ?? params?.k ?? 5;
    console.error("[MCP] search_codebase called with", params);
    const res = await semanticSearch(params.query, topK, workspaceRoot);
    console.error("[MCP] search_codebase result count", Array.isArray(res) ? res.length : typeof res);
    const text = JSON.stringify(res, null, 2);
    return {
      content: [
        {
          type: "text",
          text
        }
      ],
      results: res,
      count: Array.isArray(res) ? res.length : 0
    };
  };

  server.registerTool(
    "search_codebase",
    {
      title: "Search Codebase",
      description:
        "Primary retrieval tool. Use when the user asks where code, docs, config, or behavior exists in this workspace.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );

  // Backward-compatible alias
  server.registerTool(
    "semantic_search",
    {
      title: "Semantic Search (Legacy Alias)",
      description: "Legacy alias for search_codebase.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );
}
