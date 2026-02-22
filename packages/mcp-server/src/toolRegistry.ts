// Legacy tool registry removed. This module is kept as a compatibility shim
// but will throw if called. Use the MCP SDK server.registerTool API instead.
export function registerTool() {
  throw new Error('Legacy tool registry removed. Register tools via the MCP SDK server.registerTool API.');
}

export function listTools() {
  throw new Error('Legacy tool registry removed. Use the MCP SDK server.registerTool API.');
}

export const toolHandlers = {} as any;
export const toolMetadata = {} as any;
