import { embedText } from "./embed";
import { searchVectors } from "./vector-store";
import { SearchResult } from "./types";

export async function semanticSearch(query: string, k = 5): Promise<SearchResult[]> {
  const queryEmbedding = await embedText(query);
  const results = await searchVectors(queryEmbedding, k);

  return results.map((r: any) => ({
    filePath: r.filePath,
    chunk: r.chunk,
    score: r.score
  }));
}
