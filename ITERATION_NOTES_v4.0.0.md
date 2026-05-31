# ParleyMap v3.9.0 iteration notes

Accepted base: v3.8 layout remains anchored. The map remains first, the selected profile stays on the right, and the intelligence/statistics panels remain below the map.

## Fixes shipped

1. Active leader portrait placement
   - The large active leader portrait no longer sits on the geographic stop marker.
   - It now appears as a fixed card in the upper-right corner of the map.
   - This prevents overlap between the active portrait and older nearby stop faces.

2. Synchronized call lines
   - Public phone-call lines are no longer pre-drawn ahead of their timeline step.
   - Call lines are drawn only once the timeline has reached the call step.
   - The active call shows both participant markers; older call lines fade and do not keep ringing markers on the map.

3. Contrail roadmovie paths
   - The active travel leg is now a faint guide line until the vehicle moves.
   - The plane / car / rail icon leaves a growing contrail behind it while it travels.
   - At the end of each leg, the completed path remains visible as part of the trail.

## Validation

Run:

```bash
npm run check
```

Current validated dataset:

- 94 mapped public figures
- 539 public appearance / future-window records
- 64 encounter clusters
- 200 roster profiles
- 4,800 planned 24-month backfill jobs
- 14,410 heavy-hitter capture planner jobs across 174 heavy-hitter targets and 30 event families
