ParleyMap final fix package

Upload these folders to the repository root:
- .github
- scripts

Then commit to main with:
Fix ParleyMap anchors and restore workflows

Run this workflow first:
ParleyMap fix anchors now

Then wait for pages-build-deployment to finish and hard refresh parleymap.com with Ctrl+F5.

Expected fixed anchors:
- Claudia Sheinbaum -> Mexico City, Mexico
- Pope Leo XIV -> Vatican City
- Prabowo Subianto -> Jakarta, Indonesia
- Mohammed bin Salman -> Riyadh, Saudi Arabia

Reports:
- data/diagnostics/final-anchor-fix-report.json
- data/diagnostics/LATEST_RUN_SUMMARY.md
- data/diagnostics/roster-review.json
- data/diagnostics/roster-patch-candidates.json

Schedules:
- Nightly refresh: every day at 03:19 UTC
- Monthly roster review: first day of each month at 04:31 UTC

Every workflow run uploads downloadable run files as the artifact named parleymap-run-files.
