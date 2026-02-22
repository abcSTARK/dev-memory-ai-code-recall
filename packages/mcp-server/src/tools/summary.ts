import { registerTool } from "../toolRegistry";
import { projectSummary } from "@devmemory/core";

// Generate a lightweight project summary using the core semantic index.
registerTool("project_summary", async (params: { rootPath?: string; k?: number }) => {
  try {
    const root = params.rootPath || process.cwd();
    const k = params.k || 5;
    const res = await projectSummary(root, k as number);
    return res;
  } catch (err: any) {
    return { error: String(err) };
  }
});
