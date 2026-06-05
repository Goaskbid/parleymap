ParleyMap final rescue package

Upload the CONTENTS of this extracted folder to the repo root:

.github
scripts
README_FINAL_RESCUE.txt

Do not upload the parent folder itself.

Run first:
Actions > ParleyMap final rescue now > Run workflow

Wait for pages-build-deployment, then hard refresh parleymap.com with Ctrl+F5.

What it does:
1. Restores index.html from git history if the unsafe roster auto-update polluted people above the safe cap.
2. Repairs curated anchors and image fields for Sheinbaum, Pope Leo XIV, Prabowo, Rafael Grossi, and key institution leaders.
3. Patches matching appearance rows too, so duplicate markers for the same people are not left in wrong locations.
4. Installs a runtime Leaflet guard early in index.html.
5. Runs a hard audit. If any required target remains wrongly anchored, the workflow fails and does not commit.
6. Restores valid multiline nightly, monthly, and manual roster workflows.

Daily automation:
ParleyMap nightly refresh runs at 03:19 UTC daily.
It runs rescue and audit before and after crawler activity.

Monthly automation:
ParleyMap monthly roster review runs at 04:31 UTC on day 1 monthly.
It uses current Wikidata claims only, filters out claims with end dates, and refuses more than 8 roster replacements or 5 added people.

Manual people changer:
ParleyMap roster auto update now can be run manually.
It has the same guardrails as the monthly workflow.

See changes:
- Actions > latest run > Summary
- data/diagnostics/LATEST_RUN_SUMMARY.md
- data/diagnostics/final-rescue-report.json
- data/diagnostics/final-audit-report.json
- data/diagnostics/roster-current-holder-review.json

Download fixed files:
Open the workflow run and download the artifact ZIP.
