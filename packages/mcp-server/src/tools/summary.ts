import { projectSummary } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z ? z.object({ rootPath: z.string().optional(), k: z.number().optional() }) : undefined;
  server.registerTool('project_summary', {
      title: 'Project Summary',
      description: 'Produces a short summary of the project using the semantic index',
      inputSchema: inputSchema,
      outputSchema: undefined,
      handler: async (params: any) => {
      try {
        const root = params.rootPath || process.cwd();
        const k = params.k || 5;
        const res = await projectSummary(root, k as number);
        return res;
      } catch (err: any) {
        return { error: String(err) };
      }
    }
  });
}

