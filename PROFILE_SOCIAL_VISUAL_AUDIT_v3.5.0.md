# ParleyMap v3.5.0 — profile, social/link, flag and portrait audit pass

This iteration anchors the v3.2/v3.4 layout and adds more useful profile depth without changing the map-first product structure.

## Changes

- Added 10-15 structured profile lines for every top-200 roster entry.
- Added structured profile lines for mapped public figures.
- Added social/link fields for every top-200 profile:
  - official/profile link where present,
  - Wikipedia/profile link where present,
  - Wikidata link where present,
  - labelled LinkedIn search link,
  - labelled social-media search link.
- Added `data/profile-link-and-visual-audit.json` as the handoff audit file for social links, flags and portrait candidates.
- Added portrait audit fields with statuses: `photo-candidate`, `review`, or `missing`.
- Suppressed clearly suspicious portrait URLs, such as logo/seal/flag/svg/drawing candidates, in favour of generated fallback faces until a real portrait is approved.
- Added organisation badges for international-body profiles and institutions, including EU, UN, NATO, OECD, BIS, IMF, World Bank, WHO, WTO, IAEA, IOC, FIFA, Gavi, OPEC, G30, WEF, Bilderberg and IEA.
- Fixed several country/institution code collisions, including Finland vs FIFA.
- Added more inline flag coverage, including Hong Kong, Portugal and Kuwait.
- Added hover detail to dataset stats below the map: roster, mapped pilots, public records, future windows, meetings, calls, cities and crawler window.
- Improved city ranking hover detail with people and event-type context.

## Editorial rule

The LinkedIn and social pills are intentionally labelled as search links unless a profile has been verified from an official source. Do not rename these as exact accounts until the exact handle/profile has been checked.

## Validation

```bash
npm run check
```

Passed.
