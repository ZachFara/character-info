# Design

## What it is

Character Info is an Obsidian plugin that shows anything made of parts as a clickable figure. You pick a profile, such as your own body, a tabletop character or a car, click a region, and see its state, a note, what you are doing about it, what to do next, and a dated history of state changes. The model is the health tab of Project Zomboid's character window, generalized. All data lives in plain Markdown notes, so Bases, Dataview and sync keep working, and nothing is locked in a database.

## Users and goals

- A person tracking their own body and maintenance, who wants one screen that shows what needs attention.
- A tabletop player tracking wounds per limb for one or several characters.
- Anyone tracking a vehicle, house or system by parts, using the blank profile.

## Concepts

- **Profile.** A named set of a map, regions, states and a data note path. Stored in the plugin's `data.json`. Several can exist. One is the default.
- **Map.** A built-in SVG figure: `body`, `humanoid`, or `none`. A map is a set of shapes keyed by region id.
- **Region.** One part. Its id picks the map shape that draws it. A region with no shape shows only as a chip.
- **Neutral default.** A region in the profile's default state is drawn in the neutral body colour, so colour on the figure always means something needs attention. Its chip still shows the state colour. The selected region gets an outline in the text colour.
- **State.** A labelled, coloured level with a pip count and a flag for whether it counts as a problem. A state set is chosen from a template and then editable.
- **Data note.** One Markdown note per profile. Its frontmatter holds each region's status, note, doing, fix, links, and history.

## Entry points

Everything the plugin adds is reached through one of these.

1. A `character-info` code block. `profile: Name` picks the profile. Without it the note's `character-info-profile` frontmatter is used, then the default profile.
2. The settings tab: default profile, add a profile from a template, edit name, data note path, map, states and regions, duplicate, delete.
3. Command "Insert block", which writes a code block for the default profile.
4. Command "Open the default profile data note".

## Data format

```yaml
---
character-info-profile: Me
regions:
  hips:
    status: hurt
    note: Sore after a long run.
    doing: []
    fix: [Stop single-leg work]
    links: ["[[Some note]]"]
    history:
      - { date: 2026-11-06, from: unknown, to: hurt }
---
```

A status change appends to `history`. Empty fields are removed. Unknown status ids display as the default state with a warning instead of failing.

## Modules and boundaries

`types`, `data`, `presets`, `render`, `settings`, `main`, as drawn in `AGENTS.md`. The pure modules never import Obsidian. The UI modules never import each other. `main` supplies callbacks. These rules are enforced by dependency-cruiser in `make check`.

## Trust

Frontmatter, `data.json`, and note text are untrusted. They are read through validating functions, rendered as text or through Obsidian's Markdown renderer, and never executed or treated as instructions.

## Planned features

None of these exist yet. Each becomes a task in `PROGRESS.md`.

- **Review badges.** A region not touched for N days shows a badge, so stale regions are visible.
- **Party view.** Several profiles side by side, each showing its worst region.
- **Hit location and damage on click.** A roll button using a per-profile table, and a damage action that steps a state.
- **Inventory.** An optional feature, off by default and switched on in settings. When on, a profile can hold items shown beside the figure. The design questions are in PROGRESS.md.
- **Custom SVG maps.** Import an SVG and click shapes to assign them to regions.

## Non-goals

- Dice mechanics and rules for specific game systems.
- Accounts, servers or any network access.
- 3D models.
- Medical advice. Health use is a personal log, not a diagnosis tool.
