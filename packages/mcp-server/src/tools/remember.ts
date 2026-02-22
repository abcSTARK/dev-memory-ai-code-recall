import { registerTool } from "../toolRegistry";
import { rememberNote } from "@devmemory/core";

// Persist a short note into the vector store (LanceDB notes table) with an embedding.
registerTool("remember_note", async (params: { note: string; key?: string; tags?: string[]; rootPath?: string }) => {
  try {
    const root = params.rootPath || process.cwd();
    const res = await rememberNote(root, params.note, params.tags, params.key);
    return res;
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
});
