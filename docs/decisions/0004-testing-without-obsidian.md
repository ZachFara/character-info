# 0004. Tests run under Node with jsdom and a stub of Obsidian

## Context

Obsidian cannot run headless in CI. Most of the logic has no need for it. The renderer needs DOM helpers and `MarkdownRenderer`.

## Decision

Use Node's built-in test runner with native TypeScript support. Pure logic is tested directly. The renderer is bundled with esbuild, with `obsidian` aliased to `test/obsidian-stub.ts`, and run under jsdom. The stub adds Obsidian's DOM helpers and a `MarkdownRenderer` that writes plain text.

## Consequences

- No test framework dependency beyond jsdom.
- The stub only implements what the renderer calls. A new Obsidian API in the renderer means extending the stub.
- Settings, the plugin class, and real Markdown rendering are not covered. They need a manual run in a real vault, which is task T1.
