import { getEmbeddingStatus, warmupEmbedding } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z
        .object({
          warmup: z.boolean().optional().describe("If true, initialize embedding runtime before returning status."),
          workspace_root: z.string().optional().describe("Workspace root path.")
        })
        .optional()
    : undefined;

  const handler = async (params: { warmup?: boolean }) => {
      if (params?.warmup) {
        await warmupEmbedding();
      }
      const status = getEmbeddingStatus();
      console.error("[MCP] get_embedding_status", status);
      return {
        ...status,
        content: [
          {
            type: "text",
            text: JSON.stringify(status, null, 2)
          }
        ]
      };
    };

  server.registerTool(
    "get_embedding_status",
    {
      title: "Get Embedding Status",
      description: "Returns active embedding provider/runtime status. Useful for diagnostics and health checks.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );
}
