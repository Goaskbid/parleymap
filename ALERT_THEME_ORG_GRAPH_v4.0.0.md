# ParleyMap v4.0.0 — Alert, Topic, Organization and Event-Graph Intelligence

This iteration keeps the accepted v3.9 layout and adds the sticky intelligence layer requested by the product owner.

## What stayed anchored

- Map-first launch page.
- Selected profile on the right.
- Intelligence panels below the map.
- Top-10 / top-20 / regional opening-map presets.
- Roadmovie playback with controlled contrail animation, synchronized call lines and fixed selected-person focus card.
- Legal identity and contact fields for Torsten Sauter in `data/operator.json`.

## New visible modules below the map

- Build alerts: new attendee announced, agenda published, speaker added, event moved and registration opens.
- Fastest growing topics.
- Most discussed topics.
- Recurring attendees.
- Organization profiles.
- Event overlap matrix.
- Organization penetration index.
- Topic migration.
- Influence timeline.
- Power geography.

## New planner coverage

- `scripts/alert-theme-graph-planner.mjs`
- `scripts/influence-intelligence-plan.mjs`
- `data/crawler/alert-theme-graph-plan-v4.0.0.json`
- `data/crawler/influence-intelligence-plan-v4.0.0.json`

The crawler planning layer now tracks alert-worthy changes, event themes, recurring attendance, organization profiles, event overlaps, topic migration and city clusters.

## Deployment note

For the full v4 update, upload the contents of the full GitHub zip into the repository root. For legal-only changes, only replace `index.html`, `impressum.html`, `privacy.html`, `corrections.html` and `data/operator.json`.
