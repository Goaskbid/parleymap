ParleyMap people changer package

Upload these extracted items at the repo root:

.github
scripts
README_PEOPLE_CHANGER.txt

Commit directly to main:

Add ParleyMap people changer roster update

Then run:

Actions > ParleyMap roster auto update now > Run workflow

What it does:

- Reads the live embedded dataset from index.html.
- Checks country head-of-state and head-of-government offices using Wikidata P35 and P6.
- If a roster leader has died or is no longer the current office holder, it replaces that roster slot with the current holder.
- It updates roster and topRoster in place.
- It adds the new current holder to people when needed.
- It keeps old people rows when they have appearances, so old appearance records do not become orphaned.
- It writes data/diagnostics/roster-auto-update-report.json.
- It writes data/diagnostics/roster-patch-candidates.json.
- It uploads downloadable artifacts after every run.

Monthly automation:

The package replaces .github/workflows/monthly-roster-review.yml.
It runs automatically at 04:31 UTC on the first day of every month.

Manual run:

Use ParleyMap roster auto update now.

Reports:

data/diagnostics/roster-auto-update-report.json
data/diagnostics/roster-patch-candidates.json
data/diagnostics/LATEST_RUN_SUMMARY.md

Artifacts:

Open the workflow run and download parleymap-roster-auto-update-files or parleymap-monthly-roster-files.
