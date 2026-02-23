import * as vscode from "vscode";
import { launchMCPServer, sendMCPRequest } from "./mcpLauncher";

let mcpProcess: ReturnType<typeof launchMCPServer> | undefined;
let outputChannel: vscode.OutputChannel;
let welcomePanel: vscode.WebviewPanel | undefined;

type EmbeddingStatus = {
  initialized?: boolean;
  provider?: string;
  model?: string;
  dimensions?: number;
  fallback?: boolean;
  lastError?: string | null;
};

function createWelcomeHtml(): string {
  return `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Dev Memory — AI Code Recall</title>
      <style>
        :root { color-scheme: light dark; }
        body {
          font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial);
          padding: 18px;
          margin: 0;
          color: var(--vscode-editor-foreground);
          background: var(--vscode-editor-background);
        }
        header { display:flex; align-items:center; gap:12px; }
        h1 { font-size:18px; margin:0; }
        h3 { margin-top:14px; }
        .row { display:flex; gap:8px; margin-top:12px; }
        button {
          background: var(--vscode-button-background, #0e639c);
          color: var(--vscode-button-foreground, #fff);
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
        }
        button.secondary {
          background: var(--vscode-button-secondaryBackground, #3a3d41);
          color: var(--vscode-button-secondaryForeground, #fff);
        }
        input[type="search"] {
          flex: 1;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid var(--vscode-input-border, #666);
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
        }
        .panel {
          margin-top: 14px;
          padding: 12px;
          border-radius: 8px;
          background: var(--vscode-editorWidget-background, rgba(127,127,127,0.1));
          border: 1px solid var(--vscode-editorWidget-border, transparent);
        }
        .warning {
          background: var(--vscode-inputValidation-warningBackground, #fff4e5);
          color: var(--vscode-inputValidation-warningForeground, var(--vscode-editor-foreground));
          border-left: 4px solid var(--vscode-inputValidation-warningBorder, #ffb020);
          padding: 8px;
          border-radius: 4px;
          margin-top: 12px;
        }
        code {
          background: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.15));
          padding: 2px 4px;
          border-radius: 4px;
        }
        pre {
          background: var(--vscode-textCodeBlock-background, #0b1220);
          color: var(--vscode-editor-foreground, #d6deeb);
          padding: 12px;
          border-radius: 6px;
          overflow: auto;
          max-height: 260px;
          border: 1px solid var(--vscode-editorWidget-border, transparent);
        }
        .muted { color: var(--vscode-descriptionForeground, #6b6b6b); font-size: 12px; }
        .kpi { margin-top: 6px; font-size: 13px; }
      </style>
    </head>
    <body>
      <header>
        <img src="https://raw.githubusercontent.com/abcSTARK/dev-memory-ai-code-recall/main/packages/vscode-extension/assets/icon.png" alt="logo" width="36" height="36" />
        <div>
          <h1>Dev Memory — AI Code Recall</h1>
          <div class="muted">Local semantic search for your repo. No cloud required.</div>
        </div>
      </header>

      <div class="row">
        <button id="indexBtn">Index Project</button>
        <button id="reindexBtn" class="secondary">Rebuild Index (force)</button>
      </div>

      <div class="row" style="margin-top:10px;">
        <input id="query" type="search" placeholder="Search project memory (semantic) — e.g. 'how to connect to DB'" />
        <button id="searchBtn">Search</button>
      </div>

      <div class="panel">
        <div class="muted">Workspace root:</div>
        <div id="rootPath">(not available)</div>
        <div class="kpi">Status: <strong id="statusText">idle</strong></div>
        <div class="kpi">
          Embedding provider:
          <strong id="embeddingProvider">unknown</strong>
          <span id="embeddingMeta" class="muted">pending...</span>
        </div>
      </div>

      <div class="warning">
        Note: Indexing writes a local vector index under <code>workspaceRoot/.dev-memory/index.json</code>.
        After you reload the window, run Index Project again before searching.
      </div>

      <h3>Results</h3>
      <div id="results"><pre id="resultsPre">No results yet.</pre></div>

      <script>
        const vscode = acquireVsCodeApi();
        const indexBtn = document.getElementById('indexBtn');
        const reindexBtn = document.getElementById('reindexBtn');
        const searchBtn = document.getElementById('searchBtn');
        const queryEl = document.getElementById('query');
        const statusText = document.getElementById('statusText');
        const rootPathEl = document.getElementById('rootPath');
        const resultsPre = document.getElementById('resultsPre');
        const embeddingProvider = document.getElementById('embeddingProvider');
        const embeddingMeta = document.getElementById('embeddingMeta');

        indexBtn.addEventListener('click', () => {
          statusText.textContent = 'indexing...';
          vscode.postMessage({ command: 'index', force: false });
        });
        reindexBtn.addEventListener('click', () => {
          statusText.textContent = 'reindexing...';
          vscode.postMessage({ command: 'index', force: true });
        });
        searchBtn.addEventListener('click', () => {
          const q = queryEl.value.trim();
          if (!q) return;
          statusText.textContent = 'searching...';
          resultsPre.textContent = 'Searching...';
          vscode.postMessage({ command: 'search', query: q });
        });

        window.addEventListener('message', event => {
          const msg = event.data;
          if (msg.type === 'init') {
            rootPathEl.textContent = msg.rootPath || '(no workspace)';
            vscode.postMessage({ command: 'embeddingStatus', warmup: true });
          } else if (msg.type === 'status') {
            statusText.textContent = msg.text;
          } else if (msg.type === 'result') {
            statusText.textContent = 'idle';
            resultsPre.textContent = JSON.stringify(msg.data, null, 2);
          } else if (msg.type === 'embedding') {
            embeddingProvider.textContent = msg.provider || 'unknown';
            embeddingMeta.textContent = msg.meta || 'n/a';
          } else if (msg.type === 'error') {
            statusText.textContent = 'error';
            resultsPre.textContent = msg.error;
          }
        });
      </script>
    </body>
    </html>
  `;
}

