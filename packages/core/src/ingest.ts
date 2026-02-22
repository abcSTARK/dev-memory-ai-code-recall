import { glob } from "glob";
import { chunkFile } from "./chunk";
import { storeChunks } from "./vector-store";

export async function ingestProject(rootPath: string): Promise<void> {
  const files: string[] = await glob.glob(
    "**/*.{ts,js,tsx,jsx,md,py,java,kt,go,rs,c,cpp,h,cs,rb,php,swift,scala,sh,json,yml,yaml,xml,txt}",
    {
      cwd: rootPath,
      absolute: true
    }
  );
  // Post-filter forbidden directories/files
  const forbidden: string[] = [
    "/node_modules/",
    "/dist/",
    "/.git/",
    "/.venv/",
    "/build/",
    "/target/",
    "/__pycache__",
    "/.idea/",
    "/.vscode/",
    ".egg-info",
    ".class",
    ".jar",
    ".pyc",
    ".DS_Store",
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
  const filteredFiles: string[] = files.filter((f: string) => !forbidden.some((seg: string) => f.includes(seg)));
  console.error(`[ingest] Found ${filteredFiles.length} files (filtered from ${files.length}).`);
  for (const [i, filePath] of filteredFiles.entries()) {
  console.error(`[ingest] Processing file ${i + 1}/${filteredFiles.length}: ${filePath}`);
    try {
      const chunks = await chunkFile(filePath);
  console.error(`[ingest] Chunked into ${chunks.length} chunks.`);
      await storeChunks(rootPath, filePath, chunks);
  console.error(`[ingest] Stored chunks for ${filePath}`);
    } catch (err) {
  console.error(`[ingest] Error processing ${filePath}: ${err}`);
    }
  }
  console.error(`[ingest] All files processed.`);
}
