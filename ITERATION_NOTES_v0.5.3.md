# Iteration Notes v0.5.2

## User request

- Prevent overlapping text items on the map.
- Use different colours for past and future records.
- Prevent overlapping leader lines / movement paths.
- Correct the data oddity where Narendra Modi had international records but too little domestic India trail.

## Implemented

- Replaced the previous priority-only map labels with collision-aware date/location label placement.
- Labels now test multiple anchor positions around each marker and only render if they do not collide with already-placed labels.
- Past records now use a blue visual language:
  - darker blue for fresher records,
  - lighter blue for older historical records.
- Future records now use an amber visual language:
  - amber pins,
  - amber glow in the heat layer,
  - dashed amber future tracks,
  - amber label chips.
- Split the heat layer into blue past heat plus amber future glow.
- Replaced straight route segments with curved, deterministically offset route arcs.
- Route arcs are re-computed after zoom changes so repeated corridors do not sit exactly on top of one another.
- Added official India-based Narendra Modi public appearance records in New Delhi and Mumbai.
- Added a source-backed Modi-Starmer Mumbai overlap at Global Fintech Fest 2025.

## Added source-backed Modi / India records

- Bharat Mobility Global Expo 2025, New Delhi.
- WAVES 2025, Mumbai.
- Semicon India 2025, New Delhi.
- India Mobile Congress 2025, New Delhi.
- Global Fintech Fest 2025 with Keir Starmer, Mumbai.
- India Maritime Week 2025, Mumbai.
- Seva Teerth and Kartavya Bhavan event, New Delhi.
- India AI Impact Summit 2026, New Delhi.

## Validation

```bash
npm run check
```

Result:

```text
Valid demo data: 17 people, 72 appearances, 13 encounters, 100 roster seeds.
Built index.html
```

## Notes for the next developer

The collision handler is deliberately lightweight and works client-side for the current build scale. At larger scale, replace this with a label-placement layer that supports tile-aware collision, clustering, or decluttering by zoom and priority. The current route-arc offset is deterministic and prevents exact overlap, but a production implementation should add route bundling and per-person trail filtering for dense corridors.
