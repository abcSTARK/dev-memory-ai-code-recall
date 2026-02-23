import { projectSummary } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({
        workspace_root: z.string().optional().describe("Workspace root path."),
        top_k: z.number().int().min(1).max(20).optional().describe("How many representative chunks to use (1-20).")
      })
    : undefined;

  const handler = async (params: any) => {
      try {
        const root = params.workspace_root || process.cwd();
        const topK = params.top_k ?? 5;
        const res = await projectSummary(root, topK as number);
        return {
          ...res,
          content: [
            {
              type: "text",
              text: JSON.stringify(res, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return {
          error: String(err),
          content: [
            {
              type: "text",
              text: `summarize_codebase failed: ${String(err)}`
            }
          ]
        };
      }
    };

  server.registerTool(
    "summarize_codebase",
    {
      title: "Summarize Codebase",
      description: "Use when user asks what this repo does, architecture overview, or high-level project summary.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );
}
