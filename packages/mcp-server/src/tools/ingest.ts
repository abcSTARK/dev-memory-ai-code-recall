import { ingestProject } from "@devmemory/core";
import { registerTool } from "../toolRegistry";

registerTool("ingest_project", async (params: { rootPath: string }) => {
  await ingestProject(params.rootPath);
  return { success: true };
});
