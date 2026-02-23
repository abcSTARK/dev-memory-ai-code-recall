# Changelog

## Unreleased

- Added embedding runtime status surface (`xenova-wasm` vs fallback) in welcome page.
- Added MCP tool `get_embedding_status` and warmup path.
- Removed legacy MCP tool aliases in favor of canonical names only.
- Added command `Dev Memory: Open Welcome Page`.
- Improved welcome page styling for VS Code theme visibility.
- Switched packaging to include runtime dependencies under `dist/runtime/node_modules` for single-VSIX Xenova WASM usage.
- Added runtime stubs used by packaging flow for text-only embedding path (`sharp`, `onnxruntime-node` shim).

## 1.0.1

- Updated Marketplace README copy to remove placeholder-style text.
- Switched README image links to stable GitHub raw URLs for reliable Marketplace rendering.

## 1.0.2

- Switched Marketplace README media to bundled `media/` assets for reliable in-product and Marketplace rendering.

## 1.0.3

- Updated publisher metadata and release prep for Marketplace publish workflow.
- Finalized bundled README media rendering approach (`media/`) for consistent GitHub and Marketplace display.

## 1.0.0

- Initial release:
  - Local-first AI code recall extension for VS Code
  - Index/Search commands
  - MCP server integration
