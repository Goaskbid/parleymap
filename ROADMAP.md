# Real Data Pilot

## Status

v0.5.0 is the first ParleyMap build with real mapped public-source records. It remains a pilot, not a complete top-200 travel history.

## Counts

- Mapped people: 17
- Appearance cards: 63
- Encounter clusters: 12
- Source-gated roster seeds: 100

## What is included

The dataset includes public, documented appearances such as:

- Trump-Xi public visit records in Beijing in May 2026.
- Xi-Putin public visit records in Beijing in May 2026.
- Putin public records in Kazakhstan, Beijing, Moscow, Kazan, Rio, and other summit contexts.
- Jaishankar-Rubio and Quad public records in New Delhi in May 2026.
- G7 Kananaskis 2025 records for G7/EU leaders and guest leaders represented in the pilot.
- NATO The Hague 2025 records for NATO-linked leaders represented in the pilot.
- G20 Rio 2024 records for G20 leaders represented in the pilot.
- BRICS Kazan 2024 records for BRICS-linked leaders represented in the pilot.
- Public corporate/institutional event records for Elon Musk where review-gated.
- Announced future public summit windows for the 2026 G7 in Evian and the 2026 NATO Summit in Ankara.

## What is not included

- No live location tracking.
- No private homes, residences, hotels, hospitals, schools, family addresses, or unofficial sightings.
- No leaked itineraries or precise unpublished routes.
- No flight tracking or convoy tracking.
- No inferred current whereabouts from social posts unless corroborated by official or host event material.
- No full top-200 historical backfill yet.

## Publication rule

A mapped record should have at least one source pack entry. Production should prefer two independent public sources for significant claims, with one source being official, host, institutional, or direct event documentation wherever possible.

## Review labels

- `VERIFIED_PAST`: official or host source exists and the event is already past.
- `PROBABLE_PAST`: credible secondary or partial-source lead exists; needs review before production-grade publication.
- `ANNOUNCED_FUTURE`: public future event announced by an official host or institution; city-level by default.

## Next ingestion target

Move from 17 to 50 mapped figures by prioritizing the highest-value public calendars and summit participant pages before expanding to long-tail public figures.


## v0.5.2 Modi domestic India correction

The v0.5.2 dataset adds official India-based public appearances for Narendra Modi so his trail is not dominated by international summits. Added records include New Delhi technology/governance events and Mumbai media, fintech, and maritime events. The Global Fintech Fest entry also creates a source-backed Modi-Starmer overlap in Mumbai.

The added records remain inside the product boundary: public event or city/public-venue area only, no private movement, no hotels, no residences, no inferred route, and no live tracking.
