import { glob } from "glob";
import { chunkFile } from "./chunk";
import { storeChunks } from "./vector-store";

export async function ingestProject(rootPath: string): Promise<void> {
  const files = await glob.glob(
    "**/*.{ts,js,tsx,jsx,md,py,java,kt,go,rs,c,cpp,h,cs,rb,php,swift,scala,sh,json,yml,yaml,xml,txt}",
    {
      cwd: rootPath,
      absolute: true
    }
  );
  // Post-filter forbidden directories/files
  const forbidden = [
    "/node_modules/",
    "/dist/",
    "/.git/",
    "/.venv/",
    "/build/",
    "/target/",
    "/__pycache__/",
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
  const filteredFiles = files.filter(f => !forbidden.some(seg => f.includes(seg)));
  console.log(`[ingest] Found ${filteredFiles.length} files (filtered from ${files.length}).`);
  console.log(`[ingest] Found ${files.length} files.`);

  for (const [i, filePath] of filteredFiles.entries()) {
    console.log(`[ingest] Processing file ${i + 1}/${filteredFiles.length}: ${filePath}`);
    const chunks = await chunkFile(filePath);
    console.log(`[ingest] Chunked into ${chunks.length} chunks.`);
    await storeChunks(filePath, chunks);
    console.log(`[ingest] Stored chunks for ${filePath}`);
  }
  console.log(`[ingest] All files processed.`);
}
