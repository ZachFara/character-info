# Character Info

A clickable character screen for anything made of parts. Click a region on the figure and see its state, notes, what you are doing about it and what to do next. Think of the health tab in Project Zomboid's character window, but for your own body, a tabletop character, a car or a house.

Everything is stored in plain notes, so Bases, Dataview and sync all work.

> **Status: 0.1, early.** The logic and rendering are covered by tests that run outside Obsidian. It has not yet been used inside a real vault, so expect rough edges.

## Use it

Put a block in any note. The text of the block is the profile, so there is nothing to set up first.

````
```character-info
profile: Thorn
template: character
```
````

Easiest start: open the command palette in a note and run **Character Info: New profile**. It asks for a name and a template and inserts the block. **New profile, full template** inserts every key, with the template's values and short comment lines, so everything you can change is already in the text.

Click a region and pick a state with one click. To add a task, a fix or a link without opening anything, use the small row at the bottom of the card: choose Doing, To fix or Link a note, type, and press Enter. Link mode suggests your notes as you type and stores a real `[[link]]`. Hover an item and press the cross to remove it. **Edit** is there for longer text. The dashed **+ Add region** chip adds a region by writing it into the block's `add:` line for you, so the text stays the source of truth.

Click a region, press **Edit**, pick a state, write a note, save. Your first save creates the profile's data note.

A block with only `profile: Thorn` shows a profile that is defined elsewhere. A name that does not exist yet shows buttons to create it from a template, so a typo never creates a profile on its own.

## Change a profile by editing its text

Every line after `profile:` is optional. Lines that start with `#` are comments.

````
```character-info
profile: Thorn
template: character                  # body, character or blank
add: Tail, Wings                     # extra regions
remove: Torso                        # hide regions
rename: Left arm = Sword arm         # separate several with ;
states: Healthy, Bruised, Wounded, Severe, Lost
default: Healthy                     # the first state unless you say otherwise
map: humanoid                        # body, humanoid or none
```
````

- **Regions** match by name or id, ignoring case. Add a name that matches a map shape, such as `neck`, and the shape comes back.
- **States** go best first. The first is the default, drawn neutral. Colours are chosen for you, and `Bruised=#e5c13b` sets one.
- **Stored data stays attached.** Region and state ids do not change when you rename, so your notes keep their meaning.
- The block you write is the source of truth. Delete a line and its effect goes away.

| Template | Map | States |
|---|---|---|
| body | 23 regions, 16 drawn | Dialed in, Maintaining, Needs work, Injured, Untracked |
| character | head, torso, two arms, two legs | Healthy, Bruised, Wounded, Severe, Lost |
| blank | none, chips only | Working, Worn, Failing, Broken, Unchecked |

## Party

Show several profiles side by side, which is handy for tabletop. Use a different block:

````
```character-party
title: The Company
Thorn
Mira
Kestrel
```
````

- One name per line, or separated by commas. `all` shows every profile and follows new ones as you create them. **New party** in the command palette inserts an `all` block.
- Each tile has a small figure, the worst region, and a count of each problem state.
- Click a tile to open that profile in full, edit it, and use **Back** to return.
- A name with no profile gets a dashed tile that says so.

## Inventory

Off by default. Turn it on under **Settings, Character Info, Inventory**. Each profile then shows an inventory under the figure.

- Items are weapons, armor or gear, with a quantity and an optional note.
- Pick where an item is worn or held, such as armor on the torso or a sword in the right arm, or leave it as carried.
- A note link in a name, like `[[Plate carrier]]`, is a real link. The plus and minus buttons change the quantity and the cross removes an item.
- Items are saved in the profile's data note under `inventory:`.
- **Starter kits** add a ready-made set in one click, placed on the regions your profile has. There are two: a modern soldier loadout, and Gravethorn warplate, an original dark fantasy set of black horned plate with spiked pauldrons and an ember glow in the seams. A kit never adds a piece you already have, so pressing it twice is safe.
- **Edit any item** with the pencil: change its name, note, kind, where it is worn or held, and for armor, which drawing shows it on the figure. That is how armor you typed in yourself gets drawn.
- **Armor view.** Kit armor is drawn on the figure. When a profile wears any, a **Body / Armor** switch appears above the figure. Body shows the states, Armor shows the gear. With no drawable armor there is no switch. Kit armor comes with drawings, and any armor can get one through Edit.
- Selecting a region lists the items worn or held there.

## Where the data lives

One note per profile, by default `Character Info/<Profile>.md`:

```yaml
---
character-info-profile: Me
regions:
  hips:
    status: hurt
    note: Sore after a long run.
    fix: [Stop single-leg work]
    history:
      - { date: 2026-11-06, from: unknown, to: hurt }
---
```

Changing a state appends to `history` automatically. Region ids and state ids in the file match the ids in settings.

## Roadmap

- A click-to-assign editor for custom SVG maps
- Party view: several profiles side by side
- Hit-location roll and damage-on-click for tabletop use
- Review badges for regions that have not been touched in a while
- Vehicle and house map presets

## Develop

```bash
make setup        # install and enable the git hooks
make check        # format, lint, types, dead code, boundaries, layout, tests, build
scripts/deploy.sh /path/to/vault
```

Agents and contributors should read `AGENTS.md` first. The design is in `DESIGN.md` and current work is in `PROGRESS.md`.

MIT licensed.
