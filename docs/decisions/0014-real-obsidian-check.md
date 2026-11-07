# 0014. A script checks the plugin in a real Obsidian

## Context

Unit tests run under jsdom with a stub of Obsidian (decision 0004). They cannot catch problems that only show in Obsidian itself: rendering, the settings window, code block re-renders, two copies of a block in editing and reading views. During development these were checked by hand through an isolated Obsidian with a debugging port.

## Decision

`scripts/obsidian-check.mjs`, run with `make obsidian-check`, does that by hand-work automatically. It builds the plugin, creates a temp vault with sample notes and a temp Obsidian profile that opens only that vault, starts a separate Obsidian with a debugging port, enables the plugin in that throwaway profile, opens notes, reads facts from the visible block, takes a screenshot per check, prints ok or FAIL, and exits non-zero on a failure. It then closes that Obsidian and deletes the temp folders. Screenshots go to `.scratch/obsidian-check/`.

## Consequences

- The owner's Obsidian, vaults and settings are never touched.
- It needs Obsidian installed, so it is not part of `make check` or CI. Run it before a release and after UI changes.
- Checks read the visible copy of a block, because Obsidian can keep a hidden copy for the other view mode.
- The script talks to Obsidian through Node's `http` and `WebSocket`. Node scripts may not use `fetch` under the Obsidian lint rules, which are written for plugin code.
