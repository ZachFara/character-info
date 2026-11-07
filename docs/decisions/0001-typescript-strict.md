# 0001. TypeScript in strict mode

## Context

The first version was plain JavaScript, matching the owner's other plugin. The repo rules require a strict type checker. This plugin reads untrusted frontmatter and saved settings, which is where type mistakes hide. Obsidian ships full type definitions and its own sample plugin uses TypeScript.

## Decision

All source and tests are TypeScript with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals` and `noUnusedParameters`. Imports use the `.ts` extension. Untrusted values are typed `unknown` and narrowed through functions in `data.ts`.

## Consequences

- A type error fails `make check`.
- Source and tests need `.ts` import extensions, and `data.ts` and `presets.ts` must stay erasable-syntax only because tests run them under Node's type stripping.
- The conversion from JavaScript changed no behavior, and the original tests carried over.
