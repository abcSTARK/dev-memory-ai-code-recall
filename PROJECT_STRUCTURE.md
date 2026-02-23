# Project Structure and Packaging

This repository is organized as a lightweight monorepo containing three main
subprojects plus some root‑level scripts and configuration.  Each subproject is
an independent npm package, with its own `package.json` and `tsconfig.json`.

```
/
├─ package.json               ← root manifest (workspace scripts)
├─ README.md
├─ PROJECT_STRUCTURE.md       ← this document
├─ scripts/                   ← helper scripts used during development and
│    test_mcp_client.js       │      testing (e.g. MCP protocol helpers)
└─ packages/
   ├─ core/                   ← shared library for ingestion/search/etc.
   │   ├─ src/                │   TypeScript source
   │   ├─ dist/               │   compiled JavaScript output
   │   ├─ package.json
   │   └─ tsconfig.json
   │
   ├─ mcp-server/             ← MCP server implementation that exposes core
   │   ├─ src/                │   builds an McpServer and registers tools
   │   ├─ dist/               │   compiled JavaScript used by the bundle
   │   ├─ test/               │   smoke tests exercising the MCP protocol
   │   ├─ package.json
   │   └─ tsconfig.json
   │
   └─ vscode-extension/       ← VS Code extension UI and launcher
       ├─ src/                │   extension code, webview logic, mcp client
       ├─ dist/               │   compiled extension JavaScript
       ├─ assets/             │   icon and other static assets
       ├─ scripts/            │   build/package helpers (bundle-mcp, etc.)
       ├─ package.json
       └─ tsconfig.json
```

## Dependencies and `node_modules`

Each package is a standalone npm project.  Running `npm install` in a package
directory creates a local `node_modules` tree for that package.  There is no
top‑level hoisting; each component only installs the modules it needs.  For
example, the `vscode-extension` only depends on VS Code APIs and build tools, the
`mcp-server` depends on the MCP SDK and `@devmemory/core`, and `core` has its
own smaller dependency set.

### Workspace dependency management

The repository already declares a root-level `package.json` with `private: true`
and a `workspaces: ["packages/*"]` field.  Installing at the workspace root
(`npm install` or `pnpm install`) will hoist shared dependencies into a single
`node_modules` tree at the root.  This avoids redundant copies of large packages
(e.g. the MCP SDK, TypeScript, build tools or native binaries) in every
subpackage; the package manager deduplicates them automatically.

Developers should prefer working out of the root directory and running commands
via `npm run <script> --workspace=<pkg>` or Turbo’s `turbo` task runner; the
individual `npm install` commands previously used were simply convenience
when editing a single package.

```
# install everything once at root
npm install
# build only core
npm run build --workspace=@devmemory/core
```

## Build and Packaging Flow

1. **Core**: compile TypeScript source with `tsc` to `packages/core/dist`.
   This library exports functions used by both the server and tests.

2. **MCP Server**: compile its TypeScript to `packages/mcp-server/dist`.  The
   entrypoint (`dist/index.js`) constructs an `McpServer` from the
   `@modelcontextprotocol/sdk`, registers the four tools (`ingest_project`,
   `semantic_search`, etc.), and connects over the `StdioServerTransport`.
   The package itself is not deployed directly; instead its compiled output is
   bundled for inclusion in the extension.

3. **Bundling**: the script
   `packages/vscode-extension/scripts/bundle-mcp.js` uses `esbuild` to bundle
   the MCP server package into a single `mcp-server.bundle.js` file.  This
   bundle is placed into `packages/vscode-extension/dist/` and later shipped
   inside the VSIX.  Bundling ensures that runtime dependencies (including
   platform‑specific native binaries) are resolved correctly when the extension
   spawns the server.

4. **Extension**: compile `packages/vscode-extension/src` to
   `packages/vscode-extension/dist` and then package with `vsce`.  The
   `package` npm script orchestrates the compile, bundle, and packaging steps:

   ```sh
   npm run build           # compile TypeScript
   npm run bundle:mcp      # rebuild the MCP bundle
   npm run package:prepare # prepare clean .vsce-dist folder
   cd .vsce-dist && vsce package # produce .vsix
   ```

   The resulting `.vsix` file appears under
   `packages/vscode-extension/.vsce-dist/` and contains both the extension code
   and the bundled MCP server.

5. **Runtime**: when the extension activates in Visual Studio Code it spawns
   the bundled MCP server using `child_process.spawn`.  Communication between
   the extension and the server uses the Model Context Protocol (MCP) over
   stdin/stdout; a minimal client implementation in `mcpLauncher.ts` handles
   framing, request/response matching, and logs notifications.  The server
   writes its own diagnostics using `console.*`, which are captured and also
   emitted as MCP logging notifications back to the extension.

### Packaging considerations

When the extension is packaged (`npm run package` from `packages/vscode-extension`)
only the compiled `dist` directory, the bundled MCP server and a handful of
static assets are copied into the `.vsce-dist` folder.  No `node_modules` or
source files are included in the VSIX; the server bundle contains all of the
runtime code it needs.  This keeps the resulting VSIX tiny (a few megabytes
at most) instead of bloated with development artifacts.

```sh
npm run package:ext   # root script that delegates into the workspace
# resulting .vsix contains:
#   dist/extension.js
#   dist/mcp-server.bundle.js
#   assets/icon.png, README, LICENSE, package.json
```

```
# note: packages/ and node_modules/ are explicitly excluded via .vscodeignore
```

## Summary

This monorepo makes it easy to work on all parts of the system together while
keeping dependencies correctly scoped.  The packaging process compiles each
component, bundles the server into a standalone artifact, and then packages the
entire extension for distribution.  Logs and communication now flow over the
MCP protocol, providing structured telemetry and restoring the detailed
indexing/search messages that were visible prior to the MCP SDK upgrade.