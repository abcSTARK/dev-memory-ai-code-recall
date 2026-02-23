import { ingestProject, semanticSearch } from "./index";
import path from "path";

async function main() {
  const rootPath = path.resolve(__dirname, "../../../../"); // Workspace root
  try {
    console.error("Ingesting project...");
    await ingestProject(process.cwd());
    console.error("Ingestion complete.");
    const results = await semanticSearch('readme', 3);
    console.error("Search results:", results);
  } catch (err: any) {
    console.error("Test failed:", err);
  }
}

main().catch(err => {
  console.error("Test failed:", err);
});
