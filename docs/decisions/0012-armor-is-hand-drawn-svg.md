# 0012. Armor is hand-drawn SVG in figure coordinates

## Context

The owner wanted armor to show on the figure, with a body view and an armor view, and two sets to start: modern military and a dark fantasy set in the Gravethorn style. The body and humanoid maps share one coordinate system and nearly the same silhouette.

## Decision

Each armor piece is SVG markup written directly in the figure's coordinates (`src/armor-art.ts`): helm, chest, pauldrons, gauntlets, greaves and boots. Left pieces are the right-side drawing mirrored across x = 120. An inventory item can carry a `look` such as `gravethorn:helm`, which kit pieces set. The Armor view draws every armor item that has a look, in paint order, over a body whose regions are drawn neutral. The armor layer ignores the pointer so regions stay clickable. A Body / Armor switch appears only when at least one look is drawable and the inventory is on.

The figure itself follows the owner's original body note: a wide stroke pads the silhouette into one soft body, parts sit on it as thin outlines with a faint fill, and the selected part glows in its own colour.

## Consequences

- One drawing fits both maps. A custom SVG map would need its own art or fall back to no armor view.
- Armor a person types in by hand has no look, so it is listed but not drawn. Adding looks to the add row is possible later.
- Removing an item removes its drawing. There is no separate equipped flag.
- Ember glows use a CSS drop-shadow on the art, which Obsidian's Chromium renders.
