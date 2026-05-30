# ParleyMap v0.5.3 Handoff Brief

## Product definition

ParleyMap maps and explains documented public appearances and announced public engagements of globally prominent figures using public sources, conservative precision, and source packs.

## Current state

The repository is a static HTML, CSS, and JavaScript prototype deployable on GitHub Pages. It uses Leaflet with OpenStreetMap tiles, a recency-weighted heatmap layer, real public-source pilot records, and a real-name top-200 roster that is ready for staged source-backed ingestion.

The v0.5.3 review build deliberately reduces visual complexity: left control rail, central sticky map, right ranking/event rail, full top-200 pull-down, global Arial Narrow-compatible type, three font-size tokens, and no event cards covering the map.

## v0.5.0 user requests implemented

- Real public-source pilot data has replaced the synthetic mapped dataset.
- Trump, Xi, Putin, Musk, Jaishankar, Rubio, G7 leaders, NATO-linked leaders, EU leaders, and other pilot figures now have mapped public appearance cards where source packs exist.
- The OSM map includes a heatmap toggle. Recent/high-interest public events render darker; older historical stops fade; future public agenda points remain visible but are not treated as live tracking.
- Colored travel paths show movement over time.
- Future tracks are present and dashed.
- Face image candidates and fallback initials remain wired.
- Event explainers sit outside the map, keeping the map visible.
- The language in the interface is concise and varied rather than template-heavy.
- Icons, country flags, pills, sectors, organizations, rankings, snapshots, and legal notes are included.

## What remains gated

The top-200 roster is not a completed movement dataset. It is an ingestion queue. Each person needs source packs, source snapshots, precision review, legal/safety checks, and visual audit before being promoted into production-grade mapped history.

## Next developer tasks

1. Expand the real mapped pilot from 17 to 50 people using official and host-confirmed public appearances.
2. Implement automated link checks and immutable source snapshots.
3. Add database-backed ingest jobs and review queues.
4. Replace probable/secondary records with official or host corroboration wherever possible.
5. Replace runtime portrait hydration with stored, audited image metadata.
6. Add tests for route sorting, future expiry, duplicate detection, source scoring, and sensitive-location rejection.

## v0.5.1 handoff note

This iteration responds to the explicit request to put the heatmap and date/location information directly on the map. The OSM canvas now has a stronger warm heat layer, an in-map heat key, and compact non-interactive date/location labels. The label layer is toggleable and deliberately density-limited at low zoom to preserve map visibility.


## v0.5.2 handoff notes

Map labels now use client-side collision placement. Movement paths are no longer straight lines: each segment is drawn as a deterministic curved arc, with offset slots for repeated corridors. Past records use blue; future records use amber and dashed tracks. Modi has official India domestic records added from PM India pages, plus a Modi-Starmer Mumbai overlap.

Before scaling above the pilot, replace the lightweight label collision routine with a tile-aware label engine or clustering/decluttering strategy. Route arcs should eventually support bundling, per-person trail toggling, and zoom-specific simplification.

## v0.5.3 handoff note

The current UI direction is intentionally less ornate and less section-heavy. Keep the OSM map as the central, always-visible object. Controls and cards should scroll beside it, not cover it. The top-200 roster is now a pull-down in the command panel; profiles without approved appearance source packs should open a review-gated profile card rather than fabricating a trail.

## v2.0.0 handoff note

The product has been repositioned from a public-appearance map into an influence intelligence cockpit. The supplied ParleyMap logo is now used in the header and as a page watermark. The UI has a restrained animated institutional background, richer flags/icons, source/verification pills, summit watch cards, peace-process highlights, relationship-network preview rows, and ParleyMap Signals preview rows.

The most important implementation change is the selected-leader history mode. When a mapped person is selected, the map builds their documented public history with numbered markers, animated arcs, hover tooltips, homebase nodes, and density commentary. Route arcs default to homebase-to-destination unless a source proves a consecutive itinerary. These arcs are visual analysis aids only; they do not claim exact movement, travel route, flight path, security route, or live location.

The next developer should harden the V2 data layer before expanding the dataset: create database tables for encounters, relationship edges, summits, signals, source packs, source snapshots, market relevance, visual assets, and review statuses. Add tests for sensitive-location rejection, future precision, source reliability, homebase display rules, relationship scoring, duplicate encounters, stale future records, and link rot.

## v2.2.0 handoff additions

- The landing map now opens in `NOW` mode and overlays all 200 roster profiles as public face anchors.
- For mapped leaders, the anchor is the latest public-source record in the pilot dataset.
- For leaders without approved trails, the anchor is a public institutional, multilateral, or corporate baseline. This is intentionally labelled and must not be marketed as live location.
- The selected leader marker includes a small portrait/initials and country flag.
- The selected mapped leader history is animated in chronological order. Future records are shown after the historical trail and remain amber/dashed.
- Every top-200 profile has a compact bio generated from structured fields and mapped-record statistics.
- The Stiftung Cerebral header partner window links to the official English page and uses the official Cerebral logo URL. Keep written approval, campaign dates, and accessibility text in the ad settings before production.


## v2.2.0 product/UI additions

- The header uses the newer wide ParleyMap logo at a larger size, with the partner ad centered between brand and metadata.
- The opening map is a face-anchor map for the top-200 roster. Static map text labels are off by default; hover and click reveal details so map text does not overlap.
- Selecting a mapped leader starts a chronological public-history build: earliest record first, then later records, then announced future records. A portrait marker moves along the drawn arcs while density pulses grow at each public stop.
- The default map is intentionally a public-anchor view, not a live-location view. Baselines must remain labeled as baselines.
- Bios now read as compact profile rows with birthday/age where a birth date exists, role/institution chips, anchor/trail context, and safety boundary language.
- The top-200 roster balances political leaders, foreign ministers, royals, international bodies, sovereign wealth, technology, finance, industrials, media, philanthropy, and major investors.
- Legal, editorial, corrections, ad disclosure, and impressum/operator placeholders are now explicit in the page. Fill the operator fields before public launch.

## v3.0.0 handoff update

The selected-person roadmovie bug has been fixed. Start Roadmovie now respects the active selected profile. The route animation is slower, shows endpoints before vehicle movement, and renders stop explanations, counterpart mini-faces, source pills, and public call readouts. Map flags are now image-based for normal country codes, with special-symbol fallback for non-state entities.
