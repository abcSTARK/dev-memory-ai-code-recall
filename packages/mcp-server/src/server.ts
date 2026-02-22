import readline from "readline";
import { registerTools } from "./tools";
import { toolHandlers, registerTool } from "./toolRegistry";


export function startServer() {
  console.log('[MCP] Starting MCP server...');
  registerTools();
  console.log('[MCP] Tools registered.');
  console.log('[MCP] Ready for requests.');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", async (line) => {
    console.log(`[MCP] Received line: ${line}`);
    try {
      const req = JSON.parse(line);
      const { tool, params } = req;
      console.log(`[MCP] Tool request: ${tool}`);
      if (toolHandlers[tool]) {
        const result = await toolHandlers[tool](params);
        console.log(`[MCP] Tool result:`, result);
        process.stdout.write(JSON.stringify({ result }) + "\n");
      } else {
        console.log(`[MCP] Unknown tool: ${tool}`);
        process.stdout.write(JSON.stringify({ error: "Unknown tool" }) + "\n");
      }
    } catch (err) {
      console.log(`[MCP] Error:`, err);
      process.stdout.write(JSON.stringify({ error: (err as Error).message }) + "\n");
    }
  });
}
