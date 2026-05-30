# Visual asset policy

ParleyMap can preview portrait candidates, but production must treat every external image as a rights-managed asset until proven otherwise.

## Prototype behavior

- The v0.5.0 static preview uses direct thumbnail candidates for the first requested roster names and browser-side Wikipedia/Wikimedia page-image hydration for the rest.
- Runtime portrait hydration is a review convenience only. It is not a completed rights audit.
- If a portrait is unavailable, the interface falls back to initials so the UI still works offline.

## Production requirement

Before caching, publishing, resizing, or redistributing any external visual asset, store:

- image source page URL,
- original file URL,
- author or creator,
- license identifier,
- license URL,
- attribution text,
- copyright/public-domain status,
- modification status,
- retrieval timestamp,
- reviewer decision,
- takedown/correction history.

Preferred visual sources are self-created graphics, public-domain official portraits with explicit reuse status, and Wikimedia Commons files with captured `imageinfo` / `extmetadata` fields and compatible license terms.

## v2.0 logo and watermark note

The supplied ParleyMap logo is included as `assets/parleymap-logo-transparent.png` for prototype review. Before public launch, confirm ownership, reproduction rights, trademark clearance, and favicon/app-icon derivatives. Do not redistribute font files. Use system fonts only.
