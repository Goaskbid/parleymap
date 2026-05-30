# Design System

## Typography

- Arial Narrow-compatible condensed stack.
- Maximum three font sizes:
  - `--fs-small`
  - `--fs-base`
  - `--fs-display`
- The large display size is reserved for metrics and the hero headline.

## Visual language

- Dark command-center background.
- Glass panels with thin borders.
- Pills for role, country, sector, status, source, and score metadata.
- Organization and category glyphs in map pins.
- Country flags in cards and snapshots.
- Self-created icons only in the prototype.

## Mobile behavior

- Desktop: controls, map, and feed use a three-column layout.
- Medium: feed moves under map and cards become two columns.
- Mobile: single-column layout; selected map card moves inside the content flow below the map, so it stays contained and readable.

## Accessibility

- Skip link.
- ARIA labels on major regions.
- Semantic buttons for filters and rankings.
- Keyboard focus outlines.
- Visible text labels for inputs.
- No color-only meaning; status labels appear in text.

## v0.5.3 simplification rule

Use the global narrow stack everywhere: `Arial Narrow`, `Aptos Narrow`, `Roboto Condensed`, `Helvetica Neue`, Arial, sans-serif. Do not introduce more than three font-size tokens: small, base, and display. Keep cards outside the map viewport.

## v2.2.0 design notes

- Header logo target: roughly 2x previous size on desktop, reduced on mobile.
- Header contains the product explainer, data timestamp, and roster-review timestamp.
- The map remains the first major object in the DOM and first visual object on mobile.
- Typography remains Arial Narrow-compatible and limited to three tokens: `--fs-small`, `--fs-base`, `--fs-large`.
- Event cards, ads, rankings, and bios remain outside the map viewport.
