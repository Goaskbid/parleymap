# Event-Attendee Graph Expansion - v3.6.0

The highest-value crawler output is the bipartite graph:

**Person <-> Event**

Each edge should store:

- event id,
- person id,
- organisation represented,
- role at event: speaker, attendee, organiser, board member, host, guest, moderator, panelist,
- source URL,
- source type,
- publication confidence,
- capture timestamp,
- whether the edge is confirmed, likely, reported or watchlist-only.

## Event families to crawl

### Global political and economic

G7, G20, BRICS, APEC, WEF Davos, UNGA, COP.

### Security

NATO Summit, Munich Security Conference, Shangri-La Dialogue, Raisina Dialogue.

### Central banks and finance

Jackson Hole, IMF / World Bank meetings, BIS meetings, ECB Sintra, FOMC public calendar and speech pages.

### Elite and invitation networks

Bilderberg, Boao, Ambrosetti, Sun Valley.

### Trade, business and industry

WTO Ministerial Conference, CES, Farnborough Airshow, Paris Air Show, Milken, St. Gallen Symposium.

### Energy

OPEC meetings, CERAWeek, ADIPEC, Future Investment Initiative.

## Derived signals

- Cross-event attendance score.
- Repeat-attendee ranking.
- First-time attendee detection.
- Speaker-to-attendee transition.
- Country interlock.
- Organisation interlock.
- Industry exposure.
- Relationship reactivation after long gaps.
- Emerging hub detection.
