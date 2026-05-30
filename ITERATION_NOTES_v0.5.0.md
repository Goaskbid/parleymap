# Iteration notes v0.4.2

## User request addressed

This iteration focuses on the review experience requested after v0.3: color-coded travel, darker recent movement, lighter historical movement, dashed future tracks, Trump/Xi/Putin/Musk plus a broader top-200 launch queue, face-picture candidates, varied language, and event cards that do not cover the map.

## Interface changes

- **Route heat:** every person trail is split into dated segments. Recent public appearances draw in darker blue, middle-age history draws in medium blue, older records fade, and future segments draw as dashed violet/gold lines.
- **Map stays clear:** the selected explainer and event cards are docked in the card rail outside the map. The map is never covered by an event card on desktop, and mobile keeps the map first with cards below.
- **Top-200 roster:** the launch queue now contains 100 prominent real-world figures across heads of state, prime ministers, foreign ministers, international organizations, royalty, former leaders, technology, philanthropy, health, finance, and sport governance.
- **Portrait candidates:** the first requested names include direct thumbnail candidates; the rest hydrate at runtime from Wikipedia/Wikimedia page-image candidates and fall back to initials if unavailable.
- **Rankings and snapshots:** the UI now includes latest public stop, next-week, next-60-day, most-travelled, most-connected, soonest-upcoming, and priority-watchlist sections.
- **Visual polish:** cards use flags, role icons, sector pills, confidence badges, encounter rings, source links, and concise non-repetitive explainer copy.

## Data boundary

Mapped records remain synthetic for this review build. The real top-200 roster is ready for ingestion, but real trails must be published only after source packs pass verification, legal review, visual licensing checks, and safe-location precision rules.

## Next implementation target

Build a real pilot using 10 to 25 public figures and only official or host-confirmed appearances. Add a moderation queue before any real-person trail appears publicly.
