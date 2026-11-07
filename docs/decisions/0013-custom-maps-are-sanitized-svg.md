# 0013. Custom maps are SVG files, rebuilt from safe parts

## Context

The built-in maps cover a body and a humanoid. People want their own figures: a character with wings or a tail, a different build, a creature, or anything else they care to draw. The plan was a settings screen to import an SVG and assign shapes by clicking. Profiles have since become plain block text (decision 0009), so a settings screen would be out of place.

## Decision

A block names an SVG file in the vault: `map: Maps/kael.svg`. The file is found by path or like a link from the note. Every outermost shape or group with an id becomes a region shape, named from `data-name`, a `<title>`, or the id made readable. A profile whose block adds no regions takes one region per shape.

An SVG from a vault is untrusted. Nothing from it is inserted as is. `src/svg-map.ts` rebuilds new markup from a fixed list of shape elements and geometry attributes, with values limited to safe characters. Scripts, styles, colours, event handlers, links, images and foreign content are dropped, and a shape left with no geometry is skipped. The plugin caches each parsed file and reloads it when it changes.

## Consequences

- No click-to-assign editor. Ids are set in whatever program draws the SVG, which every editor supports.
- Custom maps have no armor view, because the armor art is drawn for the built-in figure.
- Colours and styling from the file are ignored. The figure always uses the plugin's look.
- `svg-map` uses the DOM's parser, so its tests run under jsdom through the test harness.
