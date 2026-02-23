import { getEmbeddingStatus, warmupEmbedding } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({ warmup: z.boolean().optional(), rootPath: z.string().optional() }).optional()
    : undefined;
  server.registerTool(
    "embedding_status",
    {
      title: "Embedding Status",
      description: "Returns the active embedding provider and runtime status",
      inputSchema,
      outputSchema: undefined
    },
    async (params: { warmup?: boolean }) => {
      if (params?.warmup) {
        await warmupEmbedding();
      }
      const status = getEmbeddingStatus();
      console.error("[MCP] embedding_status", status);
      return status;
    }
  );
}
