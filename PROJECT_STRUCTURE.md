# Project Structure and Packaging

This repo is a monorepo with three main packages.

```text
/
├─ package.json
├─ README.md
├─ PROJECT_STRUCTURE.md
└─ packages/
   ├─ core/
   │  ├─ src/
   │  ├─ dist/
   │  └─ package.json
   ├─ mcp-server/
   │  ├─ src/
   │  ├─ dist/
   │  ├─ test/
   │  └─ package.json
   └─ vscode-extension/
      ├─ src/
      ├─ dist/
      ├─ assets/
      ├─ scripts/
      └─ package.json
```

## Package responsibilities

- `@devmemory/core`: ingestion, chunking, embeddings, JSON vector storage, semantic search.
- `@devmemory/mcp`: MCP server tool surface over stdio.
- `devmemory-ai-code-recall` (VS Code extension): UI/commands, MCP launch, lifecycle.

## Runtime storage

Workspace-local files:

- `.dev-memory/index.json` (vector index)
- `.vscode/mcp.json` (workspace MCP registration)
- `.vscode/devmemory.log` (extension session log)

## Build flow

1. Build core (`tsc`)
2. Build MCP server (`tsc`)
3. Build extension (`tsc`)
4. Bundle MCP server into extension `dist/mcp-server.bundle.js`
5. Prepare `.vsce-dist` and package VSIX

## VSIX packaging details

The prepared extension folder includes:

- `dist/extension.js`
- `dist/mcp-server.bundle.js`
- `dist/runtime/node_modules/*` runtime dependencies needed by Xenova WASM path
- `assets/*`, `README.md`, `LICENSE.txt`, `package.json`

Runtime dependency staging is handled by:

- `packages/vscode-extension/scripts/prepare-package.js`

This enables a single VSIX artifact without requiring end-users to compile native addons.

## MCP tools currently exposed

- `index_codebase`
- `search_codebase`
- `save_project_note`
- `summarize_codebase`
- `get_embedding_status`
- `answer_from_codebase`
