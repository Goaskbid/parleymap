# ParleyMap v4.0.0 — Alerts, Themes and Event-Graph Intelligence

This iteration keeps the accepted v3.9 layout and adds the sticky intelligence layer below the map.

## Added product modules

- Alert center: new attendee announced, agenda published, speaker added, event moved / updated, registration opens.
- Theme extraction: AI, defence, inflation, energy, China, semiconductors, climate, debt and trade.
- Recurring attendees: most connected, rising attendees, new entrants and cross-network profiles.
- Organization profiles: BlackRock, NATO, IMF, BIS, Microsoft, OpenAI, Brookings and CFR seed cards.
- Event overlap matrix: shows attendee overlap between high-signal event families.
- Organization penetration index: ranks institutions by recurring presence across event families.
- Topic migration: shows how ideas move between venues over time.
- Influence timeline: month-by-month power calendar.
- Power geography: city-level clusters with people, event types and map focusing.

## Crawler addition

The new script is `scripts/alert-theme-graph-planner.mjs`. It writes `data/crawler/alert-theme-graph-plan-v4.0.0.json` and plans jobs for agenda changes, speaker list changes, topic extraction and organization penetration scoring.

## Safety boundary

No change to the publication boundary: no live tracking, private homes, hotel guesses, leaked itineraries, aircraft tracking, medical locations or private family locations. Alerts are public-source change alerts.
