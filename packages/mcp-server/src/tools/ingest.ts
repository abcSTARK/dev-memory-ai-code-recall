import { ingestProject } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({
        workspace_root: z.string().optional().describe("Workspace root path to index."),
        force_reindex: z.boolean().optional().describe("Force a full rebuild before indexing.")
      })
    : undefined;

  const handler = async (params: { workspace_root?: string; force_reindex?: boolean }) => {
    console.error("[MCP] index_codebase called with", params);
    const root = params.workspace_root || process.cwd();
    await ingestProject(root, { force: !!params.force_reindex });
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
}
