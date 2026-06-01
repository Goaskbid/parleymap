# ParleyMap v4.7.0 Recovery Summary

This version is a finishing and audit pass over v4.6.

Accepted product anchor:

- Top-10 global opening map is default.
- Logo reset returns to Top-10 global and clears filters/search.
- Map remains first.
- Selected profile remains on the right.
- Intelligence modules remain below the map.

Important v4.7 fixes:

- Opening map uses current/public anchor logic rather than stale historical travel destinations.
- Event participant logic is stricter and prevents topic-adjacent leaders from being added to attendee maps.
- Quad New Delhi should not include Xi Jinping.
- Keir Starmer should not show as currently in India on the opening map merely because of an older Mumbai record.
- Organization Penetration Index is now compact and width-efficient.
- Influence Timeline is now a month-board rather than a cramped rail.
- CSS reduces clipped names and clipped descriptions in cards and panels.

Deployment:

- Use the complete GitHub deployment zip.
- Upload extracted contents directly into the GitHub repository root.
- Root must contain `index.html`, `CNAME`, `.nojekyll`, legal pages, `assets/`, `data/`, `src/`, `templates/`, `scripts/` and `docs/`.
