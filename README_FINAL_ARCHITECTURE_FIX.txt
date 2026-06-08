ParleyMap final architecture fix

This package changes the repair architecture.

Source of truth:
- index.html demo-data is the live source when present.
- data/demo.json is a mirror and fallback, not blindly injected into the page.
- if index.html is thin or broken, the workflow checks out full git history and restores the newest safe full index.html with a valid demo-data block.

Repairs:
- removes fake dated watch rows across all event-like arrays
- repairs institutional anchors globally across profile-like objects
- suppresses duplicate Grossi helper rows so only one visible Grossi source remains
- repairs faces by curated fallbacks and cross-row copy
- seeds official-source events for IAEA, Vatican and Royal Family travel/appearances
- preserves AdSense IDs from current files or git history, then writes ads.txt
- creates clean privacy, impressum, about, contact, methodology and data-sources pages

Run first:
Actions > ParleyMap data validation > Run workflow

Leave AdSense fields blank first. The script searches current files and git history.
If it cannot recover AdSense IDs and you require AdSense readiness, rerun with publisher_id, header_slot_id and sidebar_slot_id.

Success reports:
- data/diagnostics/canonical-hard-audit-report.json -> status audit_passed
- data/diagnostics/canonical-rescue-report.json -> status canonical_rescue_applied
- data/diagnostics/adsense-preserve-audit-report.json -> status adsense_preserved_and_audited or explicit no-IDs-found status
- data/diagnostics/LATEST_RUN_SUMMARY.md -> readable summary

Daily:
ParleyMap nightly refresh runs at 03:19 UTC and repeats the same canonical repair/audit.

Monthly:
ParleyMap monthly roster review runs at 04:31 UTC on the first day of each month. It is safe review only and does not mass-replace people.
