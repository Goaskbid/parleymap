# Roadmap

## Phase 0: Static review prototype

Completed through v0.4.2:

- OSM/Leaflet map with markers, hover tooltips, popups, colored movement paths, future dashed tracks, and encounter rings.
- Non-overlapping event card rail so the map remains visible.
- Search, filters, snapshots, rankings, top-200 roster, source health, legal disclaimer, design system, automation architecture, and recovery package.

## Phase 1: Real public-source pilot

Started in v0.5.0:

- 17 real mapped public figures.
- 63 public appearance cards.
- 12 encounter clusters.
- Recency-weighted OSM heatmap.
- Official and host sources first, with secondary records labelled as probable or leads.
- City-level future precision by default.
- Source packs attached to each record.

Next Phase 1 work:

- Expand to 50 mapped people.
- Add source snapshots and confidence scores.
- Add manual review before publication.
- Add audited visual assets only.
- Add correction and takedown flow.

## Phase 2: Database and crawler

- Postgres schema for people, roles, organizations, events, appearances, locations, sources, media, and ingest jobs.
- Scheduled jobs for nightly refresh, daily two-year backfill, and 60-day future scan.
- Roster diff job for new office holders, promoted executives, new ministers, newly relevant institutional heads, and exiting figures.
- Entity resolution using Wikidata, official pages, and PEP/entity datasets where allowed.

## Phase 3: Editorial operations

- Admin review queue.
- Correction and takedown workflow.
- Source-pack versioning.
- Redaction rules for sensitive venues and real-time risks.
- Legal review of disclaimers, image use, privacy posture, and user terms.

## Phase 4: Scale

- Expand roster to 250, then 500 to 1000 profiles.
- Add person profile pages, event pages, organization pages, country views, and API exports.
- Add performance optimizations for vector tiles, clustered markers, or pre-binned heat tiles.

## v0.5.1 completed

- Stronger in-map heatmap layer.
- Compact date/location labels on OSM markers.
- Toggle for date/location labels.
- In-map heat legend.

## Next

- Expand source-backed pilot records by person and country.
- Add collision-aware label placement for dense diplomatic-summit clusters.
- Move from prototype OSM tiles to a production-compliant tile provider or self-hosted tile stack before public traffic.

## v2.0 roadmap update

1. Harden Encounter as a first-class entity and build audited relationship edges.
2. Create a database-backed city heatmap and selected-person density model.
3. Expand summit watch and peace-process tracking with official public sources only.
4. Add Why This Matters summaries with source-linked context and confidence labels.
5. Build ParleyMap Signals as a subscription alert product.
6. Add institutional features: watchlists, exports, API access, relationship graph views, and historical datasets.
7. Add annual roster governance and promotion-triggered roster updates.
