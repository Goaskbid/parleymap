# ParleyMap v2.7.0 iteration notes

## What this release fixes

- Replaced the v2.6 layout with a clean map-first shell. The old empty-map failure mode is handled by a non-blocking Leaflet loader and a built-in static fallback map, so the preview does not collapse into a black box when map scripts or tiles fail.
- Rebuilt the header: larger logo, no cropping, slogan beside it, partner window beside that, and data/review status on the right.
- Reduced visible controls. Filters sit in a drawer; the map, top-20 launch list, roadmovie, and profile are the main flow.
- Opening view shows the top 20 only, with click targets on the map and a separate name strip below the map.
- Roadmovie logic is now trip-aware. Consecutive public records stay on the same journey. Long gaps add a public-base return line. Future records draw as future windows.
- Roadmovie controls support restart, back, next, +/-5, stop, play/pause, fast mode, latest, and scrubber navigation.
- Removed internal event-code wording from the visible UI. Cards now use plain labels and human-readable summaries.
- Fixed map flag badges so they stay inside marker chips.
- Removed rank numbers above leader heads. Markers show faces/initials, flags, role icon, and short names.
- Added compact hover cards for map faces, route lines, stops, rankings, and top-20 launch items.

## Current data state

- 23 mapped public figures.
- 87 approved public appearance / future-watch records.
- 16 encounter clusters.
- 200 roster profiles.
- 4,800 planned 24-month backfill jobs.

## Important boundary

The crawler framework and overnight workflow are present. The static preview still ships with the verified pilot archive until the networked crawler runs and promotes verified source-backed records.
