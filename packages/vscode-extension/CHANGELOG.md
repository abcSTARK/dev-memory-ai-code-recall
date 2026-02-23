# Changelog

## Unreleased

- Added embedding runtime status surface (`xenova-wasm` vs fallback) in welcome page.
- Added MCP tool `embedding_status` and warmup path.
- Added command `Dev Memory: Open Welcome Page`.
- Improved welcome page styling for VS Code theme visibility.
- Switched packaging to include runtime dependencies under `dist/runtime/node_modules` for single-VSIX Xenova WASM usage.
- Added runtime stubs used by packaging flow for text-only embedding path (`sharp`, `onnxruntime-node` shim).

## 1.0.0

- Initial release:
  - Local-first AI code recall extension for VS Code
  - Index/Search commands
  - MCP server integration
