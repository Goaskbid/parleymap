# Iteration Notes v0.5.3

## User request addressed

The user said the interface felt too convoluted and asked for a cleaner application shell: Arial Narrow everywhere, no more than three font sizes, a pull-down menu with all top-200 people, more clickable rankings, and a map that remains central and visible.

## Product changes

- Reworked the review UI into a cleaner map-first cockpit.
- Kept the OpenStreetMap viewport in the central column and made it sticky on desktop.
- Moved event cards, explainers, and rankings outside the map so they do not cover geography.
- Added a native top-200 pull-down menu containing every roster profile.
- Selecting a mapped top-200 person filters and fits the map to that person's public-source records.
- Selecting an unmapped review-gated top-200 person opens a compact profile note without inventing a route.
- Expanded the clickable ranking rail:
  - most travelled,
  - meeting most others,
  - most public cards,
  - highest interest,
  - latest activity,
  - soonest future records,
  - future city clusters,
  - priority top-200 names.
- Rebuilt the CSS around strict Arial Narrow-compatible typography.
- Kept typography to exactly three size tokens: small, base, and large.
- Preserved past/future colour separation: past records and arcs remain blue, future records and arcs remain gold/dashed.
- Preserved collision-aware date/location labels and heatmap layers.
- Reordered the mobile layout so the map appears before controls, rankings, and cards.

## Editorial boundary unchanged

No private addresses, hotels, hospitals, leaked itineraries, unofficial sightings, inferred routes, live proximity, or security-sensitive details are published. Future public records remain city-level unless an official organizer deliberately publishes the venue.

## Validation

`npm run check` passed after the v0.5.3 changes.

Current data validation result: 17 mapped people, 72 appearance records, 13 encounter clusters, and 100 roster seeds.
