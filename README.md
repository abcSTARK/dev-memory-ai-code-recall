# Dev Memory — AI Code Recall

Dev Memory is a local-first memory engine for AI coding workflows. It indexes your workspace into a local semantic store and serves recall through MCP and a VS Code extension.

## Current status (implemented)

- Local embeddings: `@xenova/transformers` (WASM path) with dynamic loading.
- Local vector store: JSON file with cosine search at `.dev-memory/index.json`.
- MCP tools:
  - `ingest_project`
  - `semantic_search`
  - `remember_note`
  - `project_summary`
  - `embedding_status`
- VS Code extension:
  - Starts bundled MCP server
  - Registers workspace MCP config in `.vscode/mcp.json`
  - Welcome webview with Index/Search UX
  - Embedding provider status shown in UI (`xenova-wasm` vs fallback)
  - Command to reopen welcome page

## Not in scope today

- LanceDB is not used in current runtime.
- Native ONNX runtime packaging is not required for normal usage.

## Monorepo layout

```text
packages/
  core/             # @devmemory/core
  mcp-server/       # @devmemory/mcp
  vscode-extension/ # VS Code extension
```

## Core behavior

`@devmemory/core` provides:

- File ingestion with filtering
- Chunking
- Embedding generation
- JSON-backed vector persistence
- Semantic search and note memory APIs

Storage is workspace-local:

- `.dev-memory/index.json` (vectors + metadata)

## MCP server

`@devmemory/mcp` uses the official MCP SDK over stdio.

Example: list tools

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | node packages/mcp-server/dist/index.js
```

Example: semantic search

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"semantic_search","arguments":{"query":"indexing flow","k":5,"rootPath":"/path/to/workspace"}}}' \
  | node packages/mcp-server/dist/index.js
```

## VS Code extension

Commands:

- `Dev Memory: Index Project`
- `Dev Memory: Search Project Memory`
- `Dev Memory: Open Welcome Page`

Notes:

- Indexing is explicit/manual today.
- After VS Code reload, rerun indexing before searching.

## Packaging model (single VSIX)

The extension packages:

- `dist/extension.js`
- `dist/mcp-server.bundle.js`
- `dist/runtime/node_modules/...` runtime deps for Xenova/ONNX WASM

This allows one VSIX artifact to run without asking users to build native modules locally.

## Build and package

From repo root:

```bash
npm --prefix packages/core run build
npm --prefix packages/mcp-server run build
npm --prefix packages/vscode-extension run build
node packages/vscode-extension/scripts/bundle-mcp.js
cd packages/vscode-extension && npm run package
```

VSIX output:

- `packages/vscode-extension/.vsce-dist/devmemory-ai-code-recall-1.0.0.vsix`

## Privacy

- 100% local execution
- No API keys
- No cloud calls required for core workflow

## License

MIT
