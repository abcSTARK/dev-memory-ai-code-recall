import { ingestProject, semanticSearch } from "./index";
import path from "path";

async function main() {
  const rootPath = path.resolve(__dirname, "../../../../"); // Workspace root
  console.log("Ingesting project...");
  await ingestProject(rootPath);
  console.log("Ingestion complete.");

  const query = "memory engine";
  console.log(`Searching for: ${query}`);
  const results = await semanticSearch(query, 3);
  console.log("Search results:", results);
}

main().catch(err => {
  console.error("Test failed:", err);
});
