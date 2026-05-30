# ParleyMap v2.6.0 iteration notes

## User problem addressed

The previous roadmovie played too aggressively and repainted the map between stops. The opening face map also needed clearer names and easier selection.

## Interface changes

- Reworked the travel movie into a calmer roadmovie: one public stop at a time, with a visible outbound leg and a dotted return-home storyline where no better official route is available.
- Removed the timed full-map repaint during autoplay. The map now keeps the already drawn web and adds the next leg, marker and heat/density point in place.
- Slowed the default pace so the face marker has time to complete the leg before the next stop begins.
- Kept manual interruption: stop, pause, restart, back, forward, plus five-stop jumps, latest and scrubber controls.
- The selected timeline stop now carries a date, city, one-line explanation and counterpart thumbnails when the record names other participants.
- Added clearer top-20 launch names in the control rail. The map stays face-first; the clickable name list is outside the map so map text does not overlap.
- Kept compact map and card hovers with hard max heights to avoid the stretched tooltip problem.

## Data / automation changes

- The 24-month crawler framework remains wired for overnight GitHub execution.
- The top-200 roster review and portrait enrichment jobs remain part of the nightly workflow.
- The visible approved dataset is still source-gated; the crawler stages candidates but only publishes records that pass public-source, city-level precision and safety rules.

## Validation

Run used for this build:

```bash
npm run check
```

Expected validation state at build time:

- 23 mapped people
- 87 appearance / future-watch records
- 16 encounter clusters
- 200 top-200 roster profiles
- 4,800 planned 24-month backfill jobs in crawler dry-run
