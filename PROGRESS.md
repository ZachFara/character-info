# Progress

## Status

Phase 1 (repo setup) is complete and awaiting approval. The 0.1 plugin code exists: profiles, maps, states, editing, history, settings, and tests. It has been converted to strict TypeScript and passes `make check`. It has not been run inside a real Obsidian vault.

Branch protection on GitHub is blocked until the repo is public or the account is on GitHub Pro. See Open Questions.

## Tasks

Small tasks, one session each, in dependency order. Each starts at a user-facing entry point.

- [ ] **T1. Try it in a real vault.** Deploy a build to a throwaway vault with `scripts/deploy.sh`. Done when each of these is checked and the results are written here: the block renders for the default profile; editing a region saves and survives a restart; a status change adds history; settings can add, duplicate and delete a profile; the layout works at phone width. Any bug found becomes a new task below.
- [ ] **T2. Import the owner's Bodily Maintenance data.** Entry point: a `character-info` block with `profile: Me`. Done when a profile note converted from the existing note renders the same regions and states as the current component. Needs the owner's go-ahead to touch the vault.
- [ ] **T3. Review badges.** Entry point: the card. Done when a region unchanged for N days shows a badge, N is a setting, and tests cover the boundary day. Depends on T1. Needs an answer to the stale-threshold question.
- [ ] **T4. Party view.** Entry point: a block with `profiles: A, B`. Done when each profile renders a compact figure showing its worst region, with tests for ordering and an unknown profile name.
- [ ] **T5. Hit location roll.** Entry point: a button on the figure. Done when a per-profile table picks a region, the result is selectable, and a test seeds the roll.
- [ ] **T6a. Inventory switch.** Entry point: a settings toggle, off by default. Done when turning it on shows an empty inventory section on the card, turning it off removes it, and nothing else changes.
- [ ] **T6b. Inventory items.** Entry point: the inventory section. Done when items can be added, edited and removed, stored in the data note, with tests for the stored shape. Depends on T6a and the inventory questions.
- [ ] **T6c. Inventory links to regions.** Done when an item can be tied to a region, such as armor on the torso, and shows on that region's card. Depends on T6b.
- [ ] **T7. Custom SVG maps.** Entry point: settings, import an SVG. Done when an imported SVG's shapes can be assigned to regions by clicking, saved with the profile, and used by a block. Needs a decision on SVG sanitizing.
- [ ] **T8. Release prep.** Done when a tagged release builds `main.js`, `manifest.json` and `styles.css` in CI, the README has screenshots, and the Obsidian community plugin submission checklist is satisfied.

## Open Questions

1. **Branch protection.** GitHub does not allow it on a private repo without Pro. Make the repo public, or upgrade? Until then `main` is protected only by convention and the CI check.
2. **Admin enforcement.** Should the protection rules apply to the repo owner too? The plan was to enforce them, so nothing can bypass the check.
3. **Inventory scope.** Is the on/off switch global or per profile? Are items stored in the same data note or a separate one? Should items have quantity, weight, an equipped flag, or links to regions?
4. **Disabled rule.** `obsidianmd/settings-tab/prefer-setting-definitions` is off for `src/settings.ts` because the declarative settings API cannot express nested editable lists. See decision 0005. Revisit when that API grows?
5. **Minimum Obsidian version.** The manifest says 1.4.0, chosen without testing. What is the lowest version to support?
6. **Long histories.** History is stored in frontmatter. Should old entries move to a log section in the note body past some length?
7. **Stale threshold.** One global number of days, or per state or per region?

## Next steps

1. The owner reviews and approves the Phase 1 pull request.
2. Resolve Open Question 1, which blocks branch protection.
3. Start T1.
