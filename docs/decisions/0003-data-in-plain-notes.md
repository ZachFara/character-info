# 0003. Region data lives in a note's frontmatter

## Context

The owner's vault is Markdown first, and uses Bases and Dataview over frontmatter. A database or a private JSON file would hide the data from those tools and from sync diffs. Profile definitions, by contrast, are configuration.

## Decision

Profile definitions (map, regions, states, data note path) live in the plugin's `data.json`. Region data lives in one note per profile, under a `regions:` key in frontmatter. Writes go through Obsidian's `processFrontMatter`. A status change appends a dated entry to the region's `history`.

## Consequences

- Region data is visible and queryable from the rest of the vault.
- Frontmatter edited by hand can be malformed, so every read goes through validating functions and unknown values degrade to defaults with a warning.
- Long histories will grow the frontmatter. This is an open question in PROGRESS.md.
- Nested YAML is not editable in Obsidian's Properties panel, so the editor in the card is the intended way to change it.
