# Dev Memory — AI Code Recall VS Code Extension

A local-first AI memory engine for your codebase. Index and search your project memory with zero cloud, zero API keys.

## Features
 Index Project: Ingests your workspace files and builds a semantic memory
 Search Project Memory: Semantic search over indexed chunks
 All results shown in OutputChannel
 No cloud, no OpenAI, no Docker

## Usage
 Run `Dev Memory: Index Project` from the command palette
 Run `Dev Memory: Search Project Memory` and enter your query

## Privacy
 100% local
 No telemetry
 No API keys
 No cloud calls

 ## Progress & Known Issues (extension)

- Implemented: the extension launches the bundled MCP server, receives MCP logging notifications, and forwards detailed logs to the VS Code Output channel and a workspace log at `.vscode/devmemory.log`.
- Implemented: the extension's MCP client now supports top-level RPC (`tools/list`) and tool invocation (`tools/call`) and parses `semantic_search` results before sending them to the webview.

 Known / Remaining:
- You must re-run `Dev Memory: Index Project` after reloading the window to recreate the index; incremental persistence is a planned improvement.
- Confirm end-to-end webview rendering by installing the VSIX and exercising Index + Search (the VSIX is produced at `packages/vscode-extension/.vsce-dist/devmemory-ai-code-recall-1.0.0.vsix`).
- Error handling for malformed tool outputs or streaming responses can be improved; for now the extension attempts to parse text blocks in `result.content` and falls back to raw content on parse failure.

 If you'd like, I can add a small smoke test script or extension-host task to automate the Index → Search manual check.

## License
MIT

