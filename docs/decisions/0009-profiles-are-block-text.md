# 0009. A profile is plain text in its block

## Context

Profiles were defined in the settings tab with rows of dropdowns, colour pickers and toggles. Making or changing one meant leaving the note. The owner asked that creating a profile be as simple as writing a section in a note, that editing be simple text in the snippet, and that something list all profiles automatically.

## Decision

The text of a `character-info` block defines the profile. Only `profile:` is required. The other keys are optional and read as plain text:

```
profile: Thorn
template: character
add: Tail, Wings
remove: Pelvic Floor
rename: Left arm = Sword arm; Head = Skull
states: Healthy, Bruised, Wounded, Severe, Lost
default: Healthy
map: humanoid
```

- `template` starts from `body`, `character` or `blank`. `add`, `remove` and `rename` change its regions. `states` replaces the state list, best first, and the first state is the default unless `default` names another. Colours and pips are assigned along the list, and `Name=#hex` sets a colour.
- A block with any key beyond `profile` defines the profile and writes the result to a registry in the plugin settings. A block with only `profile` refers to the registry entry.
- A name that is not in the registry and has no definition shows buttons to create it from each template. A typo never creates a profile by itself.
- The registry feeds the profiles overview, so an overview needs no edits when a profile is added.
- Lines starting with `#` are comments and are ignored. Keys with no value are ignored.
- Two commands start a profile. The simple one inserts `profile` and `template` only. The full one inserts every key, filled in from the template, with comment lines, so everything that can be changed is already visible in the text.
- Region and state ids stay stable on rename, because data notes are keyed by id. Replacing `states` can leave stored statuses that no longer match. They show as the default state with a warning.

## Consequences

- Creating and editing a profile never needs the settings tab.
- The definition travels with the note. The registry is a cache that the last rendered definition wins.
- The settings profile editor is redundant and is removed, which is a deliberate deviation recorded in PROGRESS.md.
- The parser is pure logic with tests and a new module in the boundary rules.
