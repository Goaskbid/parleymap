# ParleyMap v2.2.0 Iteration Notes

## User requests addressed

- Make the supplied logo significantly larger in the header while preserving a no-box, transparent-style presentation.
- Add a short header explainer describing what the site does.
- Show last data update and last top-200 roster review in the header.
- Add an ad window with Stiftung Cerebral as the default creative and a picture.
- Clean the layout for mobile, keep the map first, and keep the map visible.
- Give every leader a brief compact bio.
- Start the page by showing where the top-200 roster is currently anchored on the map.
- Show the selected leader with a small face and flag directly inside the map.
- Make the map start with an Indiana-Jones-style public-history build from earliest record to latest record, then future records.

## Implementation summary

- Header now contains the 2x+ ParleyMap logo, product explainer, data timestamp, top-200 review timestamp, and navigation.
- Default time window is now `NOW`, labelled as latest public-anchor view.
- The map draws a top-200 public-anchor layer on load.
- Mapped profiles use the latest approved public appearance as their current public anchor.
- Unmapped/review-gated roster profiles use public institutional, multilateral, or corporate baselines.
- Roster anchors are jittered around the same public city when many people share the same anchor to reduce overlap.
- Selected leaders get a face/flag chip on the map.
- The default focus history is Donald Trump because rank #1 has the most explicit user-requested density example. Selecting another mapped leader redraws the trail for that leader.
- Public-history arcs are drawn from homebase baselines to each known public record, in chronological order. Future public records render after historical records and use dashed amber arcs.
- Each roster profile and selected profile receives a generated compact profile based on role, institution, region, sector, public anchor, trail depth, encounters, future watch, and safety rules.
- Added a default Stiftung Cerebral ad card using original inline SVG placeholder artwork. This is not an official charity logo or scraped campaign image.

## Safety / editorial handling

The top-200 start map is explicitly a public-anchor view, not a live-location view. For leaders without approved trails, the marker means “institutional/corporate baseline while review-gated.” For mapped leaders, the marker means “latest documented public record in this pilot.” The legal disclaimer and map legend both state this distinction.

## Validation

`npm run check` passed:

- JavaScript syntax check
- Data validation
- Standalone HTML build

Validation result at build time:

`Valid demo data: 19 people, 81 appearances, 16 encounters, 100 roster seeds.`

## Final polish before packaging

- Sponsor card now links to the default Stiftung Cerebral destination URL for handoff review.
- Selecting a mapped top-200 figure now opens the earliest available public record first, while the map animates the full trail in date order and then the announced future cards.
- The selected leader chip on the map supports runtime portrait hydration from the profile wiki title, while still showing initials if no approved image is available.
