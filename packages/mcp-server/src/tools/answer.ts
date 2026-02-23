import { ingestProject, semanticSearch } from "@devmemory/core";

function uniqueFilePaths(results: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of results) {
    const fp = r?.filePath || "";
    if (fp && !seen.has(fp)) {
      seen.add(fp);
      out.push(fp);
    }
  }
  return out;
}

function buildAnswer(question: string, results: any[]): string {
  if (!results.length) {
    return `I could not find relevant indexed chunks for: "${question}". Try indexing the codebase first or refining the query.`;
  }
  const citations = uniqueFilePaths(results).slice(0, 5).map((p) => `- ${p}`).join("\n");
  const topSnippets = results
    .slice(0, 3)
    .map((r: any, i: number) => {
      const snippet = String(r?.chunk || "").replace(/\s+/g, " ").slice(0, 260);
      const score = typeof r?.score === "number" ? r.score.toFixed(3) : "n/a";
      return `${i + 1}. (${score}) ${snippet}`;
    })
    .join("\n");
  return `Best matching context for: "${question}"\n\nTop snippets:\n${topSnippets}\n\nLikely relevant files:\n${citations}`;
}

export function register(server: any, ctx?: { z?: any }) {
  const z = ctx?.z;
  const inputSchema = z
    ? z.object({
        question: z.string().min(2).describe("User question about this codebase."),
        workspace_root: z.string().optional().describe("Workspace root path."),
        top_k: z.number().int().min(1).max(20).optional().describe("How many chunks to retrieve (1-20)."),
        auto_index: z
          .boolean()
          .optional()
          .describe("If true, auto-runs index_codebase when no results are found. Defaults to true.")
      })
    : undefined;

  server.registerTool(
    "answer_from_codebase",
    {
      title: "Answer From Codebase",
      description:
        "High-level tool for autonomous chat. Use for most codebase questions: retrieves context and returns a direct answer with cited files.",
      inputSchema,
      outputSchema: undefined
    },
    async (params: any) => {
      const question = params?.question || "";
      const root = params?.workspace_root || process.cwd();
      const topK = params?.top_k ?? 5;
      const autoIndex = params?.auto_index !== false;

      console.error("[MCP] answer_from_codebase called with", {
        question,
        workspace_root: root,
        top_k: topK,
        auto_index: autoIndex
      });

      let results = await semanticSearch(question, topK, root);
      if ((!results || results.length === 0) && autoIndex) {
        console.error("[MCP] answer_from_codebase no hits; running index_codebase");
        await ingestProject(root, { force: false });
        results = await semanticSearch(question, topK, root);
      }

      const answer = buildAnswer(question, results || []);
      return {
        content: [
          {
            type: "text",
            text: answer
          }
        ],
        answer,
        results: results || [],
        count: Array.isArray(results) ? results.length : 0,
        files: uniqueFilePaths(results || [])
      };
    }
  );
}
