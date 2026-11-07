# 0005. One check command and its tools

## Context

Several agent sessions work on this repo and must not lose context or let quality drift. The gate has to be identical locally and in CI.

## Decision

`make check` is the only gate. It runs prettier (check), eslint with zero warnings, `tsc --noEmit`, knip, dependency-cruiser, `scripts/check-layout.mjs`, the tests, and a production build. The pre-commit hook and CI both run exactly `make check`. Conventional commits are enforced by commitlint in a commit-msg hook and, in CI, over the pull request's commits. Hooks live in `.githooks/` and are enabled by `git config core.hooksPath`, set by `npm install` and `make setup`.

ESLint uses the strict type-checked and stylistic type-checked sets from typescript-eslint, the Obsidian plugin's recommended rules, and these limits: cyclomatic complexity 10, nesting depth 4, 5 parameters, 80 lines per function, 400 lines per file.

Two configuration choices are deliberate and recorded here:

- `@typescript-eslint/no-floating-promises` is told that `test`, `describe` and `it` from `node:test` are safe to leave unawaited. The runner tracks them.
- `obsidianmd/settings-tab/prefer-setting-definitions` is off for `src/settings.ts`. The declarative settings API cannot express nested editable lists of states and regions.

knip is told that `prettier` and `@commitlint/cli` are used, because they are called from the Makefile and the git hooks, which knip does not read.

## Consequences

- A change that breaks any rule cannot be committed or merged.
- Large functions must be split. The rendering and settings code is written as small methods for this reason.
- Adding a rule exclusion needs a new decision record and an answer under Open Questions.
