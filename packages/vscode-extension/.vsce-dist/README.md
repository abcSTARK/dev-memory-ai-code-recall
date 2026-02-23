# Dev Memory — AI Code Recall

Local-first semantic memory for your codebase and coding agents.

Dev Memory helps developers and AI agents recall implementation details across a repository without sending source code to external services.

## What It Offers

- Local semantic indexing of your workspace
- Natural-language code search across files and chunks
- MCP server integration for Copilot and other MCP-compatible agents
- Built-in VS Code welcome UI for indexing and search
- Embedding runtime visibility in the UI (`xenova-wasm` vs fallback)
- Single-VSIX packaging with bundled WASM runtime dependencies

## Why It Is Helpful

- Faster code navigation for large repositories
- Better AI answers grounded in your actual codebase
- Lower context-switching cost when onboarding or switching modules
- Works offline and avoids API key setup
- Keeps sensitive code local by default

## Why It Can Be Lucrative

- Teams pay for productivity gains from faster delivery and reduced debugging time
- Local/private-by-default positioning is attractive for enterprise and regulated environments
- MCP compatibility enables integration into modern AI coding workflows
- Foundation for paid tiers: team memory sync, policy controls, analytics, enterprise support

## Key Commands

- `Dev Memory: Open Welcome Page`
- `Dev Memory: Index Project`
- `Dev Memory: Search Project Memory`

## MCP Tools

- `index_codebase`
- `search_codebase`
- `summarize_codebase`
- `save_project_note`
- `get_embedding_status`
- `answer_from_codebase`

## Copilot + MCP Usage

If GitHub Copilot Chat has MCP enabled, select `#devmemory-local` and ask questions in plain language.

Example prompts:

- `Search this codebase for where welcome page command is registered.`
- `Search this codebase for how indexing works.`
- `Summarize this repository architecture.`
- `Answer from codebase: where is search_codebase implemented?`

## Tech Stack

- TypeScript (monorepo packages)
- VS Code Extension API
- Model Context Protocol (MCP SDK)
- `@xenova/transformers` (WASM embeddings)
- `onnxruntime-web` runtime path
- JSON-based local vector index (`.dev-memory/index.json`)

## Branding and Screenshots

Logo:

- `assets/logo/dev-memory-logo.svg`
- `assets/logo/dev-memory-brain-techy.svg`
- `assets/logo/dev-memory-brain-techy-128.png`

![Dev Memory Logo](assets/logo/dev-memory-brain-techy-128.png)

Screenshots folder:

- `assets/screenshots/`

Suggested marketplace screenshots:

- `welcome-page.png`
- `indexing.png`
- `search-results.png`
- `copilot-mcp.png`

## Screenshots

Current images are placeholders. Replace with real extension captures before marketplace submission.

![Welcome Page](assets/screenshots/welcome-page.png)
![Indexing](assets/screenshots/indexing.png)
![Search Results](assets/screenshots/search-results.png)
![Copilot MCP](assets/screenshots/copilot-mcp.png)

## Packaging Model

Runtime dependencies are bundled under:

- `dist/runtime/node_modules/...`

This enables one portable VSIX without per-machine native module builds.

## Notes

- Indexing is currently explicit/manual.
- Re-index after a VS Code reload before searching.

## Privacy

- 100% local processing
- No cloud dependency for core workflow
- No API keys required

## License

MIT
