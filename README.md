# Character Info

A clickable character screen for anything made of parts. Click a region on the figure and see its state, notes, what you are doing about it and what to do next. Think of the health tab in Project Zomboid's character window, but for your own body, a tabletop character, a car or a house.

Everything is stored in plain notes, so Bases, Dataview and sync all work.

> **Status: 0.1, early.** The logic and rendering are covered by tests that run outside Obsidian. It has not yet been used inside a real vault, so expect rough edges.

## Use it

1. Install the plugin and enable it. A profile named "Me" (the human body) exists from the start.
2. Put this in any note:

````
```character-info
profile: Me
```
````

3. Click a region, press **Edit**, pick a state, write a note, save. The first save creates the profile's data note.

If you leave out `profile:`, the block uses the note's `character-info-profile` frontmatter, then the default profile.

## Profiles

Each profile has its own map, regions, states and data note. Add them under **Settings, Character Info**.

| Start from | Map | States |
|---|---|---|
| My body | 23 regions, 16 drawn | Dialed in, Maintaining, Needs work, Injured, Untracked |
| Tabletop character | head, torso, two arms, two legs | Healthy, Bruised, Wounded, Maimed, Lost |
| Blank list | none, chips only | Working, Worn, Failing, Broken, Unchecked |

Everything is editable afterwards: rename regions, add your own, change state names, colours and pips, and mark which states count as a problem. A region with no shape on the map shows as a chip under the figure.

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
npm install
npm test          # logic and render tests under jsdom
npm run build     # writes main.js
./deploy.sh /path/to/vault
```

MIT licensed.
