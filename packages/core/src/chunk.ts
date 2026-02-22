import fs from "fs/promises";
// Simple token count: split by whitespace

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export async function chunkFile(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const chunks: string[] = [];
  let start = 0;

  while (start < lines.length) {
    let chunkLines: string[] = [];
    let tokenCount = 0;
    let i = start;

    while (i < lines.length && tokenCount < CHUNK_SIZE) {
      chunkLines.push(lines[i]);
  tokenCount += lines[i].split(/\s+/).length;
      i++;
    }

    chunks.push(chunkLines.join("\n"));
    start = i - CHUNK_OVERLAP > start ? i - CHUNK_OVERLAP : i;
  }

  return chunks;
}
