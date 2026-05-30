# Auto-Update Architecture

## Goal

Keep ParleyMap evergreen without turning it into a surveillance system. The crawler should update documented public appearances and announced public engagements, not live locations.

## Refresh cadence

- **Nightly:** official calendars, public schedules, royal diaries, institutional newsrooms, RSS feeds, host-event programs, verified social accounts where terms permit, and secondary news discovery.
- **Daily:** two-year rolling backfill for records that were corrected, added late, or clarified after an event.
- **Daily:** 60-day future scan for officially announced public engagements.
- **Annual:** full roster review to add newly promoted figures and remove people whose relevance has faded.
- **Event-window bursts:** summit weeks, UNGA, G7/G20, COP, WEF, major royal events, major sport-governance events, and institutional annual meetings.

## Data pipeline

1. **Roster discovery**
   - Inputs: Wikidata, OpenSanctions PEP scopes, official appointment pages, national/government directories, international-organization leadership pages, major-company leadership pages, and editorial priority lists.
   - Output: candidate people with aliases, offices, organizations, risk tier, source quality, and review status.

2. **Source discovery**
   - Inputs: official schedules, public calendars, RSS feeds, press rooms, event host pages, verified social posts where terms allow, and discovery APIs such as GDELT.
   - Output: candidate appearances with raw text, URL, timestamp, and extraction method.

3. **Entity resolution**
   - Link names to people using aliases, roles, organizations, country, language variants, transliterations, and existing identifiers.
   - Use a conservative threshold. Ambiguous names go to review.

4. **Event extraction**
   - Extract date, city, country, public venue if safe, event type, source type, participants, host organization, and topic tags.
   - Future events are city-level by default.

5. **Verification**
   - Attach source pack.
   - Score source reliability.
   - Check for sensitive locations.
   - Check robots/terms metadata.
   - Add correction and last-checked timestamps.

6. **Encounter graph**
   - Link appearances by event group, city, date, host organization, and source-supported participant lists.
   - Do not imply a private meeting unless a source explicitly says so.

7. **Summary generation**
   - Generate short explainers from source packs.
   - Separate verified outcomes, expected agenda, commentary, and unresolved claims.
   - Store summaries with model/version metadata and review status.

8. **Visual audit**
   - Prefer self-created SVGs and data graphics.
   - External images require source URL, author, license, license URL, attribution text, and checked timestamp.

## Publication gates

A production record should not publish unless it has:

- A linked person and organization.
- Date and safe location precision.
- At least one primary or host source for future events.
- Source pack with timestamp and reliability.
- Sensitive-location scan passed.
- Confidence score.
- Correction and takedown path.

## Infrastructure target

- Postgres + PostGIS for people, organizations, locations, appearances, encounters, source snapshots, and media assets.
- Queue worker for crawling and extraction.
- Object storage for source snapshots.
- Search index for people, organizations, places, topics, and source text.
- Admin review interface for ambiguous records and sensitive figures.
- Static frontend cache for fast public viewing.
