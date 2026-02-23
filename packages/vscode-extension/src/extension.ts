import * as vscode from 'vscode';
import { launchMCPServer, sendMCPRequest } from './mcpLauncher';

let mcpProcess: ReturnType<typeof launchMCPServer> | undefined;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  const fs = require('fs');
  const path = require('path');
  function registerMCPServer(rootPath: string) {
    const vscodeDir = path.join(rootPath, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
      try { fs.mkdirSync(vscodeDir, { recursive: true }); } catch (e) { /* ignore */ }
    }
    const mcpConfigPath = path.join(vscodeDir, 'mcp.json');
    // Prefer workspace-relative bundle path when available (safer in monorepos).
    // Fall back to installed extension bundle path when not running from source.
    const workspaceBundleRel = '${workspaceFolder}/packages/vscode-extension/dist/mcp-server.bundle.js';
    let serverArgs: string[] = [workspaceBundleRel];
    if (context.extensionPath) {
      const extBundle = path.join(context.extensionPath, 'dist', 'mcp-server.bundle.js');
      const workspaceBundleAbs = path.join(rootPath, 'packages', 'vscode-extension', 'dist', 'mcp-server.bundle.js');
      // If the workspace has the bundle (dev mode), prefer the workspace variable form which VS Code will expand.
      if (fs.existsSync(workspaceBundleAbs)) {
        serverArgs = [workspaceBundleRel];
        outputChannel.appendLine(`[Dev Memory] registerMCPServer: using workspace-relative MCP bundle in mcp.json: ${workspaceBundleRel}`);
      } else if (fs.existsSync(extBundle)) {
        // Installed extension: write absolute path to the installed bundle so MCP can be launched directly.
        serverArgs = [extBundle];
        outputChannel.appendLine(`[Dev Memory] registerMCPServer: using installed extension MCP bundle in mcp.json: ${extBundle}`);
      } else {
        // default to workspace-relative variable if nothing else found
        serverArgs = [workspaceBundleRel];
        outputChannel.appendLine(`[Dev Memory] registerMCPServer: no bundle found; defaulting to workspace-relative entry: ${workspaceBundleRel}`);
      }
    }

    const newConfig = {
      servers: {
        'devmemory-local': {
          type: 'stdio',
          command: 'node',
          args: serverArgs
        }
      }
    };
    try {
      let mergedConfig = newConfig;
      if (fs.existsSync(mcpConfigPath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
          // Merge top-level while preferring the new mcpServer fields where necessary
          mergedConfig = { ...existing, ...newConfig };
          // Ensure we do not add or preserve deprecated fields that the extension shouldn't write
          if ('tools' in mergedConfig) delete mergedConfig.tools;
          if ('launchedAt' in mergedConfig) delete mergedConfig.launchedAt;
        } catch (parseErr) {
          // Backup the malformed file and continue with a fresh config
          const backup = mcpConfigPath + `.bak.${Date.now()}`;
          try {
            fs.copyFileSync(mcpConfigPath, backup);
            outputChannel.appendLine(`[Dev Memory] Existing mcp.json was invalid JSON; backed up to ${backup}`);
          } catch (copyErr) {
            outputChannel.appendLine(`[Dev Memory] Failed to back up invalid mcp.json: ${copyErr}`);
          }
          mergedConfig = newConfig;
        }
      }
      fs.writeFileSync(mcpConfigPath, JSON.stringify(mergedConfig, null, 2));
      outputChannel.appendLine(`[Dev Memory] MCP server registered/updated in mcp.json.`);
    } catch (err) {
      outputChannel.appendLine(`[Dev Memory] Failed to write mcp.json: ${err}`);
    }
  }
  outputChannel = vscode.window.createOutputChannel('Dev Memory');
  outputChannel.show(true);

  // Show welcome page on activation
  const panel = vscode.window.createWebviewPanel(
    'devMemoryWelcome',
    'Dev Memory — AI Code Recall',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );
  panel.webview.html = `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Dev Memory — AI Code Recall</title>
      <style>
        :root { color-scheme: light dark; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 18px; margin: 0; }
        header { display:flex; align-items:center; gap:12px; }
        h1 { font-size:18px; margin:0; }
        .row { display:flex; gap:8px; margin-top:12px; }
        button { background:#0e639c; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; }
        button.secondary { background:#2d2d2d; }
        input[type="search"] { flex:1; padding:8px; border-radius:6px; border:1px solid #ccc; }
        .panel { margin-top:14px; padding:12px; border-radius:8px; background:rgba(0,0,0,0.03); }
        .warning { background: #fff4e5; border-left:4px solid #ffb020; padding:8px; border-radius:4px; margin-top:12px; }
        pre { background:#0b1220; color:#d6deeb; padding:12px; border-radius:6px; overflow:auto; max-height:240px; }
        .muted { color:var(--vscode-editor-foreground, #6b6b6b); font-size:12px; }
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
        <div id="status" style="margin-top:8px;">Status: <strong id="statusText">idle</strong></div>
      </div>

      <div class="warning">
        Note: Indexing writes a local vector index under <code>workspaceRoot/.dev-memory/index.json</code>.
        After you reload the window, you must re-run Index Project to re-create the index before search will return results.
      </div>

      <h3 style="margin-top:14px;">Results</h3>
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
          } else if (msg.type === 'status') {
            statusText.textContent = msg.text;
          } else if (msg.type === 'result') {
            statusText.textContent = 'idle';
            resultsPre.textContent = JSON.stringify(msg.data, null, 2);
          } else if (msg.type === 'error') {
            statusText.textContent = 'error';
            resultsPre.textContent = msg.error;
          }
        });
      </script>
    </body>
    </html>
  `;

  // Provide initial workspace rootPath to the webview and handle messages from it
  const initialRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  panel.webview.postMessage({ type: 'init', rootPath: initialRoot });

  panel.webview.onDidReceiveMessage(async (message) => {
    try {
      if (!message || !message.command) return;
      if (message.command === 'index') {
        outputChannel.appendLine('[Dev Memory] Webview requested index (force=' + Boolean(message.force) + ')');
        panel.webview.postMessage({ type: 'status', text: 'indexing...' });
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!rootPath) {
          const err = 'No workspace folder to index.';
          outputChannel.appendLine('[Dev Memory] ' + err);
          panel.webview.postMessage({ type: 'error', error: err });
          return;
        }
        const res = await sendMCPRequest(mcpProcess, { method: 'tools/call', params: { name: 'ingest_project', arguments: { rootPath, force: Boolean(message.force) } } });
        outputChannel.appendLine('[Dev Memory] Indexing complete (webview).');
        panel.webview.postMessage({ type: 'result', data: res });
      } else if (message.command === 'search') {
        outputChannel.appendLine('[Dev Memory] Webview requested search: ' + message.query);
        panel.webview.postMessage({ type: 'status', text: 'searching...' });
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!rootPath) {
          const err = 'No workspace folder for search.';
          outputChannel.appendLine('[Dev Memory] ' + err);
          panel.webview.postMessage({ type: 'error', error: err });
          return;
        }
        const res = await sendMCPRequest(mcpProcess, { method: 'tools/call', params: { name: 'semantic_search', arguments: { query: message.query, k: 10, rootPath } } });
        outputChannel.appendLine('[Dev Memory] Search complete (webview).');
        // semantic_search returns its payload inside result.content as a text block
        let parsed = res;
        try {
          if (res && Array.isArray(res.content)) {
            const textBlock = res.content.find((c: any) => c.type === 'text');
            if (textBlock && typeof textBlock.text === 'string') {
              parsed = JSON.parse(textBlock.text);
            }
          }
        } catch (e) {
          // fall back to raw result
          parsed = res;
        }
        panel.webview.postMessage({ type: 'result', data: parsed });
      }
    } catch (err) {
      const em = err && (err as any).message ? (err as any).message : String(err);
      outputChannel.appendLine('[Dev Memory] Error handling webview message: ' + em);
      panel.webview.postMessage({ type: 'error', error: em });
    }
  });

  // Pass extension context so launcher can prefer a bundled MCP server inside the installed extension
  mcpProcess = launchMCPServer(context.extensionPath, outputChannel);
  outputChannel.appendLine('[Dev Memory] MCP server launched.');
  const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (rootPath) {
    registerMCPServer(rootPath);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('devmemory.indexProject', async () => {
      outputChannel.appendLine('[Dev Memory] Indexing project...');
      const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!rootPath) {
        outputChannel.appendLine('[Dev Memory] No workspace folder found.');
        return;
      }
      const result = await sendMCPRequest(mcpProcess, {
        method: 'tools/call',
        params: { name: 'ingest_project', arguments: { rootPath } }
      });
      outputChannel.appendLine('[Dev Memory] Indexing complete.');
      outputChannel.appendLine('[Dev Memory] Result:');
      outputChannel.appendLine(JSON.stringify(result, null, 2));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('devmemory.searchMemory', async () => {
      outputChannel.appendLine('[Dev Memory] Searching project memory...');
      const query = await vscode.window.showInputBox({ prompt: 'Enter search query' });
      if (!query) {
        outputChannel.appendLine('[Dev Memory] No query entered.');
        return;
      }
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const result = await sendMCPRequest(mcpProcess, {
          method: 'tools/call',
          params: { name: 'semantic_search', arguments: { query, rootPath } }
        });
      outputChannel.appendLine('[Dev Memory] Search results:');
      outputChannel.appendLine(JSON.stringify(result, null, 2));
    })
  );
}

export function deactivate() {
  if (mcpProcess) {
    mcpProcess.kill();
  }
}
