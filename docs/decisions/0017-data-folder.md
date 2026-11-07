# 0017. Data notes live in a folder the owner picks, and follow moves

## Context

Every profile kept its data in `Character Info/<Profile>.md` at the vault root, with no way to change it. Vaults with their own folder layout, like the owner's, want plugin data out of the way, for instance in a hidden or excluded folder, so the data notes do not show up in searches, bases and audits. A data note moved by hand was also lost: the next save created a new empty note at the old path.

## Decision

- Settings hold a **data folder**, default `Character Info`, empty for the vault root. New profiles get their data note there.
- Changing it in settings and pressing **Move** moves the data notes that were in the old folder, through Obsidian's file manager so links follow. A note already at the target path stays where it is and is reported. Notes kept elsewhere stay.
- A data note, or a folder of them, renamed or moved by hand is followed: the plugin listens for renames and updates the profile's path.
- A block that redefines a profile keeps the profile's data note path, as it already kept its id.
- The folder is cleaned like a vault path: forward slashes, no empty, `.` or `..` parts.
- The file handling for data notes moved from `main.ts` to `data-notes.ts`, which keeps `main.ts` under the file size limit.

## Consequences

- No per-block `data:` line. One folder per vault is enough so far, and a single note can still go anywhere by moving it.
- The path follows renames made inside Obsidian. A note moved outside Obsidian while it is closed is not followed, and the profile starts a new empty note at the old path. Move it back, or move it again inside Obsidian.
