# Profile, social, flag and portrait audit

## Purpose

ParleyMap needs profile depth without publishing wrong portraits, wrong flags or fake social handles. This pass adds structured audit fields so an external developer can move from search-link placeholders to exact verified links.

## Data files

- `data/demo.json` now contains `profileLines`, `socialLinks`, `flagAudit`, `imageAudit` and `orgMark` fields.
- `data/top200-roster.json` carries the same profile enrichment for the full roster.
- `data/profile-link-and-visual-audit.json` is a compact review queue for flags, portraits and social links.

## Social/link policy

Exact social or LinkedIn profiles should be published only when one of these is true:

1. The profile is linked from an official government, company, foundation, institution or organizer page.
2. The platform profile itself is verified and clearly matches the public figure.
3. A reputable institutional biography points to the account.

Until then, ParleyMap should show a clearly labelled search link, not claim it is the person’s own profile.

## Portrait policy

Use a portrait only when:

- the file visibly matches the person,
- the source URL is recorded,
- author, licence and attribution are recorded,
- the use is compatible with the deployment context,
- a takedown/correction path exists.

The current UI suppresses obvious non-portrait candidates, such as seal, logo, flag, svg, painting or statue patterns.

## Flag and institution policy

- Country-led profiles use inline country flags.
- International bodies use institution badges instead of misleading country flags.
- Ambiguous codes should be fixed at the data level, not patched in CSS.

Fixed in this pass:

- Finland remains `FI` and displays as Finland.
- FIFA uses `FIFA` rather than colliding with Finland.
- OECD uses `OC`/`OECD` badge.
- BIS uses `BI`/`BIS` badge.
- IEA uses `IEA` badge.
