import readline from "readline";
import { registerTools } from "./tools";
import { toolHandlers, registerTool } from "./toolRegistry";


export function startServer() {
  console.error('[MCP] Starting MCP server...');
  registerTools();
  console.error('[MCP] Tools registered.');
  console.error('[MCP] Ready for requests.');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", async (line) => {
    console.error(`[MCP] Received line: ${line}`);
    try {
      const req = JSON.parse(line);
      const { tool, params } = req;
      console.error(`[MCP] Tool request: ${tool}`);
      if (toolHandlers[tool]) {
        const result = await toolHandlers[tool](params);
        console.error(`[MCP] Tool result: ${JSON.stringify(result)}`);
        process.stdout.write(JSON.stringify({ result }) + "\n");
      } else {
        console.error(`[MCP] Unknown tool: ${tool}`);
        process.stdout.write(JSON.stringify({ error: "Unknown tool" }) + "\n");
      }
    } catch (err) {
      console.error(`[MCP] Error: ${err}`);
      process.stdout.write(JSON.stringify({ error: (err as Error).message }) + "\n");
    }
  });
}
