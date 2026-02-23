import { embedText } from "./embed";
import { initializeStore, searchSimilar } from "./vector-store";
import { SearchResult } from "./types";

export async function semanticSearch(query: string, k = 5, rootPath?: string): Promise<SearchResult[]> {
  const queryEmbedding = await embedText(query);
  if (rootPath) initializeStore(rootPath);
  const results = searchSimilar(Array.from(queryEmbedding), k);

  return results.map((r: any) => ({
    filePath: r.metadata?.filePath || "",
    chunk: r.text,
    score: r.score
  }));
}
