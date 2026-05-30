# ParleyMap v2.7.0 Iteration Notes

This pass responds to the review that the roadmovie was still too mechanical and that the interface needed less visible scaffolding.

## UI changes

- Header simplified into a slim four-part row: large logo, short explainer, centered Cerebral partner window, and update status.
- Logo click resets the site to the opening map.
- Advanced filters and map layers are now tucked behind collapsed controls.
- The map remains first and central; mobile keeps the map before controls and detail rails.
- Left-rail duplicate travel controls are hidden. The real roadmovie controls live under the map.
- Opening map remains focused on the top 20, with names on the map and a separate clickable name list.
- Map rank bubbles were removed; names and flags now carry the meaning.
- Country flags are resized and constrained so they do not spill out of chips.
- Hover cards and map tooltips are capped in height and width.

## Roadmovie changes

- Consecutive public records within five days are treated as the same public trip.
- A return-home line is only drawn when there is a gap in the public record or the story reaches the last historical stop.
- Future records are shown as announced public windows and do not infer travel home.
- Timeline controls remain restart, play/pause, stop, back, forward, -5, +5, fast, latest and scrubber.
- The moving face marker is clickable and has a compact hover tooltip.

## Wording changes

- Internal-looking encounter language was removed from visible cards.
- Event cards now use plain headings: What happened, People named, Why it matters, What to watch, Market lens, Map rule.
- Peace-process records are labelled as peace talks without internal event-code wording.

## Data / automation state

- The deployable crawler framework remains in the repo.
- Nightly GitHub workflow and 24-month backfill planner remain wired.
- The bundled archive still contains the approved pilot data plus top-200 roster, not the completed top-200 x 24-month source-backed archive.
