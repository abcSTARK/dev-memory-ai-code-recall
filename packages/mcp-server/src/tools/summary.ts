import { projectSummary } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({
        workspace_root: z.string().optional().describe("Workspace root path. Preferred over rootPath."),
        rootPath: z.string().optional().describe("Legacy alias for workspace_root."),
        top_k: z.number().int().min(1).max(20).optional().describe("How many representative chunks to use (1-20)."),
        k: z.number().int().min(1).max(20).optional().describe("Legacy alias for top_k.")
      })
    : undefined;

  const handler = async (params: any) => {
      try {
        const root = params.workspace_root || params.rootPath || process.cwd();
        const topK = params.top_k ?? params.k ?? 5;
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
              text: `project_summary failed: ${String(err)}`
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

  // Backward-compatible alias
  server.registerTool(
    "project_summary",
    {
      title: "Project Summary (Legacy Alias)",
      description: "Legacy alias for summarize_codebase.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );
}
