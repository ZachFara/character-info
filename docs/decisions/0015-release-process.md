# 0015. Releases are drafted from a tag, and README pictures come from real Obsidian

## Context

Obsidian installs a plugin from a GitHub release's `main.js`, `manifest.json` and `styles.css`, with the tag equal to the manifest version. The README should show what the plugin looks like. The repo is private for now.

## Decision

- A `release` workflow runs on any tag. It installs, runs `make check`, fails if the tag does not equal the manifest version, and creates a **draft** release with the three files. A person publishes the draft.
- Versions are bumped with `npm version`, which also updates `versions.json`, and merged through a PR like any change.
- README pictures live in `docs/images/` and are made by `make readme-images`, which runs the real-Obsidian check (decision 0014) with sample people and saves a cropped picture of the plugin for the body, the armor view and a party. The layout check allows PNG files there.
- The submission checklist lives in AGENTS.md.

## Consequences

- Nothing is published by pushing to `main`. Publishing takes a tag and a click.
- Pictures are reproducible and show real Obsidian, not a mock-up.
- Submitting to the community list needs a public repo first.
