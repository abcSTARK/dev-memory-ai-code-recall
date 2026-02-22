# Dev Memory --- AI Code Recall

## Local-First Memory Engine for AI Coding Agents

Dev Memory is a zero-config, fully local AI memory engine that provides
persistent semantic recall for your codebase.

It runs:

-   🧠 Local RAG engine (embeddings + vector search)
-   🔌 MCP server for agent integration
-   🧩 VS Code extension for installation and lifecycle management

No API keys. No cloud. No configuration required.

------------------------------------------------------------------------

# 🏗 Monorepo Architecture

Repository name:

dev-memory-ai-code-recall/

Structure:

dev-memory-ai-code-recall/ │ ├── package.json ├── turbo.json ├──
tsconfig.base.json │ ├── packages/ │ ├── core/ \# @devmemory/core │ ├──
mcp-server/ \# @devmemory/mcp │ └── vscode-extension/ \# Dev Memory ---
AI Code Recall │ ├── storage/ \# LanceDB persistent storage └──
README.md

------------------------------------------------------------------------

# 📦 Package Naming

Core Library: @devmemory/core

MCP Server: @devmemory/mcp

VS Code Extension Marketplace Name: Dev Memory --- AI Code Recall

Extension Identifier: devmemory.ai-code-recall

------------------------------------------------------------------------

# 🔄 Sequence Diagrams

## Project Indexing Flow

``` mermaid
sequenceDiagram
    participant User
    participant VSCodeExt as VS Code Extension
    participant MCP as MCP Server
    participant Core as Core RAG Layer
    participant Lance as LanceDB

    User->>VSCodeExt: Click "Index Project"
    VSCodeExt->>MCP: ingest_project()
    MCP->>Core: Scan + chunk files
    Core->>Core: Generate embeddings
    Core->>Lance: Store vectors
    Lance-->>Core: Persist confirmation
    Core-->>MCP: Index complete
    MCP-->>VSCodeExt: Success response
```

------------------------------------------------------------------------

## Agent Semantic Search Flow

``` mermaid
sequenceDiagram
    participant Agent
    participant MCP
    participant Core
    participant Lance

    Agent->>MCP: semantic_search(query)
    MCP->>Core: Embed query
    Core->>Lance: Vector search
    Lance-->>Core: Top K results
    Core-->>MCP: Formatted chunks
    MCP-->>Agent: Return enriched context
```

------------------------------------------------------------------------

# 🧠 Core Responsibilities (@devmemory/core)

-   File ingestion
-   Chunking
-   Local embeddings (Xenova Transformers)
-   LanceDB integration
-   Semantic search
-   Query embedding

------------------------------------------------------------------------

# 🔌 MCP Server (@devmemory/mcp)

Responsibilities:

-   Implements MCP protocol
-   Exposes tools:
    -   ingest_project
    -   semantic_search
    -   remember_note
    -   project_summary
-   Uses shared core package
-   Communicates via stdio

Compatible with:

-   GitHub Copilot (MCP mode)
-   RooCode
-   Any MCP-compatible agent

------------------------------------------------------------------------

# 🧩 VS Code Extension

Name: Dev Memory --- AI Code Recall

Responsibilities:

-   Starts MCP server as child process
-   Registers MCP server automatically
-   Provides commands:
    -   Index Project
    -   Search Project Memory
-   Handles lifecycle + UX

------------------------------------------------------------------------

# 🧱 Production-Grade Folder Structure

dev-memory-ai-code-recall/ │ ├── packages/ │ ├── core/ │ │ ├──
package.json │ │ ├── tsconfig.json │ │ └── src/ │ │ ├── ingest.ts │ │
├── embed.ts │ │ ├── vector-store.ts │ │ └── search.ts │ │ │ ├──
mcp-server/ │ │ ├── package.json │ │ ├── tsconfig.json │ │ └── src/ │ │
├── index.ts │ │ ├── server.ts │ │ └── tools/ │ │ ├── ingest.ts │ │ ├──
search.ts │ │ └── summary.ts │ │ │ └── vscode-extension/ │ ├──
package.json │ ├── tsconfig.json │ ├── src/ │ │ ├── extension.ts │ │ └──
mcpLauncher.ts │ └── assets/

------------------------------------------------------------------------

# 📦 Root package.json

``` json
{
  "name": "dev-memory-ai-code-recall",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

------------------------------------------------------------------------

# 📦 @devmemory/core package.json

``` json
{
  "name": "@devmemory/core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w"
  },
  "dependencies": {
    "@xenova/transformers": "^2.0.0",
    "lancedb": "^0.4.0",
    "glob": "^10.0.0"
  }
}
```

------------------------------------------------------------------------

# 📦 @devmemory/mcp package.json

``` json
{
  "name": "@devmemory/mcp",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@devmemory/core": "*"
  }
}
```

------------------------------------------------------------------------

# 📦 VS Code Extension package.json

``` json
{
  "name": "devmemory-ai-code-recall",
  "displayName": "Dev Memory — AI Code Recall",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./dist/extension.js",
  "scripts": {
    "build": "tsc",
    "package": "vsce package"
  },
  "dependencies": {
    "vscode": "^1.1.37"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "typescript": "^5.0.0"
  }
}
```

------------------------------------------------------------------------

# 💾 Storage

Persistent local storage:

/storage/lancedb/

No external services required.

------------------------------------------------------------------------

# 🔐 Privacy

-   100% local
-   No telemetry
-   No API keys
-   No cloud calls

------------------------------------------------------------------------

MIT License
