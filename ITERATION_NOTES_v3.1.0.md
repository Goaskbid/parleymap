# ParleyMap v3.0.0 Iteration Notes

This pass fixes the roadmovie and map affordance issues reported after v2.9.0.

## UI and map fixes

- The Start Roadmovie button now starts the selected profile if a person has been chosen in the pull-down, search, ranking card, or map marker. It no longer defaults back to the first profile.
- The roadmovie is slower and step-based. It keeps the start and end of the current leg in view before the vehicle animation runs.
- Older route legs fade to grey. Future public windows stay amber and dashed. Long-gap base resets are grey dotted story lines, not dated stops.
- Public telephone call readouts are included as timeline events and as straight red dotted lines between public institutional anchors.
- Every timeline stop now shows a short line about what happened, the date/location, counterpart mini-faces when available, and source pills.
- Stop markers now carry the selected figure portrait, a stop icon, and a fitted flag badge.
- The opening map remains top-20 only for readability, while the full top-200 remains available in search, pull-down, rankings, and crawler planning.
- Map tile source changed to an English-friendly OSM-derived CARTO Voyager layer.

## Visual fixes

- Portraits are used on map markers, timeline stops, profile cards, rankings, launch cards, search results, and counterpart chips.
- Flag badges now use image flags from FlagCDN for normal country codes, with symbol fallback for non-state entities.
- Hover cards stay compact and update while the pointer moves over markers, route lines, and call lines.
- The header keeps a larger contained logo, slogan, Cerebral partner window, and unboxed update/review status.

## Safety boundary retained

The visible product still covers public appearances, official or host-public meetings, public summit windows, public readouts, and verified public-event anchors. It does not show private addresses, live tracking, aircraft tracking, hotel guesses, leaked itineraries, hospital details, or private family movement.
