# 0011. Starter kits use generic or original names

## Context

The owner wanted starter kits for the inventory: a modern soldier, a knight, and a dark fantasy armor set that people would recognise and enjoy, in the spirit of well-known black demonic plate, without copying it.

## Decision

Every kit name, item name and description is generic or original. A kit may evoke a genre, which is not protectable: black steel, swept horns, jagged edges, an ember glow in the seams. It may not use another work's protected names or reproduce its specific designs. The dark set is therefore "Gravethorn", with its own item names such as Thornfang dagger and Thorned pauldrons. The modern soldier kit uses generic terms and no brands or product names. The owner asked for two sets to start, so a plain medieval knight kit was removed.

A test checks the kit text against a list of protected terms, including the names of the work the dark set echoes, and several brand and weapon model names. The list is a guard against slips, not legal advice, and nothing here has been legally reviewed.

## Consequences

- Adding a kit or an item means choosing an original name and checking the guard list.
- Kits live in code for now. Letting people define their own kits in a note is possible later.
- A piece is skipped when an item with the same name is already in the inventory. Names must therefore differ between kits, which the tests enforce.
