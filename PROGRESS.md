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
- [ ] **T10. Create a profile from a note.** Entry point: a `character-info` block. Done when a block naming an unknown profile with `template: character` (or `body`, `blank`) creates it on render, a block without `template:` shows one-click buttons to create it from each template, and nothing is created by a typo alone. Creation puts the profile in settings and the data note is made on the first save. Tests cover found, created and prompted, and that rendering twice creates one profile.
- [ ] **T4. Party view and profiles overview.** Entry point: a block with `profiles: A, B` or `profiles: all`. Done when each profile shows a compact figure with its worst region, a tile opens that profile's full view and goes back, and `all` follows new profiles with no edit. The first created profile also creates `Character Info/Profiles.md` holding an `all` block, and a command opens it.
- [ ] **T11a. One-click state change.** Entry point: the card. Done when a row of state buttons on the card changes the state and writes history without entering Edit.
- [ ] **T11b. Quick add and remove.** Entry point: the card. Done when one add row (Doing, To fix, or Link) adds an item on Enter, link mode suggests notes and stores a wikilink, and each item can be removed.
- [ ] **T11c. Add a region from the card.** Entry point: the roster. Done when a plus chip adds a region by name without opening settings.
- [ ] **T3. Review badges.** Entry point: the card. Done when a region in a non-default state that has not been touched for the profile's number of days shows a badge and a Mark reviewed button, and the boundary day is tested.
- [ ] **T5. Hit roll and damage.** Entry point: the figure. Done when a roll button picks a region by weight and selects it, Worsen and Heal buttons step the state, and both are tested with a seeded roll.
- [ ] **T6a. Inventory switch.** Entry point: a settings toggle, off by default. Done when it shows or hides an inventory section and nothing else changes.
- [ ] **T6b. Inventory items.** Done when items (name, quantity) can be added, changed and removed, with note links, stored in the data note.
- [ ] **T6c. Inventory on regions.** Done when an item can be tied to a region and shows on that region's card.
- [ ] **T7. Custom SVG maps.** Entry point: settings. Done when a vault SVG can be chosen, shapes with an id become regions, the SVG is sanitized, and a block can use it.
- [ ] **T9. Real-Obsidian check script.** Done when a committed script starts an isolated Obsidian with the test vault and returns screenshots and results, and a decision record covers it.
- [ ] **T8. Release prep.** Done when a tag builds `main.js`, `manifest.json` and `styles.css` in CI, the README has screenshots, and the community plugin checklist is satisfied.
- [ ] **T13. List indent in the card.** Done when lists align with the section label in Obsidian.

## Decisions made on the owner's go-ahead

Made to keep work moving. Each is cheap to change.

- **Profiles come from notes.** Settings stay available for editing, but a new profile never requires them.
- **Inventory** is a global switch in settings, off by default. Items live in the profile's data note as `inventory:` entries with a name, a quantity and an optional region.
- **Review badges** use a number of days per profile, default 30, 0 to turn off. Any save counts as a review.
- **Minimum Obsidian version** moves to 1.4.10 when the note suggester is added.

## Open Questions

1. **Branch protection.** GitHub does not allow it on a private repo without Pro. Make the repo public, or upgrade? Until then `main` is protected only by convention and the CI check.
2. **Admin enforcement.** Should protection apply to the owner too?
3. **Long histories.** History is stored in frontmatter. Should old entries move to a log section past some length?
4. **Computer use.** Another session still holds it. Ten idle sessions exist and one holds the lock. Close the right one if computer use is wanted.

## Next steps

1. Build T10, then T4.
2. Work down the list.
