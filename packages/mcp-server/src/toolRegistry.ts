// Tool handler registry
export type ToolHandler = (params: any) => Promise<any>;
export const toolHandlers: Record<string, ToolHandler> = {};

export function registerTool(name: string, handler: ToolHandler) {
  toolHandlers[name] = handler;
  console.log(`[MCP] Tool registered: ${name}`);
}
