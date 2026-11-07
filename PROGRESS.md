# Progress

## Status

Phase 1 (repo setup) is complete and awaiting approval in PR 1. The 0.1 plugin is built: profiles, maps, states, editing, history, settings, and tests. It passes `make check`.

A first visual pass is done. The renderer was checked in headless Chrome with Obsidian's default theme variables, dark and light, at desktop and phone width, for the body, a tabletop character and a no-map list. That found and fixed five problems: a no-map profile squeezed its card into the figure column, the Lost state was grey on grey, nothing marked the selected region on the figure, every region was coloured so problems did not stand out, and the labels were tiny uppercase. The plugin has still not run inside real Obsidian, because computer use was held by another session. A throwaway vault with sample data is ready at `~/Ark/Development/active/character-info-testvault` with the current build deployed.

Branch protection on GitHub is blocked until the repo is public or the account is on GitHub Pro. See Open Questions.

## Tasks

Small tasks, one session each, in dependency order. Each starts at a user-facing entry point.

- [ ] **T1. Try it in a real vault.** The throwaway vault and build are ready (see Status); what remains is opening it in Obsidian. Community plugins must be enabled in that vault first, which the owner may need to do. Done when each of these is checked and the results are written here: the block renders for the default profile; editing a region saves and survives a restart; a status change adds history; settings can add, duplicate and delete a profile; the layout works at phone width. Any bug found becomes a new task below.
- [ ] **T2. Import the owner's Bodily Maintenance data.** Entry point: a `character-info` block with `profile: Me`. Done when a profile note converted from the existing note renders the same regions and states as the current component. Needs the owner's go-ahead to touch the vault.
- [ ] **T3. Review badges.** Entry point: the card. Done when a region unchanged for N days shows a badge, N is a setting, and tests cover the boundary day. Depends on T1. Needs an answer to the stale-threshold question.
- [ ] **T4. Party view.** Entry point: a block with `profiles: A, B`. Done when each profile renders a compact figure showing its worst region, with tests for ordering and an unknown profile name.
- [ ] **T5. Hit location roll.** Entry point: a button on the figure. Done when a per-profile table picks a region, the result is selectable, and a test seeds the roll.
- [ ] **T6a. Inventory switch.** Entry point: a settings toggle, off by default. Done when turning it on shows an empty inventory section on the card, turning it off removes it, and nothing else changes.
- [ ] **T6b. Inventory items.** Entry point: the inventory section. Done when items can be added, edited and removed, stored in the data note, with tests for the stored shape. Depends on T6a and the inventory questions.
- [ ] **T6c. Inventory links to regions.** Done when an item can be tied to a region, such as armor on the torso, and shows on that region's card. Depends on T6b.
- [ ] **T7. Custom SVG maps.** Entry point: settings, import an SVG. Done when an imported SVG's shapes can be assigned to regions by clicking, saved with the profile, and used by a block. Needs a decision on SVG sanitizing.
- [ ] **T9. Committed visual harness.** The look was checked with a harness kept outside the repo because the layout allowlist and the .scratch rule keep it out. Done when a decision record picks where it lives, it builds the renderer with a stubbed Obsidian and takes dark, light and phone screenshots, and `make check` still passes. Needs a decision on the layout allowlist.
- [ ] **T8. Release prep.** Done when a tagged release builds `main.js`, `manifest.json` and `styles.css` in CI, the README has screenshots, and the Obsidian community plugin submission checklist is satisfied.

## Open Questions

1. **Branch protection.** GitHub does not allow it on a private repo without Pro. Make the repo public, or upgrade? Until then `main` is protected only by convention and the CI check.
2. **Admin enforcement.** Should the protection rules apply to the repo owner too? The plan was to enforce them, so nothing can bypass the check.
3. **Inventory scope.** Is the on/off switch global or per profile? Are items stored in the same data note or a separate one? Should items have quantity, weight, an equipped flag, or links to regions?
4. **Disabled rule.** `obsidianmd/settings-tab/prefer-setting-definitions` is off for `src/settings.ts` because the declarative settings API cannot express nested editable lists. See decision 0005. Revisit when that API grows?
5. **Minimum Obsidian version.** The manifest says 1.4.0, chosen without testing. What is the lowest version to support?
6. **Long histories.** History is stored in frontmatter. Should old entries move to a log section in the note body past some length?
7. **Obsidian access.** Computer use was held by another Claude session, so T1 could not be run. Can that session be closed, or should it be run by hand?
8. **Stale threshold.** One global number of days, or per state or per region?

## Next steps

1. The owner reviews and approves the Phase 1 pull request.
2. Resolve Open Question 1, which blocks branch protection.
3. Start T1.
