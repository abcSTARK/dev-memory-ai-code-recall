import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

// The extension previously communicated with a simple newline-delimited JSON
// protocol. After upgrading to the official MCP SDK the server now expects the
// standard framed JSON-RPC messages (Content-Length header).  `McpClient`
// implements the minimal client-side framing, request/response matching, and
// notification handling we need. It also listens for "notifications/message"
// (logging messages) and forwards them to the output channel in a human-readable
// form, restoring the detailed indexing/search logs the user was accustomed to.

let mcpClientInstance: McpClient | undefined;
let globalOutputChannel: vscode.OutputChannel | undefined;

class McpClient {
  proc: ChildProcessWithoutNullStreams;
  outputChannel: vscode.OutputChannel;
  buffer = '';
  pending = new Map<number, { resolve: (res: any) => void; reject: (e: any) => void }>();
  nextId = 1;

  // sendRpc: a general JSON-RPC sender for top-level methods (e.g. "tools/list").
  // This prevents callers from accidentally calling top-level methods via
  // the `tools/call` wrapper and provides a clean separation between RPC
  // methods and tool invocation.
  sendRpc(method: string, params?: any): Promise<any> {
    const id = this.nextId++;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    const line = JSON.stringify(payload) + '\n';
    this.proc.stdin.write(line);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  constructor(proc: ChildProcessWithoutNullStreams, outputChannel: vscode.OutputChannel) {
    this.proc = proc;
    this.outputChannel = outputChannel;

    proc.stdout.on('data', (chunk) => this.onStdout(chunk));
  }

  onStdout(chunk: Buffer) {
    const text = chunk.toString();
    // we rely on the original launchMCPServer listener to mirror raw output
    // (it also writes to the per-session log file). here our job is to feed
    // the framing parser so that we can surface notifications in a more
    // readable form and resolve pending responses.
    this.buffer += text;
    this.processBuffer();
  }

  processBuffer() {
    // The stdio transport used by the SDK is *newline-delimited* JSON.  Each
    // message must be a single line of JSON terminated by `\n`.  Earlier we
    // incorrectly assumed the standard "Content-Length" framing; that caused
    // messages to be ignored (the transport parsed the header line as JSON and
    // dropped the body).  Here we simply split on newlines.
    while (true) {
      const idx = this.buffer.indexOf('\n');
      if (idx === -1) break;
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        this.handleMessage(msg);
      } catch {
        // ignore parse errors
      }
    }
  }

  handleMessage(msg: any) {
    if (msg.method === 'notifications/message' && msg.params) {
      const lvl = msg.params.level || 'info';
      const data = msg.params.data;
      this.outputChannel.appendLine(`[MCP-LOG ${lvl}] ${JSON.stringify(data)}`);
      return;
    }
    if ('id' in msg) {
      const id = msg.id;
      const pending = this.pending.get(id);
      if (pending) {
        pending.resolve(msg.result ?? msg.error);
        this.pending.delete(id);
      }
    }
  }

  send(tool: string, params: any): Promise<any> {
    const id = this.nextId++;
    const rpc = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: tool, arguments: params }
    };
    // newline-delimited JSON is what the server expects.
    const line = JSON.stringify(rpc) + '\n';
    this.proc.stdin.write(line);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
}

export function launchMCPServer(extensionPath: string | undefined, outputChannel: vscode.OutputChannel): ChildProcessWithoutNullStreams | undefined {
  globalOutputChannel = outputChannel; // remember for later client creation
  mcpClientInstance = undefined; // clear any previous client wrapper
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const createLogStream = (): fs.WriteStream | undefined => {
    try {
      if (!workspaceRoot) return undefined;
      const vscodeDir = path.join(workspaceRoot, '.vscode');
      if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir, { recursive: true });
      const logPath = path.join(vscodeDir, 'devmemory.log');
      const stream = fs.createWriteStream(logPath, { flags: 'a' });
      stream.write(`\n[devmemory] --- New MCP session ${new Date().toISOString()} ---\n`);
      return stream;
    } catch (err) {
      return undefined;
    }
  };

  outputChannel.appendLine(`[Dev Memory] launcher: extensionPath=${extensionPath || '<none>'} workspaceRoot=${workspaceRoot || '<none>'}`);

  // determine path to the bundled server; prefer extension installation,
  // fall back to workspace copy if running from source
  let mcpPath: string | undefined;
  if (extensionPath) {
    const candidate = path.join(extensionPath, 'dist', 'mcp-server.bundle.js');
    if (fs.existsSync(candidate)) {
      mcpPath = candidate;
      outputChannel.appendLine('[Dev Memory] Using bundled MCP bundle from extension path: ' + candidate);
    }
  }
  if (!mcpPath && workspaceRoot) {
    const candidate = path.join(workspaceRoot, 'packages', 'vscode-extension', 'dist', 'mcp-server.bundle.js');
    if (fs.existsSync(candidate)) {
      mcpPath = candidate;
      outputChannel.appendLine('[Dev Memory] Using workspace MCP bundle: ' + candidate);
    }
  }
  if (!mcpPath) {
    outputChannel.appendLine('[Dev Memory] No MCP server bundle available to launch.');
    return undefined;
  }

  outputChannel.appendLine('[Dev Memory] Spawning MCP server process at: ' + mcpPath);
  const runtimeXenovaEntry = path.join(path.dirname(mcpPath), 'runtime', 'node_modules', '@xenova', 'transformers', 'src', 'transformers.js');
  const childEnv = { ...process.env } as NodeJS.ProcessEnv;
  if (fs.existsSync(runtimeXenovaEntry)) {
    childEnv.DEVMEMORY_XENOVA_IMPORT = pathToFileURL(runtimeXenovaEntry).href;
    outputChannel.appendLine('[Dev Memory] Using packaged Xenova runtime: ' + runtimeXenovaEntry);
  }

  const proc = spawn('node', [mcpPath], {
    cwd: path.dirname(mcpPath),
    env: childEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  const logStream = createLogStream();
  proc.stdout.on('data', (data) => {
    const s = data.toString();
    outputChannel.appendLine(`[MCP] ${s}`);
    if (logStream) logStream.write(`[${new Date().toISOString()}] MCP: ${s}`);
  });
  proc.stderr.on('data', (data) => {
    const s = data.toString();
    outputChannel.appendLine(`[MCP-ERR] ${s}`);
    if (logStream) logStream.write(`[${new Date().toISOString()}] MCP-ERR: ${s}`);
  });

  proc.on('error', (err) => {
    outputChannel.appendLine('[Dev Memory] MCP process error: ' + err?.message);
  });
  proc.on('exit', (code) => {
    try { if (logStream) logStream.end(); } catch (e) {}
  });

  return proc;
}

export async function sendMCPRequest(proc: ChildProcessWithoutNullStreams | undefined, req: any): Promise<any> {
  if (!proc) return { error: 'MCP server not running' };
  if (!mcpClientInstance || mcpClientInstance.proc !== proc) {
    // create a new client wrapper whenever the process changes
    mcpClientInstance = new McpClient(proc, globalOutputChannel!);
  }
  // Support both the legacy (req.tool / req.params) and the explicit
  // JSON-RPC method form (req.method / req.params). If a caller supplies
  // req.method we treat it as a top-level JSON-RPC call (e.g. "tools/list").
  if (req && typeof req.method === 'string') {
    return mcpClientInstance.sendRpc(req.method, req.params);
  }
  return mcpClientInstance.send(req.tool, req.params);
}
