# 0006. Module boundaries and callbacks

## Context

The pure logic should stay testable without Obsidian. The two UI modules must not depend on the plugin class, or the import graph becomes circular.

## Decision

Seven modules with fixed import directions, listed in `AGENTS.md` and enforced by dependency-cruiser: `types` imports nothing, `data` imports `types`, `presets` imports `types` and `data`, `render` and `settings` import Obsidian plus the three low-level modules, and only `main` imports everything. `render` and `settings` receive what they need from `main` as plain callbacks and option objects, such as `ViewOptions` and `SettingsActions`, instead of importing the plugin.

## Consequences

- Circular imports and Obsidian imports in pure modules fail the check.
- Anything a UI module needs from the plugin has to be passed in, which keeps the plugin class easy to replace in tests.
- A new module needs a boundary rule and an update to this record.
