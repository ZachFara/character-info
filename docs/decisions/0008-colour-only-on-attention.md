# 0008. Colour on the figure means attention

## Context

The first render coloured every region by its state, so a body with three problems showed twenty coloured shapes and the problems did not stand out. Overlapping outlines also made joints look messy, and a state like Lost was grey on a grey figure.

## Decision

Regions in the profile's default state are drawn neutral, filled with the body colour and separated by a faint seam. Only regions in another state take their state colour. The selected region gets an outline in the text colour, which stays visible whatever its state colour is. The chip roster still shows every state colour. State colours must differ from the neutral body in both light and dark themes, so the built-in Lost state is violet.

## Consequences

- A healthy tabletop character reads as a plain figure, and a wound is immediately visible.
- A profile whose default state is a meaningful colour, such as green for Healthy, shows that colour on the chip and legend only.
- Custom state colours can still be chosen badly. The settings tab does not check contrast against the theme.
