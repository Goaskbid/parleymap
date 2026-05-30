# Iteration Notes: v2.0.0

## User request addressed

The user asked for ParleyMap to stop feeling like a basic travel map and become a global influence intelligence cockpit. Specific requested changes included: use the provided logo in the header and as a watermark, add a tasteful animated background, add more flags and icons, assume leader travel arcs run from homebase to destination unless the itinerary is known, make a selected leader's map build as a public history, improve density heat shading, add hover detail across the interface, add next summits, highlight peace talks, and incorporate the full V2 product-expansion vision.

## Design changes

- Header now uses the supplied ParleyMap logo without a surrounding box.
- A large low-opacity watermark logo sits behind the document.
- The background has a slow animated institutional gradient that does not interfere with map reading.
- The map remains the central visual surface. Cards, rankings, summits, and explainers remain outside the map.
- Typography remains Arial Narrow-compatible everywhere.
- The interface still uses only three font-size tokens: small, base, and large.
- More flags, organization icons, role icons, sector icons, verification pills, and source pills appear in menus, cards, rankings, summit rows, and profile rows.

## Map changes

- Selected mapped leaders now render as a chronological public history with numbered marker badges.
- Public-history arcs are animated for the selected leader.
- Route arcs default to homebase-to-destination when the exact public itinerary is not established.
- Homebase nodes are displayed as analytical baselines, not private-address claims.
- Repeated public-location clusters create density circles and hub labels.
- Past records are blue; future public-watch records are amber/gold and dashed.
- Peace-process markers and encounter rings are highlighted.
- Summit watch markers are visible as a dedicated layer.
- All map markers, arcs, density nodes, summit markers, and encounter rings have hover tooltips.

## Intelligence changes

- Added Encounter as a first-class product concept.
- Added relationship-network preview rows.
- Added influence and strategic-city rankings.
- Added ParleyMap Signals preview rows.
- Added market relevance fields to appearance cards with sector, company, country, and confidence labels.
- Added source transparency and verification-level pills.
- Added peace-process highlights.
- Added summit watch cards for official future public events.

## Data changes

- Pilot dataset now contains 19 mapped people, 81 public appearance / future-watch records, 16 encounter clusters, 6 summit watch cards, and 100 top-roster seeds.
- Added city-level Palm Beach public-event cluster records for official public White House video pages. These are treated as public appearance/source records, not private-address tracking.
- Added peace-process records for Bürgenstock 2024 and official/public peace-related cards.
- Added summit watch records for G7 Évian 2026, NATO Ankara 2026, UNGA High-Level Week 2026, COP31 Antalya 2026, G20 Miami 2026, and AI/governance event watch.
- Added homebase arrays for mapped figures so analytical arcs can run from public/institutional home city baselines.

## Important caveat

This remains a review prototype and pilot archive. A production launch still requires a database, review queues, immutable source snapshots, link validation, source licensing review, sensitive-location rejection tests, and human legal/editorial review of inherited pilot records.
