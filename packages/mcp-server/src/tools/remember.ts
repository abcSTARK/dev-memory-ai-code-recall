import { rememberNote } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({
        note: z.string().min(1).describe("Short note to save for this workspace."),
        key: z.string().optional().describe("Optional unique key for this note."),
        tags: z.array(z.string()).optional().describe("Optional tags to help retrieve this note later."),
        workspace_root: z.string().optional().describe("Workspace root path. Preferred over rootPath."),
        rootPath: z.string().optional().describe("Legacy alias for workspace_root.")
      })
    : undefined;

  const handler = async (params: any) => {
      try {
        const root = params.workspace_root || params.rootPath || process.cwd();
        const res = await rememberNote(root, params.note, params.tags, params.key);
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
          success: false,
          error: String(err),
          content: [
            {
              type: "text",
              text: `remember_note failed: ${String(err)}`
            }
          ]
        };
      }
    };

  server.registerTool(
    "save_project_note",
    {
      title: "Save Project Note",
      description: "Use when user asks to remember a fact, decision, TODO, or convention for this codebase.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );

  // Backward-compatible alias
  server.registerTool(
    "remember_note",
    {
      title: "Remember Note (Legacy Alias)",
      description: "Legacy alias for save_project_note.",
      inputSchema,
      outputSchema: undefined
    },
    handler
  );
}
