import { rememberNote } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z ? z.object({ note: z.string(), key: z.string().optional(), tags: z.array(z.string()).optional(), rootPath: z.string().optional() }) : undefined;
  server.registerTool('remember_note', {
      title: 'Remember Note',
      description: 'Remember a short note (stores embedding into notes table)',
      inputSchema: inputSchema,
      outputSchema: undefined,
  }, async (params: any) => {
      try {
        const root = params.rootPath || process.cwd();
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
    }
  );
}
