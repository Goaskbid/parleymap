# ParleyMap evergreen crawler v2.5.2

ParleyMap now ships with a deployable crawler framework for a rolling 24-month public-appearance archive and a 120-day future public-event watch.

## What runs overnight

The GitHub workflow runs three stages:

1. `npm run crawl:nightly` calls `scripts/evergreen-crawl.mjs` with a 24-month lookback and source-gated promotion enabled.
2. `npm run roster:review` calls `scripts/evergreen-roster-review.mjs` to compare the top-200 list against public office-holder data and update review metadata.
3. `npm run check` validates JavaScript, validates the approved dataset, and rebuilds the standalone page.

The GitHub workflow `.github/workflows/nightly-refresh.yml` runs at `02:17 UTC`, runs the 24-month refresh, validates the project, rebuilds `index.html`, commits changed data/build files, and deploys the static site to GitHub Pages.

## What the crawler writes

- `data/crawler/candidate-appearances.json` — broad source leads.
- `data/crawler/publishable-appearances.json` — city/date/source candidates that pass basic source and safety checks.
- `data/crawler/crawl-report.json` — run status, errors, source coverage, and candidate counts.
- `data/crawler/backfill-plan.json` — 24-month monthly job planning from the older evergreen planner.
- `data/top200-review.json` — roster review output.
- `data/refresh-log.json` — short run log for handoff and audit.

## Source layers

1. Official calendars and public schedules.
2. Official press rooms and ministry pages.
3. Host-event pages for summits, conferences, ceremonies and corporate events.
4. GDELT/news discovery as a lead generator only.
5. Wikidata/Wikimedia identity and portrait metadata.

## Publication gate

A candidate can become a map record only when it has:

- a person matched to the top-200 roster;
- a date or date window;
- a city-level location or deliberately public event venue;
- a source URL;
- no private/sensitive location terms;
- future-event confirmation from an official or host-public source.

The default remains conservative. Auto-ingested records are marked for review unless the source adapter is trusted and the record passes all public-appearance checks.

## Commands

```bash
npm run check
npm run crawl:dry-run
npm run crawl:nightly
npm run roster:review
npm run refresh:nightly
```

## Important legal note

Publicly available material is not automatically public domain. The crawler stores source URLs and metadata; it does not copy publisher text, private media, or unlicensed images. Portraits need a production cache with source URL, author, licence, and attribution.
