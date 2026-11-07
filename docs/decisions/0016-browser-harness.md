# 0016. A browser harness runs the whole plugin in Chrome

## Context

The jsdom tests (decision 0004) cover the renderer, but not the plugin class, the settings tab, the commands, the modals or real layout. Real Obsidian covers everything, but it needs an isolated instance and is slow to drive. Agents and the owner want to click through the plugin quickly, in both themes and at phone width, without touching a real vault.

## Decision

`npm run harness` serves a page at `http://127.0.0.1:8765/` that runs the real `src/main.ts` in Chrome. esbuild bundles `test/browser-app.ts` with `obsidian` aliased to `test/browser-obsidian.ts`, a browser implementation of the API the plugin uses: `Plugin`, `Component`, `Setting`, `Modal`, `Notice`, `AbstractInputSuggest`, `MarkdownRenderer` and an in-memory vault with a frontmatter cache, `processFrontMatter` and `vault.process`. The class names match Obsidian's, and Obsidian's default theme variables are set, so `styles.css` applies as it does there.

The page has a note list, a reading view that runs code block processors with real section line numbers, a source view, the commands, the settings tab, a `data.json` viewer, a light and dark theme, and a phone-width frame. The vault and `data.json` persist in `localStorage`. `window.harness` exposes the same controls for browser automation. Seed notes live in `test/browser-notes.ts` and are all made up. YAML goes through the `yaml` package, a dev dependency.

## Consequences

- The fake is not Obsidian. Its Markdown renderer is small and it redraws the whole note when the note changes. A result found here still needs a check in real Obsidian before a task is marked done.
- A new Obsidian API in `src/` means extending `test/browser-obsidian.ts` as well as the jsdom stub.
- Nothing in `src/` imports the harness, and the harness ships nowhere.
