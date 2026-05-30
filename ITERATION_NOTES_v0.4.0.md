# Iteration Notes v0.3.0

## User goals reflected

- Provide standalone HTML for review after each iteration.
- Provide a GitHub deployment zip with all files.
- Provide a recovery zip with discussion progress, development state, and restart material.
- Make the visual design more appealing and app-like.
- Add header and logo placeholder.
- Add a name and domain direction.
- Use varied, editorial language for commentary and explainers.
- Add icons, pills, country labels, industries, and organization symbols.
- Link records to people, encounters, map markers, sources, and source packs.
- Add snapshots: where people were last publicly documented and where known future public engagements are.
- Add search, rankings, most travelled, most connected, and top-name/watchlist concepts.
- Design an evergreen auto-refresh pipeline.
- Enforce audited visual assets and public-source provenance.

## Validation

Run:

```bash
npm run check
npm run refresh:dry-run
```

Expected result:

- JS syntax passes.
- Demo data validates.
- `index.html` builds.
- `data/refresh-log.json` writes in dry-run mode.
