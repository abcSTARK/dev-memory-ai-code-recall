import { semanticSearch } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({
        query: z.string().min(2).describe("User question or phrase to search in the codebase."),
        workspace_root: z.string().optional().describe("Workspace root path."),
        top_k: z.number().int().min(1).max(20).optional().describe("Maximum number of results to return (1-20).")
      })
    : undefined;

  const handler = async (params: any) => {
    const workspaceRoot = params?.workspace_root;
    const topK = params?.top_k ?? 5;
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
}
