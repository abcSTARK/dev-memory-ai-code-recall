// Tool handler registry
export type ToolHandler = (params: any) => Promise<any>;
export const toolHandlers: Record<string, ToolHandler> = {};

export function registerTool(name: string, handler: ToolHandler) {
  toolHandlers[name] = handler;
  // Write debug/log messages to stderr so stdout remains reserved for MCP protocol JSON messages
  // Use console.error rather than console.log to avoid corrupting stdio-based JSON RPC.
  console.error(`[MCP] Tool registered: ${name}`);
}
