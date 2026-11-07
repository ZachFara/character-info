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
- [x] **T11c. Add a region from the card.** Done: a dashed plus chip adds a region by writing it into the block's `add:` line, and a block that only referred to a profile gains `template:` first. Hidden where the block cannot be edited. Checked in real Obsidian. The render tests were split into shared helpers, core tests and inventory tests to stay under the file size limit.
- [x] **T3. Review badges.** Done: a region in a non-default state that has gone untouched for the profile's days (default 30, `review:` in the block, 0 for off) shows Review due with how long, a Mark reviewed button, a ring on its chip and a count in the header. Any save counts as a review. Checked in real Obsidian.
- [x] **T5. Dropped.** The owner does not want hit rolls or Worsen and Heal buttons. Do not build dice or damage mechanics.
- [x] **T6a and T6b. Inventory switch and items.** Done: a settings toggle, off by default, shows an inventory panel with items grouped as weapons, armor and gear. Items have a name, quantity, note and optional region, with plus, minus and remove, and are stored in the data note. Checked in real Obsidian.
- [x] **T6c. Worn and held.** Done: an item tied to a region shows on that region's card under Worn and held when the inventory is on. Checked in real Obsidian.
- [x] **T6d. Starter kits.** Done: a kit row adds a modern soldier loadout, a medieval knight, or the original Gravethorn dark fantasy warplate, placed on the regions the profile has and never duplicating a piece. The naming rule is decision 0011. Checked in real Obsidian.
- [x] **T6e. Armor on the figure.** Done: kit armor carries a look, drawn as hand-made SVG over a neutral body in an Armor view. A Body / Armor switch appears only when drawable armor is worn. Two sets: modern military and Gravethorn. The figure now uses the padded, outlined style of the owner's original body note. Checked in real Obsidian. See decision 0012.
- [x] **T14. Edit inventory items.** Done: a pencil on each item opens an inline form for name, note, kind, region and, for armor, the drawing shown on the figure. Checked in real Obsidian.
- [x] **T7. Custom SVG maps.** Done as text: `map: Maps/kael.svg` (any SVG) in the block. Shapes with an id become regions, named from data-name, a title or the id. The file is sanitized to plain shapes and geometry, reloads when it changes, and gives a profile with no regions one per shape. Checked in real Obsidian. See decision 0013.
- [x] **T9. Real-Obsidian check script.** Done: `make obsidian-check` builds the plugin, starts a throwaway Obsidian with its own profile and vault, checks the body, a character, the armor view and a party, saves screenshots to `.scratch/obsidian-check/`, and exits non-zero on failure. See decision 0014.
- [x] **T8. Release prep.** Done up to publishing: version 0.2.0, a people-first manifest description, a `release` workflow that makes a draft release from a tag after `make check`, README pictures from `make readme-images`, and a submission checklist in AGENTS.md. Not published: that needs a public repo and a tag, both the owner's call. Mobile is untested. See decision 0015.
- [x] **T13. List indent in the card.** Done: card lists use a small dot aligned with the section title.
- [x] **T15. Browser harness.** Done: `npm run harness` runs the whole plugin in Chrome over an in-memory vault, with settings, commands, both themes and a phone-width frame. See decision 0016. Faster than `make obsidian-check` for clicking around; results still need a real Obsidian check.

### Found with the browser harness

Not yet checked in real Obsidian. Each is a candidate task.

- [ ] **Profiles register only once their note renders.** A `character-party` block with `all`, and the settings list, miss profiles whose notes have not been opened, even when their data notes exist. Scan the vault for blocks on load.
- [ ] **The create buttons do not write the template into the block.** A profile made from the "no profile called X" prompt lives only in `data.json`, against decision 0009. Write `template:` into the block, as adding a region does.
- [ ] **The remove cross is hover only.** Hard to reach on touch screens. Show it when the device cannot hover.
- [ ] **Items go on lost regions.** Kits put pieces on a region in the Lost state, and the card lists them under Worn and held without a warning.
- [ ] **Small fixes.** The party header says "1 members". DESIGN.md lists an "Insert block" command that does not exist. "Select a region" stays under the figure after a region is selected.
- [ ] **Card flow.** Select a region right after adding it. Keep the quick add's list choice after an add. Add a picked note suggestion on the first Enter.
- [ ] **Inventory per profile.** The switch is global, so a car or a health profile gets an inventory and the soldier kit. Consider an `inventory:` line in the block and kits that match the template.
- [ ] **Armor view hides states.** Tint or outline armored parts by state.
- [ ] **Phone layout.** The figure fills the first screen, so the card is below the fold after a tap.
- [ ] **Party.** Sort tiles by attention, and link each tile to its note.
- [ ] **Unknown template.** Offer the template buttons that the unknown-profile prompt has.

## Decisions made on the owner's go-ahead

Made to keep work moving. Each is cheap to change.

- **Profiles are text in the block.** The block text defines a profile and settings only list them. See decision 0009. The older settings editor is retired in T10c.
- **Inventory** is a global switch in settings, off by default. Items live in the profile's data note as `inventory:` entries with a name, a quantity and an optional region.
- **Review badges** use a number of days per profile, default 30, 0 to turn off. Any save counts as a review.
- **People first.** The built-in figures, templates and the top of the README are about people: the owner's body and tabletop characters. Other figures, such as a ship, appear only as examples of custom SVG maps, low in the README, and nothing like that is installed with the plugin.
- **State names stay humane.** People use this for their own health, so state labels avoid words like "maimed". The wounds set runs Healthy, Bruised, Wounded, Severe, Lost.
- **Minimum Obsidian version** is 1.5.1, the version that added the modal title the new-profile dialog uses.

## Open Questions

1. **Branch protection.** On hold by the owner's choice ("fine for now"). The repo stays private and `main` is protected only by convention and the CI check.
2. **Admin enforcement.** Should protection apply to the owner too?
3. **Long histories.** History is stored in frontmatter. Should old entries move to a log section past some length?
4. **Computer use.** Another session still holds it. Ten idle sessions exist and one holds the lock. Close the right one if computer use is wanted.

## Next steps

Every planned task is done. What is left needs the owner:

1. **Publish or not.** Make the repo public and push a `0.2.0` tag to draft the first release, then submit to the community list (checklist in AGENTS.md).
2. **Try it on a phone.** `isDesktopOnly` is false and mobile is untested.
3. **Move the owner's Bodily Maintenance note to the plugin.** Its data maps onto the body template's region ids, but changing the vault needs the owner's go-ahead.
4. **Known small follow-ups.** The link suggester also offers the plugin's own data notes, and a party lists only profiles whose block has rendered once.
