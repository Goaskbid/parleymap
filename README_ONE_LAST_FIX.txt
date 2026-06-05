ParleyMap one-last-fix package

Upload these folders and files to the repository root:

.github
scripts
README_ONE_LAST_FIX.txt

Commit message:
Fix ParleyMap anchor guard and automation

Run this first:
Actions > ParleyMap anchor guard now > Run workflow

After it succeeds, wait for pages-build-deployment to succeed, then hard refresh parleymap.com with Ctrl+F5.

What the anchor guard does:
- patches embedded demo-data in index.html
- patches data/demo.json
- patches profile, roster, topRoster, expansionRoster and appearance records matching the target people
- installs a runtime Leaflet marker guard before the app scripts run
- writes data/diagnostics/anchor-guard-report.json
- writes data/diagnostics/LATEST_RUN_SUMMARY.md
- uploads an artifact named parleymap-fixed-files

Targets included:
- Claudia Sheinbaum -> Mexico City
- Pope Leo XIV -> Vatican City
- Prabowo Subianto -> Jakarta
- Mohammed bin Salman -> Riyadh
- Rafael Grossi -> Vienna IAEA
- Antonio Guterres -> New York UN
- Mark Rutte -> Brussels NATO
- Ursula von der Leyen -> Brussels
- Kaja Kallas -> Brussels
- Kristalina Georgieva -> Washington IMF
- Ajay Banga -> Washington World Bank

Daily automation:
ParleyMap nightly refresh runs at 03:19 UTC and manually.
It validates, audits anchors before import, runs bounded crawler if available, guard-publishes if publisher exists, audits anchors again, validates, uploads artifact, commits reports.

Monthly automation:
ParleyMap monthly roster review runs at 04:31 UTC on the first day of each month and manually.
It validates, audits anchors, writes roster-review.json and roster-patch-candidates.json, validates, uploads artifact, commits reports.

To see what changed:
- Open the workflow run Summary.
- Open data/diagnostics/LATEST_RUN_SUMMARY.md.
- Open data/diagnostics/anchor-guard-report.json.
- Open data/diagnostics/roster-review.json after monthly review.

To save files locally:
- Open the workflow run.
- Download the artifact named parleymap-fixed-files, parleymap-run-files, or parleymap-roster-review-files.
- Or use Code > Download ZIP for the full repo.
