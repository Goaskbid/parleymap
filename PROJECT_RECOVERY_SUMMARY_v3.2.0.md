# ParleyMap v3.9.0 iteration notes

This release keeps the accepted v3.6-v3.8 product shape and applies three roadmovie fixes requested after live review.

## What changed

- The large selected-person face no longer sits on the map coordinate. It appears in a fixed focus card in the upper-right of the map frame, preventing it from covering older stop markers.
- Public phone-call lines are synchronized with the timeline. Red dotted call lines are drawn only when the call step has been reached, not on the opening map or before the call appears in the selected trail.
- Active travel legs now reveal as a moving vehicle with a contrail-style trail behind it. The start and end remain readable, the vehicle moves more slowly, and the route resolves into the trail after playback.

## Preserved

- The v3.8 deep-capture planner and heavy-hitter/event-source expansion remain included.
- The top-200 roster, 24-month planner, foreign-minister planner, event-attendee graph, legal pages and operator details remain included.
- Layout remains anchored: map first, profile on the right, intelligence panels below the map.

## Validation

Run locally:

```bash
npm run check
```

Expected current state:

- 94 mapped public figures
- 539 public appearance / future-window records
- 64 encounter clusters
- 200 roster profiles
- 4,800 24-month planner jobs
- 14,410 heavy-hitter capture jobs across 174 targets and 30 event families
