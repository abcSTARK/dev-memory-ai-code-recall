const lancedb = require("@lancedb/lancedb") as any;
import path from "path";
import { embedText } from "./embed";

const DB_PATH = path.resolve(process.cwd(), "storage/lancedb");
const TABLE_NAME = "code_chunks";

export async function storeChunks(filePath: string, chunks: string[]): Promise<void> {
  const db = await lancedb.connect(DB_PATH);
  // Always recreate the table
  await db.dropTable(TABLE_NAME).catch(() => {});
  const records = [];
  for (const chunk of chunks) {
    const embedding = await embedText(chunk);
    records.push({
      filePath: filePath,
      chunk: chunk,
      embedding: Array.from(embedding)
    });
  }
  if (records.length > 0) {
    await db.createTable(TABLE_NAME, records);
  }
}

export async function searchVectors(queryEmbedding: Float32Array, k: number): Promise<any[]> {
  const db = await lancedb.connect(DB_PATH);
  const table = await db.openTable(TABLE_NAME);
  const result = await table.search(queryEmbedding, k);
  // If result is not an array, convert to array
  if (Array.isArray(result)) return result;
  if (result && typeof result.toArray === "function") return await result.toArray();
  return [];
}