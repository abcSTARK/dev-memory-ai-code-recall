import { projectSummary } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z ? z.object({ rootPath: z.string().optional(), k: z.number().optional() }) : undefined;
  server.registerTool('project_summary', {
      title: 'Project Summary',
      description: 'Produces a short summary of the project using the semantic index',
      inputSchema: inputSchema,
      outputSchema: undefined,
  }, async (params: any) => {
      try {
        const root = params.rootPath || process.cwd();
        const k = params.k || 5;
        const res = await projectSummary(root, k as number);
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
    }
  );
}
