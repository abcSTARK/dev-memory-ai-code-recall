import { ingestProject, semanticSearch } from "./index";
import path from "path";

async function main() {
  const rootPath = path.resolve(__dirname, "../../../../"); // Workspace root
  console.error("Ingesting project...");
  await ingestProject(rootPath);
  console.error("Ingestion complete.");

  const query = "memory engine";
  console.error(`Searching for: ${query}`);
  const results = await semanticSearch(query, 3);
  console.error("Search results:", results);
}

main().catch(err => {
  console.error("Test failed:", err);
});
