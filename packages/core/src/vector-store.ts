const lancedb = require("@lancedb/lancedb") as any;
import path from "path";
import { embedText } from "./embed";

const DEFAULT_TABLE = "code_chunks";
const NOTES_TABLE = "notes";

function dbPathForRoot(rootPath?: string) {
  return path.resolve(rootPath || process.cwd(), "storage/lancedb");
}

export async function storeChunks(rootPath: string | undefined, filePath: string, chunks: string[]): Promise<void> {
  const DB_PATH = dbPathForRoot(rootPath);
  // Log the resolved DB path so callers can see where LanceDB files are stored.
  console.error(`[vector-store] Using DB path: ${DB_PATH}`);
  const db = await lancedb.connect(DB_PATH);
  const records: any[] = [];
  for (const chunk of chunks) {
    const embedding = await embedText(chunk);
    records.push({
      filePath: filePath,
      chunk: chunk,
      embedding: Array.from(embedding),
      // Note: don't include fields not present in existing LanceDB table schemas
      // (e.g. `createdAt`) because appending records with unknown fields causes
      // "Found field not in schema" errors. Keep records minimal here.
    });
  }

  if (records.length === 0) return;

  // Create table if missing, otherwise append/insert records
  const table = await db.openTable(DEFAULT_TABLE).catch(() => null);
  if (!table) {
    await db.createTable(DEFAULT_TABLE, records);
    return;
  }

  if (typeof table.insert === "function") {
    await table.insert(records);
    return;
  }
  if (typeof table.append === "function") {
    await table.append(records);
    return;
  }
  if (typeof table.add === "function") {
    await table.add(records);
    return;
  }

  // Fallback: try recreate table with combined records (not ideal but safe)
  try {
    const existing = await table.toArray().catch(() => []);
    const combined = existing.concat(records);
    await db.dropTable(DEFAULT_TABLE).catch(() => {});
    await db.createTable(DEFAULT_TABLE, combined);
  } catch (err) {
    console.error("[vector-store] Failed to append records:", err);
  }
}

export async function searchVectors(rootPath: string | undefined, queryEmbedding: Float32Array, k: number, tableName = DEFAULT_TABLE): Promise<any[]> {
  const DB_PATH = dbPathForRoot(rootPath);
  const db = await lancedb.connect(DB_PATH);
  const table = await db.openTable(tableName).catch(() => null);
  if (!table) return [];
  const result = await table.search(queryEmbedding, k);
  if (Array.isArray(result)) return result;
  if (result && typeof result.toArray === "function") return await result.toArray();
  return [];
}