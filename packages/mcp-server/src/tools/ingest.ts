import { ingestProject } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z ? z.object({ rootPath: z.string().optional(), force: z.boolean().optional() }) : undefined;
  const outputSchema = z ? z.object({ success: z.boolean() }) : undefined;
  // SDK expects (name, config) form; earlier we incorrectly passed a single object
  server.registerTool('ingest_project', {
      title: 'Ingest Project',
      description: 'Ingests workspace files into the local vector store',
      inputSchema: inputSchema,
      outputSchema: outputSchema,
      handler: async (params: { rootPath?: string; force?: boolean }) => {
          const root = params.rootPath || process.cwd();
          await ingestProject(root, { force: !!params.force });
          return { success: true };
      }
  });
}

