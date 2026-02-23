# Dev Memory — LinkedIn Showcase Draft

## Option 1: Launch Post (Short)

Shipping update: **Dev Memory — AI Code Recall** is now running as a local-first VS Code extension + MCP server with RAG-style code recall.

What it does:
- Indexes your codebase locally
- Gives semantic recall for code questions
- Works with MCP-compatible agents (including Copilot MCP mode)
- Runs with **no API keys** and **no cloud dependency** for core workflow

Why this matters:
- Less time searching for implementation details
- Better AI answers grounded in your repo
- Private-by-default workflow for sensitive codebases

Tech stack:
- TypeScript monorepo
- VS Code Extension API
- MCP SDK
- Xenova Transformers (WASM embeddings)
- Local vector index (`.dev-memory/index.json`)

Example prompt that works well:
`Search this codebase for where welcome page command is registered.`

#BuildInPublic #VSCode #MCP #AIEngineering #DeveloperTools #TypeScript

---

## Option 2: Showcase Post (Detailed)

Over the last few days, I built and stabilized **Dev Memory — AI Code Recall**: a local-first RAG memory layer for AI coding workflows.

### Problem
AI copilots are great, but context retrieval inside real codebases is still weak, especially for private repos and long-running projects.

### What I built
- A local semantic indexing engine
- An MCP server that exposes codebase-memory tools
- A VS Code extension that handles install, lifecycle, and UX
- Single VSIX packaging that ships runtime dependencies for the WASM embedding path

### What’s working now
- Local embedding runtime with `xenova-wasm`
- Codebase indexing + semantic search
- Agent-facing MCP tools:
  - `index_codebase`
  - `search_codebase`
  - `summarize_codebase`
  - `save_project_note`
  - `get_embedding_status`
  - `answer_from_codebase`
- Welcome page in VS Code with indexing/search + embedding status visibility

### Why this is valuable
- Faster onboarding for new contributors
- Better implementation recall during refactors
- Lower context-switching overhead
- Privacy-friendly for enterprise teams

### Monetization potential
- Team memory sync and collaboration
- Enterprise policy/retention controls
- Hosted management + support for organizations that want local inference but centralized admin

If you’re building agentic coding workflows and care about local-first memory, happy to connect and compare notes.

#BuildInPublic #MCP #VSCodeExtension #AIAgents #DevTools #LocalFirst #TypeScript

---

## Option 3: One-Liner

Built a local-first RAG memory engine for coding agents: VS Code extension + MCP server + local semantic recall, no API keys/no cloud required for core retrieval.
