import { semanticSearch } from "@devmemory/core";
import { registerTool } from "../toolRegistry";

registerTool("semantic_search", async (params: { query: string; k?: number }) => {
  const results = await semanticSearch(params.query, params.k);
  return results;
});
