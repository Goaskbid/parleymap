# Iteration notes v2.4.0

## User request addressed

- Build the 24-month crawler and overnight evergreen refresh.
- Keep the GitHub package deployable.
- Fix vertically stretched hover boxes.
- Add a usable timeline for selected leader travel history.
- Make restart, rewind, forward, fast and latest controls work.
- Add timeline one-liners and counterpart thumbnails.
- Keep the map-first layout, top-20 opening face map and top-200 roster.

## Implementation

- Added or wired `scripts/evergreen-crawl.mjs`, `scripts/crawl-24-months.mjs`, `scripts/cache-portraits.mjs`, `scripts/review-top200.mjs` and `scripts/nightly-refresh.mjs` into package commands.
- Added/updated `.github/workflows/evergreen-nightly.yml` so the repository can crawl, review, validate, build, commit and deploy overnight. `.github/workflows/nightly-refresh.yml` remains a smoke-check workflow.
- Kept crawler output in `data/crawl/`, `data/crawler/`, `data/evergreen/`, `data/refresh-log.json` and `data/crawler-status.json`.
- Added source registry and blocked-location rules for official/host/public-source ingestion.
- Fixed timeline command event handling through `data-history-command`.
- Added map-history draw functions used by `renderMap`.
- Added compact hover-card behavior.
- Added history scrubber and player controls.
- Added CSS overrides for a slimmer header, bigger logo, compact hover cards, readable timeline and larger face anchors.

## Boundary

The crawler code is present and GitHub-deployable. This local build was validated in dry-run/offline mode, so it has not populated the full top-200, 24-month historical archive locally. The public site remains conservative: source discovery can be broad, but map publication remains gated.
