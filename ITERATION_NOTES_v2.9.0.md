# Iteration notes v2.8.0

This release is a UI repair and roadmovie refinement pass.

## Changes

- Restored visible faces on the map by removing the opacity rule that hid loaded portrait images.
- Replaced code-like flag badges with fitted image flags using public flag assets, with clear institutional fallbacks for non-country entities.
- Kept the opening map focused on the top 20 for readability while keeping the full top-200 roster searchable and selectable.
- Added a prominent top-200 search input so profiles such as King Charles III can be found without relying on tiny map markers.
- Kept all map objects clickable: faces, stops, route legs and public-call lines.
- Added red dotted public telephone-call lines from source records.
- Improved the roadmovie so older legs grey out, future legs stay gold, dotted lines are used for future/return/call relationships, and a vehicle marker moves along the current leg.
- Preserved smoother zoom behavior: near stops zoom closer, long-haul stops pan instead of repeatedly refitting the world, and the final state zooms back out to the trail.
- Moved stats below the map rather than using header boxes.
- Cleaned the header: larger contained logo, slogan beside it, real Cerebral logo in the partner window, and unboxed data status text.

## Data state

- 23 mapped public figures.
- 87 public appearance or future-watch records.
- 16 encounter clusters.
- 4 public-call records.
- 200 top-200 roster profiles.
- 4,800 planned 24-month backfill jobs.

## Boundary

This is still a public-appearance product. No private residences, hotel guesses, aircraft tracking, live proximity, leaked itineraries, medical locations, family locations or security-sensitive stops are published.
