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

## Notes

- Indexing is explicit/manual today.
- Re-index after a VS Code reload before searching.

## Privacy

- 100% local
- No API keys
- No cloud calls required

## License

MIT
