# Iteration Notes - v0.5.0

Date: 2026-05-28

## Request addressed

The user asked for real data from real leaders and an OSM heatmap. They also reiterated the need for clear travel colouring, future tracks, face cards, non-repetitive language, easy operation, and event cards that do not overlap the map.

## Delivered

- Replaced the synthetic mapped dataset with a limited real public-source pilot.
- Added 17 mapped real people, 63 public appearance records, 12 encounter clusters, and the existing 100-name review-gated roster.
- Added a Leaflet/OSM heatmap toggle named `recency heatmap`.
- Weighted heatmap intensity by recency and public-interest score.
- Kept routes and pins visible above the heat layer.
- Preserved dashed future tracks for announced future public events.
- Kept event cards outside the map viewport.
- Updated README, recovery notes, and source/data documentation.

## Real data policy

Only public appearances, public meetings, public ceremonies, official visits, official or host summit records, and clearly labelled secondary-source leads are included. The dataset does not include private addresses, hotels, hospitals, homes, leaked itineraries, convoy data, flight tracking, or real-time proximity claims.

## Included pilot figures

Donald Trump, Xi Jinping, Vladimir Putin, Elon Musk, Narendra Modi, Ursula von der Leyen, Kaja Kallas, Friedrich Merz, Emmanuel Macron, Keir Starmer, Giorgia Meloni, Mark Carney, Luiz Inacio Lula da Silva, Mark Rutte, Recep Tayyip Erdogan, Subrahmanyam Jaishankar, and Marco Rubio.

## Included source classes

- Official government pages.
- Foreign ministry and presidential/prime-ministerial releases.
- Host summit pages and summit outcome documents.
- Institutional pages from NATO, EU/Consilium, G7/G20 hosts, and comparable bodies.
- Company investor pages for corporate public events.
- Secondary media only where the record is explicitly marked as a lead or probable item.

## Heatmap implementation

The heatmap uses `leaflet.heat` when available and falls back to non-interactive circle markers if the plugin fails to load. The layer is non-authoritative visualization only: marker cards and source packs remain the truth layer.

Weighting summary:

- Announced future: visible, but not maximized.
- Last 7 days: strongest.
- Last 30 days: strong.
- Last 90 days: medium-high.
- Last year: medium.
- Older than one year: faint.

## Remaining work

- Verify every source URL through automated link checks and source snapshots.
- Promote more top-200 people into mapped status only after source packs pass review.
- Replace any secondary-source leads with official or host corroboration.
- Add server-side ingestion, review queues, source screenshots/PDF archiving, and visual-rights storage.
- Add true historical two-year backfill for the first 50 profiles before expanding to 250+.
