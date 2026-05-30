# ParleyMap v2.2.0 Iteration Notes

## User request

The user asked for a more professional but still accessible build: a stronger header with the new wide ParleyMap logo, a centered Cerebral partner window, a clean mobile-first layout, no rounded card boxes, no overlapping map text, thumbnails directly on the map, better top-roster coverage, and a selected-leader travel animation that builds like a chronological adventure route.

## Interface changes

- Replaced the header identity with the wide ParleyMap logo supplied by the user.
- Added a center-header partner window linking to the official Cerebral Foundation English page.
- Kept the map first in the DOM and central on desktop; on mobile the map appears before controls and cards.
- Turned static date/place labels off by default. Map details now appear through hover/click tooltips and cards, preventing text overlap on the map surface.
- Removed rounded corners from application boxes and cards while keeping portrait thumbnails circular.
- Kept Arial Narrow-compatible typography and the existing three-size type system.

## Map behavior

- The landing map opens as a top-200 public-anchor face map.
- Top-roster face anchors are placed with collision-aware screen positioning and subtle leader lines from the public baseline to the visible thumbnail.
- Selecting a mapped leader animates the approved public trail from earliest record to latest record, then future records.
- A small leader portrait marker travels along the drawn route arcs during the build.
- Heat pulses appear as each stop is added, so the heatmap grows with the history rather than appearing as a static overlay.
- Travel arcs default to homebase/public-baseline-to-destination unless a source proves a consecutive itinerary.

## Data and roster changes

- Expanded the roster seed from 100 to 200 globally balanced heavy hitters.
- Added more political leaders, royals, international institution heads, sovereign wealth executives, finance leaders, technology leaders, media owners, philanthropy figures, energy leaders, and major investors.
- Kept the mapped event pilot conservative: 19 mapped figures, 81 public appearance or future-watch records, and 16 encounter clusters.
- Added birthday and age fields where available for profile bios.

## Editorial and legal changes

- Reworked profile cards and meeting boxes into plainer, human wording.
- Added clearer public-baseline language so the start map is not confused with live whereabouts.
- Expanded legal, editorial, corrections, ad disclosure, and impressum/operator notes in the interface.
- Operator identity, postal address, responsible editor, and correction email remain placeholders and must be completed before public launch.

## Known limits

This is still a static review prototype. The top-200 roster is a launch queue, not a completed two-year movement archive. Production needs database-backed ingestion, immutable source snapshots, image-rights manifests, review queues, correction workflows, and legal signoff before public deployment at scale.
