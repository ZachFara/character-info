# 0010. The party is its own block

## Context

Tabletop play needs several characters visible at once. The `character-info` block draws one profile in full. A party view could be an option on that block or a block of its own.

## Decision

A separate `character-party` block. Its text is an optional `title:` line, then profile names one per line or separated by commas, or `all`. A `profiles:` or `members:` prefix is accepted. Lines starting with # are comments.

Each member is a tile: a small figure, the worst region, and a count of each problem state. A tile opens that profile in full with a Back button, and edits there are saved to that profile. A name with no profile gets a dashed tile that says so. `all` follows the registry, so new profiles appear without editing the block. A command inserts an `all` block.

## Consequences

- The two blocks stay simple, and a party needs no profile definition of its own.
- The party view is a new UI module that composes the full view. The boundary rules let it import `render`, while `render`, `settings` and `new-profile` may not import it.
- Opening a profile and returning keeps no state between visits. Selection and edit state reset when the party redraws.
- The party block follows the registry, so a profile defined only in a block that has not been rendered yet appears after it renders.
