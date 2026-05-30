# Iteration notes: v3.1.0

This pass repairs the flag layer, clarifies the default launch view and adds a stronger roadmovie narrative layer.

## Product changes

- Default launch view reduced to top 10 to keep the map clickable.
- Summit shortcuts added as clickable pills with date, location and participants.
- Roadmovie stops now trigger a short explainer card for roughly five seconds.
- Every played stop is saved into a briefing log below the timeline.
- Call readouts now show participant cards with phone-ring animation.
- Return-home storyline added after long gaps and after the final known public stop.
- Inline SVG flags replace external flag images and emoji fallbacks.

## Data boundary

The static preview still contains the approved pilot dataset. The crawler framework remains in the repository for the full top-200 / 24-month backfill.
