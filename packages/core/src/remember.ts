import path from "path";
const lancedb = require("@lancedb/lancedb") as any;
import { embedText } from "./embed";

const NOTES_TABLE = "notes";

function dbPathForRoot(rootPath?: string) {
  return path.resolve(rootPath || process.cwd(), "storage/lancedb");
}

export async function rememberNote(rootPath: string | undefined, note: string, tags?: string[], key?: string) {
  const id = key || `note_${Date.now()}`;
  const DB_PATH = dbPathForRoot(rootPath);
  const db = await lancedb.connect(DB_PATH);
  const embedding = Array.from(await embedText(note));
  const record: any = {
    id,
    note,
    tags: tags || [],
    embedding
  };
  try {
    const table = await db.openTable(NOTES_TABLE).catch(() => null);
    if (!table) {
      await db.createTable(NOTES_TABLE, [record]);
    } else if (typeof table.insert === "function") {
      await table.insert([record]);
    } else if (typeof table.append === "function") {
      await table.append([record]);
    } else if (typeof table.add === "function") {
      await table.add([record]);
    } else {
      await db.createTable(NOTES_TABLE, [record]);
    }
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
}

export async function searchNotes(rootPath: string | undefined, query: string, k = 5) {
  const DB_PATH = dbPathForRoot(rootPath);
  const db = await lancedb.connect(DB_PATH);
  const embedding = await embedText(query);
  const table = await db.openTable(NOTES_TABLE).catch(() => null);
  if (!table) return [];
  const result = await table.search(Array.from(embedding), k).catch(() => []);
  if (Array.isArray(result)) return result;
  if (result && typeof result.toArray === "function") return await result.toArray();
  return [];
}
