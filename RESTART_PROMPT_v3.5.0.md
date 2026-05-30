# ParleyMap recovery summary — v3.5.0

The anchored layout remains: map first, selected profile on the right, intelligence below the map, top-200 roster in search/pull-down, and roadmovie controls below the map.

This iteration focused on user-requested profile and audit depth:

- Every top-200 profile has 10-15 structured profile lines.
- Social and LinkedIn links are present as labelled search links unless verified.
- International bodies display institution badges rather than misleading flags.
- Flag bugs from code collisions were corrected.
- Portrait audit fields were added and suspicious image candidates are suppressed.
- Stats below the map now open useful hover detail.

Validated state:

- 64 mapped public figures
- 205 public appearance / future-window records
- 31 encounter clusters
- 4 public phone-call readouts
- 6 event-agenda watch cards
- 200 top-200 roster profiles
- 4,800 planned 24-month backfill jobs

Run:

```bash
npm run check
```