function parseEmbeddingStatus(raw: any): EmbeddingStatus {
  if (raw && Array.isArray(raw.content)) {
    const textBlock = raw.content.find((c: any) => c.type === "text");
    if (textBlock && typeof textBlock.text === "string") {
      try {
        return JSON.parse(textBlock.text);
      } catch {
        return {};
      }
    }
  }
  return raw || {};
}

async function refreshEmbeddingStatus(panel: vscode.WebviewPanel, rootPath?: string, warmup = false) {
  try {
    const statusRaw = await sendMCPRequest(mcpProcess, {
      method: "tools/call",
      params: { name: "embedding_status", arguments: { ...(rootPath ? { rootPath } : {}), warmup } }
    });
    const status = parseEmbeddingStatus(statusRaw);
    const provider = status.provider || "uninitialized";
    const metaParts: string[] = [];
    if (status.model) metaParts.push(`model=${status.model}`);
    if (status.dimensions) metaParts.push(`dim=${status.dimensions}`);
    if (status.fallback) metaParts.push("fallback=enabled");
    if (status.lastError) metaParts.push("lastError=present");
    panel.webview.postMessage({
      type: "embedding",
      provider,
      meta: metaParts.join(" | ") || "n/a"
    });
    outputChannel.appendLine(`[Dev Memory] Embedding status: provider=${provider} ${metaParts.join(" ")}`.trim());
  } catch (err) {
    const msg = err && (err as any).message ? (err as any).message : String(err);
    outputChannel.appendLine(`[Dev Memory] Failed to read embedding status: ${msg}`);
    panel.webview.postMessage({ type: "embedding", provider: "unknown", meta: "status unavailable" });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const fs = require("fs");
  const path = require("path");

  function registerMCPServer(rootPath: string) {
    const vscodeDir = path.join(rootPath, ".vscode");
    if (!fs.existsSync(vscodeDir)) {
      try { fs.mkdirSync(vscodeDir, { recursive: true }); } catch { /* ignore */ }
    }
    const mcpConfigPath = path.join(vscodeDir, "mcp.json");
    const workspaceBundleRel = "${workspaceFolder}/packages/vscode-extension/dist/mcp-server.bundle.js";
    let serverArgs: string[] = [workspaceBundleRel];
    if (context.extensionPath) {
      const extBundle = path.join(context.extensionPath, "dist", "mcp-server.bundle.js");
      const workspaceBundleAbs = path.join(rootPath, "packages", "vscode-extension", "dist", "mcp-server.bundle.js");
      if (fs.existsSync(workspaceBundleAbs)) {
        serverArgs = [workspaceBundleRel];
      } else if (fs.existsSync(extBundle)) {
        serverArgs = [extBundle];
      }
    }

    const newConfig = {
      servers: {
        "devmemory-local": {
          type: "stdio",
          command: "node",
          args: serverArgs
        }
      }
    };
    try {
      let mergedConfig = newConfig;
      if (fs.existsSync(mcpConfigPath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(mcpConfigPath, "utf8"));
          mergedConfig = { ...existing, ...newConfig };
          if ("tools" in mergedConfig) delete (mergedConfig as any).tools;
          if ("launchedAt" in mergedConfig) delete (mergedConfig as any).launchedAt;
        } catch {
          mergedConfig = newConfig;
        }
      }
      fs.writeFileSync(mcpConfigPath, JSON.stringify(mergedConfig, null, 2));
      outputChannel.appendLine("[Dev Memory] MCP server registered/updated in mcp.json.");
    } catch (err) {
      outputChannel.appendLine(`[Dev Memory] Failed to write mcp.json: ${err}`);
    }
  }

  function openWelcomePage() {
    if (welcomePanel) {
      welcomePanel.reveal(vscode.ViewColumn.One);
      return;
    }

    welcomePanel = vscode.window.createWebviewPanel(
      "devMemoryWelcome",
      "Dev Memory — AI Code Recall",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    welcomePanel.webview.html = createWelcomeHtml();

    const initialRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
    welcomePanel.webview.postMessage({ type: "init", rootPath: initialRoot });

    welcomePanel.onDidDispose(() => {
      welcomePanel = undefined;
    });

    welcomePanel.webview.onDidReceiveMessage(async (message: any) => {
      try {
        if (!message || !message.command) return;
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (message.command === "embeddingStatus") {
          await refreshEmbeddingStatus(welcomePanel!, rootPath, Boolean(message.warmup));
          return;
        }

        if (message.command === "index") {
          outputChannel.appendLine(`[Dev Memory] Webview requested index (force=${Boolean(message.force)})`);
          welcomePanel!.webview.postMessage({ type: "status", text: "indexing..." });
          if (!rootPath) {
            const err = "No workspace folder to index.";
            welcomePanel!.webview.postMessage({ type: "error", error: err });
            return;
          }
          const res = await sendMCPRequest(mcpProcess, {
            method: "tools/call",
            params: { name: "ingest_project", arguments: { rootPath, force: Boolean(message.force) } }
          });
          welcomePanel!.webview.postMessage({ type: "result", data: res });
          await refreshEmbeddingStatus(welcomePanel!, rootPath);
          return;
        }

        if (message.command === "search") {
          outputChannel.appendLine(`[Dev Memory] Webview requested search: ${message.query}`);
          welcomePanel!.webview.postMessage({ type: "status", text: "searching..." });
          if (!rootPath) {
            const err = "No workspace folder for search.";
            welcomePanel!.webview.postMessage({ type: "error", error: err });
            return;
          }
          const res = await sendMCPRequest(mcpProcess, {
            method: "tools/call",
            params: { name: "semantic_search", arguments: { query: message.query, k: 10, rootPath } }
          });

          let parsed = res;
          try {
            if (res && Array.isArray(res.content)) {
              const textBlock = res.content.find((c: any) => c.type === "text");
              if (textBlock && typeof textBlock.text === "string") {
                parsed = JSON.parse(textBlock.text);
              }
            }
          } catch {
            parsed = res;
          }
          welcomePanel!.webview.postMessage({ type: "result", data: parsed });
          await refreshEmbeddingStatus(welcomePanel!, rootPath);
        }
      } catch (err) {
        const em = err && (err as any).message ? (err as any).message : String(err);
        outputChannel.appendLine(`[Dev Memory] Error handling webview message: ${em}`);
        welcomePanel?.webview.postMessage({ type: "error", error: em });
      }
    });
  }

  outputChannel = vscode.window.createOutputChannel("Dev Memory");
  outputChannel.show(true);

  mcpProcess = launchMCPServer(context.extensionPath, outputChannel);
  outputChannel.appendLine("[Dev Memory] MCP server launched.");

  const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (rootPath) {
    registerMCPServer(rootPath);
  }

  openWelcomePage();

  context.subscriptions.push(
    vscode.commands.registerCommand("devmemory.openWelcome", () => {
      openWelcomePage();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devmemory.indexProject", async () => {
      outputChannel.appendLine("[Dev Memory] Indexing project...");
      const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!rootPath) {
        outputChannel.appendLine("[Dev Memory] No workspace folder found.");
        return;
      }
      const result = await sendMCPRequest(mcpProcess, {
        method: "tools/call",
        params: { name: "ingest_project", arguments: { rootPath } }
      });
      outputChannel.appendLine("[Dev Memory] Indexing complete.");
      outputChannel.appendLine(JSON.stringify(result, null, 2));
      if (welcomePanel) await refreshEmbeddingStatus(welcomePanel, rootPath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devmemory.searchMemory", async () => {
      outputChannel.appendLine("[Dev Memory] Searching project memory...");
      const query = await vscode.window.showInputBox({ prompt: "Enter search query" });
      if (!query) {
        outputChannel.appendLine("[Dev Memory] No query entered.");
        return;
      }
      const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const result = await sendMCPRequest(mcpProcess, {
        method: "tools/call",
        params: { name: "semantic_search", arguments: { query, rootPath } }
      });
      outputChannel.appendLine("[Dev Memory] Search results:");
      outputChannel.appendLine(JSON.stringify(result, null, 2));
      if (welcomePanel) await refreshEmbeddingStatus(welcomePanel, rootPath);
    })
  );
}

export function deactivate() {
  if (mcpProcess) {
    mcpProcess.kill();
  }
}
