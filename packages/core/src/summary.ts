import { semanticSearch } from "./search";
import { SearchResult } from "./types";

// Produce a lightweight project summary by querying the vector index for an overview
// and returning concatenated top chunks plus the raw chunk results.
export async function projectSummary(rootPath: string | undefined, k = 5): Promise<{ summary: string; chunks: SearchResult[] } | { error: string }> {
  try {
    // Use a generic summary query to retrieve representative chunks from the code index
    const results = await semanticSearch("project summary", k);
    const joined = results.map((r) => r.chunk).join("\n\n");
    // Truncate summary for safety
    const summary = joined.length > 3000 ? joined.slice(0, 3000) + "..." : joined;
    return { summary, chunks: results };
  } catch (err: any) {
    return { error: String(err) };
  }
}
