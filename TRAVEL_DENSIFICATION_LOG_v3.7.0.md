# Foreign-minister and connector crawler: v3.7.0

## Purpose

The crawler needs to capture the people who move often and matter: foreign ministers, vice presidents, deputy prime ministers, central bankers, heads of institutions, recurring Bilderberg and Davos participants, Group of Thirty members, BIS principals, OPEC and energy leaders, and development-philanthropy figures.

## Priority source classes

1. Official travel pages and public schedules.
2. Foreign-ministry readouts.
3. Host-government summit pages.
4. Event participant lists.
5. Official speech pages.
6. Official social posts after account ownership is verified.
7. Credible media only as discovery leads or context.

## Fields to extract

- Person.
- Organization.
- Role.
- Date and time window.
- City and public-event venue where deliberately public.
- Event name.
- Counterparts named in the readout.
- Speaker / attendee / organizer / chair status.
- Source URL.
- Verification level.
- Safety precision.

## Publication rules

- No hotel, residence, private location, aircraft tracking or live-proximity data.
- Future attendance requires an official organizer, government, corporate or institutional page.
- X/Twitter-style posts do not publish by themselves unless account identity and event context are verified.
- Event-attendee graph edges must preserve source URL and extraction method.

## Next crawler targets

- State Department secretary travel archive.
- India MEA EAM visit pages.
- Russian MFA ministerial readouts.
- China MFA minister activity pages.
- GOV.UK and Global Affairs Canada G7 pages.
- Japan MOFA G7 and summit pages.
- Brazil MRE and BRICS host pages.
- BIS, Group of Thirty, Bilderberg, WEF, OECD, IMF, World Bank, OPEC and UN event pages.
