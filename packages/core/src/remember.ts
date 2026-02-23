import { embedText } from "./embed";
import { initializeStore, addEmbedding, searchSimilar } from "./vector-store";

const NOTES_TYPE = "note";

export async function rememberNote(rootPath: string | undefined, note: string, tags?: string[], key?: string) {
  const id = key || `note_${Date.now()}`;
  if (rootPath) initializeStore(rootPath);
  const embedding = Array.from(await embedText(note));
  addEmbedding({
    id,
    text: note,
    embedding,
    metadata: {
      type: NOTES_TYPE,
      tags: tags || []
    }
  });
  return { success: true, id };
}

export async function searchNotes(rootPath: string | undefined, query: string, k = 5) {
  if (rootPath) initializeStore(rootPath);
  const embedding = await embedText(query);
  const hits = searchSimilar(Array.from(embedding), k);
  return hits.filter((h) => h.metadata?.type === NOTES_TYPE);
}
