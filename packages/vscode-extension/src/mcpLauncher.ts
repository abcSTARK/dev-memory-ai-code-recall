import * as vscode from 'vscode';
import { spawn, spawnSync, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

function buildMCPServer(workspaceRoot: string, outputChannel: vscode.OutputChannel): boolean {
  const pkgDir = path.join(workspaceRoot, 'packages', 'mcp-server');
  if (!fs.existsSync(pkgDir)) {
    outputChannel.appendLine('[Dev Memory] MCP package folder not found: ' + pkgDir);
    return false;
  }

  outputChannel.appendLine('[Dev Memory] Running npm install for mcp-server...');
  const install = spawnSync('npm', ['install'], { cwd: pkgDir, shell: true });
  if (install.stdout) outputChannel.appendLine(install.stdout.toString());
  if (install.stderr) outputChannel.appendLine(install.stderr.toString());
  if (install.status !== 0) {
    outputChannel.appendLine('[Dev Memory] npm install failed for mcp-server.');
    return false;
  }

  outputChannel.appendLine('[Dev Memory] Building mcp-server (tsc)...');
  const build = spawnSync('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: pkgDir, shell: true });
  if (build.stdout) outputChannel.appendLine(build.stdout.toString());
  if (build.stderr) outputChannel.appendLine(build.stderr.toString());
  if (build.status !== 0) {
    outputChannel.appendLine('[Dev Memory] Build failed for mcp-server.');
    return false;
  }

  outputChannel.appendLine('[Dev Memory] mcp-server build complete.');
  return true;
}

export function launchMCPServer(extensionPath: string | undefined, outputChannel: vscode.OutputChannel): ChildProcessWithoutNullStreams | undefined {
  // extensionPath is the installed extension folder (when running as a VSIX). Prefer using a bundled MCP server there.
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  // Prepare a persistent log file in the workspace so users can tail full MCP logs.
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
      // Fail silently — logging is best-effort
      return undefined;
    }
  };
  // Log environment so users can see why we pick a particular path
  outputChannel.appendLine(`[Dev Memory] launcher: extensionPath=${extensionPath || '<none>'} workspaceRoot=${workspaceRoot || '<none>'}`);
  if (!workspaceRoot && !extensionPath) {
    outputChannel.appendLine('[Dev Memory] No workspace folder and no extension path available; cannot launch MCP server.');
    return undefined;
  }
  if (!workspaceRoot) {
    outputChannel.appendLine('[Dev Memory] No workspace folder found; will attempt to use bundled MCP in the extension path.');
  }

  // First try bundled MCP inside the extension installation path
  let mcpPath: string | undefined;
  if (extensionPath) {
    const bundledBundle = path.join(extensionPath, 'dist', 'mcp-server.bundle.js');
    const bundled = path.join(extensionPath, 'packages', 'mcp-server', 'dist', 'index.js');
    if (fs.existsSync(bundledBundle)) {
      mcpPath = bundledBundle;
      outputChannel.appendLine('[Dev Memory] Using bundled MCP bundle from extension path: ' + bundledBundle);
      outputChannel.appendLine('[Dev Memory] Bundled MCP found — skipping workspace build/use.');

      // To ensure Node resolves runtime deps from the embedded package's node_modules
      // we copy the bundled artifact into the embedded package dist folder (if not
      // already present) and spawn it from there. This makes the bundle's module
      // filename live under packages/mcp-server so require() will search
      // packages/mcp-server/node_modules when resolving dependencies like
      // "@lancedb/lancedb".
      const targetPkgDist = path.join(extensionPath, 'packages', 'mcp-server', 'dist');
      const targetBundlePath = path.join(targetPkgDist, 'mcp-server.bundle.js');
      try {
        if (!fs.existsSync(targetPkgDist)) {
          fs.mkdirSync(targetPkgDist, { recursive: true });
        }
        if (!fs.existsSync(targetBundlePath)) {
          fs.copyFileSync(bundledBundle, targetBundlePath);
          outputChannel.appendLine('[Dev Memory] Copied bundled MCP into embedded package dist: ' + targetBundlePath);
        } else {
          outputChannel.appendLine('[Dev Memory] Embedded package already has bundle at: ' + targetBundlePath);
        }
      } catch (err: any) {
        outputChannel.appendLine('[Dev Memory] Failed to prepare embedded bundle: ' + err?.message);
      }

      outputChannel.appendLine('[Dev Memory] Spawning MCP server process at: ' + targetBundlePath);

      // Track whether we've attempted to auto-install runtime deps already to avoid loops
      let attemptedInstall = false;

      const spawnEmbeddedBundle = (): ChildProcessWithoutNullStreams => {
        // Preflight: ensure platform-specific native packages required by @lancedb
        // are present in the embedded node_modules. If not, run npm install
        // to fetch the correct platform binaries before spawning.
        try {
          const embeddedNodeModules = path.join(extensionPath, 'packages', 'mcp-server', 'node_modules');
          // helper to check for a scoped package
          const hasScoped = (scope: string, name: string) => fs.existsSync(path.join(embeddedNodeModules, scope, name));
          const candidates: Array<[string,string]> = [];
          // Populate candidate package names based on current platform/arch
          switch (process.platform) {
            case 'darwin':
              candidates.push(['@lancedb', 'lancedb-darwin-universal']);
              candidates.push(['@lancedb', 'lancedb-darwin-x64']);
              candidates.push(['@lancedb', 'lancedb-darwin-arm64']);
              break;
            case 'win32':
              candidates.push(['@lancedb', 'lancedb-win32-x64-msvc']);
              candidates.push(['@lancedb', 'lancedb-win32-ia32-msvc']);
              candidates.push(['@lancedb', 'lancedb-win32-arm64-msvc']);
              break;
            case 'linux':
              // include both musl/gnu candidates; installer will pick correct one
              candidates.push(['@lancedb', 'lancedb-linux-x64-gnu']);
              candidates.push(['@lancedb', 'lancedb-linux-x64-musl']);
              candidates.push(['@lancedb', 'lancedb-linux-arm64-gnu']);
              candidates.push(['@lancedb', 'lancedb-linux-arm64-musl']);
              candidates.push(['@lancedb', 'lancedb-linux-arm-gnueabihf']);
              candidates.push(['@lancedb', 'lancedb-linux-arm-musleabihf']);
              break;
            default:
              break;
          }

          let found = false;
          for (const [scope, name] of candidates) {
            if (hasScoped(scope, name)) { found = true; break; }
          }

          if (!found) {
            outputChannel.appendLine('[Dev Memory] Platform-specific native packages for @lancedb not found in embedded node_modules. Running `npm install --production` first...');
            const install = spawnSync('npm', ['install', '--production', '--no-audit', '--no-fund'], {
              cwd: path.join(extensionPath, 'packages', 'mcp-server'),
              shell: true
            });
            if (install.stdout) outputChannel.appendLine(install.stdout.toString());
            if (install.stderr) outputChannel.appendLine(install.stderr.toString());
            if (install.status === 0) {
              outputChannel.appendLine('[Dev Memory] npm install completed successfully (preflight).');
            } else {
              outputChannel.appendLine('[Dev Memory] npm install failed during preflight (status ' + install.status + '). Continuing to spawn the bundle to surface errors.');
            }
          }
        } catch (err: any) {
          outputChannel.appendLine('[Dev Memory] Preflight check failed: ' + (err?.message || String(err)));
        }

        const proc = spawn('node', [path.join('.', 'dist', 'mcp-server.bundle.js')], {
          cwd: path.join(extensionPath, 'packages', 'mcp-server'),
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
          // Ensure we always close the per-process log stream so file handles
          // are not left open across reloads/restarts which can cause logs to
          // appear stale in external viewers.
          try { if (logStream) logStream.end(); } catch (e) {}

          if (code !== 0 && !attemptedInstall) {
            attemptedInstall = true;
            outputChannel.appendLine('[Dev Memory] MCP exited with code ' + code + '. Attempting to run `npm install --production` in embedded mcp-server to fetch runtime deps...');
            try {
              // Run a focused production install to fetch native/platform packages
              const install = spawnSync('npm', ['install', '--production', '--no-audit', '--no-fund'], {
                cwd: path.join(extensionPath, 'packages', 'mcp-server'),
                shell: true
              });
              if (install.stdout) outputChannel.appendLine(install.stdout.toString());
              if (install.stderr) outputChannel.appendLine(install.stderr.toString());
              if (install.status === 0) {
                outputChannel.appendLine('[Dev Memory] npm install completed successfully; restarting MCP server.');
                spawnEmbeddedBundle();
              } else {
                outputChannel.appendLine('[Dev Memory] npm install failed (status ' + install.status + '). See logs above.');
              }
            } catch (err: any) {
              outputChannel.appendLine('[Dev Memory] Failed to run npm install: ' + err?.message);
            }
          }
        });
        return proc;
      };

      return spawnEmbeddedBundle();
    }
    if (fs.existsSync(bundled)) {
      mcpPath = bundled;
      outputChannel.appendLine('[Dev Memory] Using bundled MCP server from extension path: ' + bundled);
      // Prefer bundled MCP and do not attempt to build or use workspace copy when bundled is present
      outputChannel.appendLine('[Dev Memory] Bundled MCP found — skipping workspace build/use.');
      outputChannel.appendLine('[Dev Memory] Spawning MCP server process at: ' + mcpPath);
      const procBundled = spawn('node', [mcpPath], {
        cwd: path.join(extensionPath, 'packages', 'mcp-server'),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      const bundledLog = createLogStream();
      procBundled.stdout.on('data', (data) => {
        const s = data.toString();
        outputChannel.appendLine(`[MCP] ${s}`);
        if (bundledLog) bundledLog.write(`[${new Date().toISOString()}] MCP: ${s}`);
      });
      procBundled.stderr.on('data', (data) => {
        const s = data.toString();
        outputChannel.appendLine(`[MCP-ERR] ${s}`);
        if (bundledLog) bundledLog.write(`[${new Date().toISOString()}] MCP-ERR: ${s}`);
      });

      procBundled.on('exit', () => {
        try { if (bundledLog) bundledLog.end(); } catch (e) {}
      });

      return procBundled;
    }
  }
  // If no bundled server was found, try workspace copy but do NOT trigger builds automatically
  if (workspaceRoot) {
    const workspaceMcp = path.join(workspaceRoot, 'packages', 'mcp-server', 'dist', 'index.js');
    if (fs.existsSync(workspaceMcp)) {
      outputChannel.appendLine('[Dev Memory] Using workspace MCP server at: ' + workspaceMcp);
      outputChannel.appendLine('[Dev Memory] Spawning MCP server process at: ' + workspaceMcp);
      const proc = spawn('node', [workspaceMcp], {
        cwd: workspaceRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      const wsLog = createLogStream();
      proc.stdout.on('data', (data) => {
        const s = data.toString();
        outputChannel.appendLine(`[MCP] ${s}`);
        if (wsLog) wsLog.write(`[${new Date().toISOString()}] MCP: ${s}`);
      });
      proc.stderr.on('data', (data) => {
        const s = data.toString();
        outputChannel.appendLine(`[MCP-ERR] ${s}`);
        if (wsLog) wsLog.write(`[${new Date().toISOString()}] MCP-ERR: ${s}`);
      });

      proc.on('exit', () => {
        try { if (wsLog) wsLog.end(); } catch (e) {}
      });

      return proc;
    }
  }

  outputChannel.appendLine('[Dev Memory] No MCP server binary available to launch (neither bundled nor workspace).');
  return undefined;
}

export async function sendMCPRequest(proc: ChildProcessWithoutNullStreams | undefined, req: any): Promise<any> {
  if (!proc) return { error: 'MCP server not running' };
  return new Promise((resolve) => {
    let result = '';
    const onData = (data: Buffer) => {
      result += data.toString();
      if (result.includes('\n')) {
        proc.stdout.off('data', onData);
        try {
          resolve(JSON.parse(result));
        } catch {
          resolve({ raw: result });
        }
      }
    };
    proc.stdout.on('data', onData);
    proc.stdin.write(JSON.stringify(req) + '\n');
  });
}
