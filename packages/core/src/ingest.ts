import { glob } from "glob";
import path from "path";
import { chunkFile } from "./chunk";
import { embedText } from "./embed";
import { initializeStore, addEmbedding } from "./vector-store";

export async function ingestProject(rootPath: string): Promise<void> {
  const files: string[] = await glob.glob(
    "**/*.{ts,js,tsx,jsx,md,py,java,kt,go,rs,c,cpp,h,cs,rb,php,swift,scala,sh,json,yml,yaml,xml,txt}",
    {
      cwd: rootPath,
      absolute: true
    }
  );
  const forbiddenPathSegments: string[] = [
    "/node_modules/",
    "/dist/",
    "/.git/",
    "/.venv/",
    "/build/",
    "/target/",
    "/__pycache__/",
    "/.idea/",
    "/.vscode/",
    "/.vsce-dist/",
    "/.dev-memory/",
    "/packages/mcp-server/packages/",
    "/packages/vscode-extension/packages/"
  ];

  const forbiddenFileNames: Set<string> = new Set([
    ".DS_Store",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
    "tsconfig.tsbuildinfo"
  ]);

  const forbiddenSuffixes: string[] = [
    ".egg-info",
    ".class",
    ".jar",
    ".pyc",
    ".lock",
    ".log",
    ".tmp",
    ".bak",
    ".swp",
    ".swo",
    ".out",
    ".bin",
    ".exe",
    ".dll",
    ".obj",
    ".o",
    ".a",
    ".so",
    ".dylib",
    ".zip",
    ".tar",
    ".gz",
    ".bz2",
    ".xz",
    ".7z",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".mp3",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".iso",
    ".dmg",
    ".app",
    ".apk",
    ".ipa",
    ".csv",
    ".tsv",
    ".db",
    ".sqlite",
    ".env",
    ".sample"
  ];

  const filteredFiles: string[] = files.filter((filePath: string) => {
    const normalized = filePath.replace(/\\/g, "/");
    const baseName = path.basename(normalized);
    if (forbiddenFileNames.has(baseName)) return false;
    if (forbiddenPathSegments.some((seg) => normalized.includes(seg))) return false;
    if (forbiddenSuffixes.some((suffix) => normalized.endsWith(suffix))) return false;
    return true;
  });
  // prepare store once
  initializeStore(rootPath);
  console.error(`[ingest] Found ${filteredFiles.length} files (filtered from ${files.length}).`);
  for (const [i, filePath] of filteredFiles.entries()) {
    console.error(`[ingest] Processing file ${i + 1}/${filteredFiles.length}: ${filePath}`);
    try {
      const chunks = await chunkFile(filePath);
      console.error(`[ingest] Chunked into ${chunks.length} chunks.`);
      for (const [j, chunk] of chunks.entries()) {
        const embedding = await embedText(chunk);
        addEmbedding({
          id: `${filePath}#${j}`,
          text: chunk,
          embedding: Array.from(embedding),
          metadata: { filePath }
        });
      }
      console.error(`[ingest] Stored chunks for ${filePath}`);
    } catch (err) {
      console.error(`[ingest] Error processing ${filePath}: ${err}`);
    }
  }
  console.error(`[ingest] All files processed.`);
}
