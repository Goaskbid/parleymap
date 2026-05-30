# Iteration notes v2.9.0

Focus: face visibility everywhere.

Changes:

- Map markers now use the same portrait component as cards and rankings.
- Top-20 opening markers, top-20 name chips, top-200 quick search results, profile cards, rankings, timeline stops, counterpart chips, moving leader chips and fallback-map markers all show a face tile.
- Known Wikimedia portrait URLs are seeded immediately.
- Missing portraits hydrate in browser from Wikipedia PageImages API with `origin=*`, redirects enabled and batched requests.
- Any portrait that is unavailable, blocked, slow or missing falls back to a deterministic face-style SVG tile rather than an empty square or two-letter box.
- Flag badges remain fitted and small, with emoji fallback for special institutions.
- Rankings are re-rendered after portrait hydration so cards gain photos without a page reload.
- The page remains GitHub Pages deployable and keeps the same safety boundary: public records only, no live tracking, no private locations.

Validation:

```bash
npm run check
```

Result at build time:

```text
Valid demo data: 23 people, 87 appearances, 16 encounters, 200 roster seeds.
ParleyMap 24-month crawl dry-run: 0 candidates, 0 publishable.
Portrait dry-run: 200 profiles, 25 preview rows written.
ParleyMap evergreen refresh: dry-run; 4800 backfill jobs planned; 0 leads; 0 publishable candidates.
Built index.html.
```
