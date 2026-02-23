# Dev Memory — AI Code Recall VS Code Extension

Local-first semantic memory for your workspace.

## Features

- Starts bundled MCP server automatically
- Registers workspace MCP config (`.vscode/mcp.json`)
- Commands:
  - `Dev Memory: Index Project`
  - `Dev Memory: Search Project Memory`
  - `Dev Memory: Open Welcome Page`
- Welcome webview for Index/Search
- Embedding provider visibility in UI (`xenova-wasm` or fallback)
- Output logs in `Dev Memory` output channel and `.vscode/devmemory.log`

## Embedding runtime

The extension ships Xenova/ONNX WASM runtime assets under:

- `dist/runtime/node_modules/...`

This is how the extension runs embeddings from a single VSIX without requiring user-side native builds.

## Usage

1. Run `Dev Memory: Open Welcome Page`.
2. Click **Index Project**.
3. Run a query from the webview or use `Dev Memory: Search Project Memory`.

## Copilot + MCP usage

If GitHub Copilot Chat has MCP enabled, select `#devmemory-local` and ask workspace questions in plain language.

Verified prompt style:

- `Search this codebase for where welcome page command is registered.`

Recommended prompts:

- `Search this codebase for how indexing works.`
- `Summarize this repository architecture.`
- `Answer from codebase: where is semantic_search implemented?`

Preferred MCP tool names used by this server:

- `index_codebase`
- `search_codebase`
- `summarize_codebase`
- `save_project_note`
- `get_embedding_status`
- `answer_from_codebase`

Legacy aliases are also supported:

- `ingest_project`, `semantic_search`, `project_summary`, `remember_note`, `embedding_status`

## Notes

- Indexing is explicit/manual today.
- Re-index after a VS Code reload before searching.

## Privacy

- 100% local
- No API keys
- No cloud calls required

## License

MIT
