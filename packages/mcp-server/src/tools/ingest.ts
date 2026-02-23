import { ingestProject } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({
        workspace_root: z.string().optional().describe("Workspace root path to index. Preferred over rootPath."),
        rootPath: z.string().optional().describe("Legacy alias for workspace_root."),
        force_reindex: z.boolean().optional().describe("Force a full rebuild. Preferred over force."),
        force: z.boolean().optional().describe("Legacy alias for force_reindex.")
      })
    : undefined;

  const handler = async (params: { workspace_root?: string; rootPath?: string; force_reindex?: boolean; force?: boolean }) => {
    console.error("[MCP] index_codebase called with", params);
    const root = params.workspace_root || params.rootPath || process.cwd();
    await ingestProject(root, { force: !!(params.force_reindex ?? params.force) });
    console.error("[MCP] index_codebase finished");
    return {
      content: [
        {
          type: "text",
          text: `index_codebase completed successfully for ${root}`
        }
      ]
    };
  };

  server.registerTool(
    "index_codebase",
    {
      title: "Index Codebase",
      description:
        "Use to build or refresh the local semantic index for this workspace. Call on first run, after large changes, or when search quality is poor.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );

  // Backward-compatible alias
  server.registerTool(
    "ingest_project",
    {
      title: "Ingest Project (Legacy Alias)",
      description: "Legacy alias for index_codebase.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );
}
