# 0002. esbuild for the bundle, no framework

## Context

Obsidian loads one `main.js` per plugin. The owner's other plugin already uses esbuild with a small config. The UI is a figure, a card and a settings tab, all built from Obsidian's own DOM helpers.

## Decision

Bundle `src/main.ts` to `main.js` with esbuild, marking `obsidian`, `electron`, CodeMirror and Node built-ins as external. No UI framework. `main.js` is gitignored and built by `npm run build`. `scripts/deploy.sh` copies a build into a vault.

## Consequences

- Builds take a fraction of a second and the output is small.
- esbuild does not type-check, so `tsc --noEmit` is a separate step in `make check`.
- The DOM is built imperatively. A framework would be justified only if the UI grows much larger.
