# Progress

## Status

Merged to main: the repo setup (PR 1) and the first visual pass (PR 2). The 0.1 plugin works in real Obsidian 1.15. It was run in an isolated Obsidian instance with its own profile, a throwaway vault and a debugging port, because computer use was held by another session.

T1 results from that real run:

- Works: block render, region select, edit and save, history, wikilinks rendered as real links, redraw on data change, the settings tab, creating profiles from settings, a map-less list, the tabletop figure.
- Bug: a block that names a profile that does not exist silently shows the default profile. Superseded by T10, which makes creating a profile from a note the normal path.
- Nit: bullet lists inside the card are indented too far (T13).

A throwaway vault with sample data is at `~/Ark/Development/active/character-info-testvault`.

## Tasks

Small tasks, one session each, in dependency order. Each starts at a user-facing entry point.

- [x] **T1. Try it in a real vault.** Done, results above.
- [x] **T10a and T10b. Profile text, defined and registered by blocks.** Done: the parser and resolver, blocks that define and register profiles, references by name, and one-click create buttons for unknown names. Checked in real Obsidian.
- [x] **T10c. Retire the settings profile editor.** Done: settings hold a default profile and a read-only list with Open data note and Forget. The old editor code is deleted.
- [x] **T10d. New profile commands.** Done: "New profile" and "New profile, full template" ask for a name and template and insert a block. A fresh block of either kind resolves to exactly its template, and the registry picks the profile up when the block renders. Checked in real Obsidian.
- [x] **T4. Party view.** Done as its own block, `character-party`, with a title, names or `all`, tiles with a mini figure, the worst region and problem counts, and click to open a profile in full with a way back. A command inserts a party block. Checked in real Obsidian.
- [x] **T11a. One-click state change.** Done: a row of state buttons on the card changes the state and writes history without opening Edit. Checked in real Obsidian.
- [x] **T11b. Quick add and remove.** Done: one row on the card adds a Doing item, a To fix item or a linked note on Enter, link mode suggests notes and stores a wikilink, and each item has a cross to remove it. Checked in real Obsidian. Follow-up: the suggester also offers the plugin's own data notes, which share a name with the character notes.
- [ ] **T11c. Add a region from the card.** Entry point: the roster. Done when a plus chip adds a region by name without opening settings.
- [ ] **T3. Review badges.** Entry point: the card. Done when a region in a non-default state that has not been touched for the profile's number of days shows a badge and a Mark reviewed button, and the boundary day is tested.
- [ ] **T5. Hit roll and damage.** Entry point: the figure. Done when a roll button picks a region by weight and selects it, Worsen and Heal buttons step the state, and both are tested with a seeded roll.
- [x] **T6a and T6b. Inventory switch and items.** Done: a settings toggle, off by default, shows an inventory panel with items grouped as weapons, armor and gear. Items have a name, quantity, note and optional region, with plus, minus and remove, and are stored in the data note. Checked in real Obsidian.
- [x] **T6c. Worn and held.** Done: an item tied to a region shows on that region's card under Worn and held when the inventory is on. Checked in real Obsidian.
- [x] **T6d. Starter kits.** Done: a kit row adds a modern soldier loadout, a medieval knight, or the original Gravethorn dark fantasy warplate, placed on the regions the profile has and never duplicating a piece. The naming rule is decision 0011. Checked in real Obsidian.
- [ ] **T7. Custom SVG maps.** Entry point: settings. Done when a vault SVG can be chosen, shapes with an id become regions, the SVG is sanitized, and a block can use it.
- [ ] **T9. Real-Obsidian check script.** Done when a committed script starts an isolated Obsidian with the test vault and returns screenshots and results, and a decision record covers it.
- [ ] **T8. Release prep.** Done when a tag builds `main.js`, `manifest.json` and `styles.css` in CI, the README has screenshots, and the community plugin checklist is satisfied.
- [ ] **T13. List indent in the card.** Done when lists align with the section label in Obsidian.

## Decisions made on the owner's go-ahead

Made to keep work moving. Each is cheap to change.

- **Profiles are text in the block.** The block text defines a profile and settings only list them. See decision 0009. The older settings editor is retired in T10c.
- **Inventory** is a global switch in settings, off by default. Items live in the profile's data note as `inventory:` entries with a name, a quantity and an optional region.
- **Review badges** use a number of days per profile, default 30, 0 to turn off. Any save counts as a review.
- **Minimum Obsidian version** is 1.5.1, the version that added the modal title the new-profile dialog uses.

## Open Questions

1. **Branch protection.** GitHub does not allow it on a private repo without Pro. Make the repo public, or upgrade? Until then `main` is protected only by convention and the CI check.
2. **Admin enforcement.** Should protection apply to the owner too?
3. **Long histories.** History is stored in frontmatter. Should old entries move to a log section past some length?
4. **Computer use.** Another session still holds it. Ten idle sessions exist and one holds the lock. Close the right one if computer use is wanted.

## Next steps

1. Build T11a to T11c, then T3, T5, T7, T9, T8 and T13.
2. Work down the list.
