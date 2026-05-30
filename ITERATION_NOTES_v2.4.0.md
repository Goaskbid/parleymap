# ParleyMap v2.3.0 iteration notes

Implemented in this iteration:

- Header rebuilt as a slim product bar: larger ParleyMap logo, slogan, centered Stiftung Cerebral partner window, data update, top-200 review, and import count.
- Header logo now resets the site to the opening map.
- Back-to-top button added.
- Opening map now shows the top 20 only, with de-overlapped face anchors and leader lines; the full top 200 remains in the pull-down, roster, and rankings.
- Map face anchors are larger and easier to click. Each uses a country-color ring, role icon, and flag badge.
- Hover cards added across map faces, cards, names, and rankings.
- Selected-leader history still builds from earliest public record to latest, then future records; a moving face/flag chip travels the route.
- Heat/density shading grows with the selected public-history build.
- Header partner window links to the official Cerebral Foundation site.
- Control counts moved into a bottom dataset drawer.
- Side partner card removed so the insight rail concentrates on bio, meetings, rankings, and records.
- Roster wording cleaned: no internal review jargon in visible copy.
- End of the top-200 roster refined with more globally relevant corporate, AI, semiconductor, energy, platform, and sovereign-investment figures.
- Legal and impressum sections expanded in the page for safer deployment.

Current data state:

- 23 mapped people.
- 87 public appearance / future-watch cards.
- 16 encounter clusters.
- 200 roster profiles.
- Runtime portrait hydration uses each profile's Wikipedia title; production should cache audited portraits with attribution.

Open item: the complete top-200, 24-month travel archive plus future travel plan database is not complete in this static iteration. It needs the production crawler, source snapshots, deduplication, verification, visual-rights audit, and safety review before it can be honestly presented as complete.
