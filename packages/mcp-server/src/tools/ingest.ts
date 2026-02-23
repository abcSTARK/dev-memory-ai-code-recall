import { ingestProject } from "@devmemory/core";

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z ? z.object({ rootPath: z.string().optional(), force: z.boolean().optional() }) : undefined;
  // SDK expects handler as separate argument
  server.registerTool('ingest_project', {
      title: 'Ingest Project',
      description: 'Ingests workspace files into the local vector store',
      inputSchema: inputSchema,
      outputSchema: undefined,
  }, async (params: { rootPath?: string; force?: boolean }) => {
          console.error('[MCP] ingest_project called with', params);
          const root = params.rootPath || process.cwd();
          await ingestProject(root, { force: !!params.force });
          console.error('[MCP] ingest_project finished');
          return {
            content: [
              {
                type: "text",
                text: `ingest_project completed successfully for ${root}`
              }
            ]
          };
      }
  );
}
