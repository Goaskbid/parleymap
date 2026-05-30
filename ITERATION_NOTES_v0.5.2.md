# Iteration Notes v0.5.1

## User request

Add the heatmap directly in the OpenStreetMap view and make dates and locations visible on the map itself.

## Implemented

- Kept the recency heatmap enabled by default and moved it into a dedicated Leaflet pane above the OSM tile layer so it is visibly part of the map.
- Strengthened the heatmap gradient and radius so recent/high-interest public activity reads clearly.
- Added a small in-map heat key explaining the gradient.
- Added a default `date/location labels` map layer.
- Added compact map labels beside priority public appearance stops. Each label shows the event date and host location, with the relevant person on the second line where space allows.
- Added a layer toggle so labels can be hidden if the map becomes crowded.
- Preserved the rule that event cards and detailed explainers stay outside the map panel.

## Validation

```bash
npm run check
```

Result:

```text
Valid demo data: 17 people, 63 appearances, 12 encounters, 100 roster seeds.
Built index.html
```

## Notes for the next developer

The map now has separate panes for the heat layer, route layer, encounter rings, marker layer, and label layer. Future work should replace the lightweight label-priority logic with clustering or collision detection once the dataset expands beyond the pilot.
