ParleyMap true final fix

Upload the CONTENTS of this folder to the repository root, not the parent folder.

Files expected after upload:
- .github/workflows/data-validate.yml
- .github/workflows/nightly-refresh.yml
- .github/workflows/monthly-roster-review.yml
- .github/workflows/roster-auto-update-now.yml
- scripts/parleymap-true-final-fix.cjs
- scripts/parleymap-safe-roster-review.cjs
- data/curated-anchors.json

First run:
1. Actions > ParleyMap data validation > Run workflow.
2. Leave AdSense fields empty first.
3. Keep require_adsense_ready=true.
4. If it fails only because AdSense IDs cannot be recovered, rerun with your real publisher_id, header_slot_id, and sidebar_slot_id.

What it repairs:
- Restores a full crawler-visible index.html from git history if the current one is thin.
- Removes fake dated watch cards.
- Repairs institutional anchors for Sheinbaum, Pope Leo XIV, Prabowo Subianto, Rafael Grossi, and other curated key profiles.
- Removes Rafael Grossi from topRoster to prevent visible duplicate marker creation.
- Repairs missing/placeholder faces through curated fallbacks and Wikidata image lookups.
- Preserves existing AdSense IDs if recoverable from current files or git history.
- Creates ads.txt from the preserved publisher ID.
- Creates clean privacy, impressum, contact, about, methodology, and data-sources pages.
- Replaces daily and monthly workflows with valid multiline YAML.

Key reports after the run:
- data/diagnostics/LATEST_RUN_SUMMARY.md
- data/diagnostics/true-final-fix-report.json
- data/diagnostics/final-hard-audit-report.json
- data/diagnostics/adsense-preserve-audit-report.json

Daily workflow:
- ParleyMap nightly refresh
- Runs at 03:19 UTC.
- Runs the stabilizer and audit.

Monthly workflow:
- ParleyMap monthly roster review
- Runs at 04:31 UTC on day 1.
- Review-only. It does not mass-replace people.
