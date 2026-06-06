PARLEYMAP FINAL RESCUE PACKAGE AUDIT

Checks run before release:

1. Node syntax check
   PASS scripts/parleymap-safe-rescue.mjs
   PASS scripts/parleymap-current-holder-review.mjs
   PASS scripts/parleymap-build-summary.mjs

2. Workflow YAML parse check with PyYAML
   PASS .github/workflows/parleymap-final-rescue-now.yml
   PASS .github/workflows/nightly-refresh.yml
   PASS .github/workflows/monthly-roster-review.yml
   PASS .github/workflows/roster-auto-update-now.yml

3. Workflow shape check
   PASS all workflow files are multiline files, not collapsed one-line YAML
   PASS final rescue workflow has workflow_dispatch
   PASS nightly workflow has workflow_dispatch and daily schedule
   PASS monthly roster workflow has workflow_dispatch and monthly schedule
   PASS roster auto update workflow is manual only

4. Mock repository dry run
   PASS created a mock ParleyMap dataset with:
        people = 94
        roster = 200
        topRoster = 100
        expansionRoster = 114
        appearances = 508
        categories = 11
   PASS created a polluted follow-up commit with people = 137
   PASS rescue script restored the last safe git-history index.html
   PASS people restored to 94
   PASS roster preserved at 200
   PASS expansionRoster preserved at 114
   PASS appearances preserved at 508
   PASS categories preserved at 11
   PASS Sheinbaum anchor audit passed
   PASS Pope Leo XIV anchor audit passed
   PASS Prabowo Subianto anchor audit passed
   PASS Rafael Grossi anchor audit passed
   PASS runtime Leaflet marker guard was inserted into index.html

Known design choices:
- The monthly roster workflow is safe review mode, not mass auto-publish mode.
- The manual roster auto-update workflow has strict safety gates.
- If more than 8 roster replacements or more than 5 people additions are detected, it writes diagnostics and refuses to publish.
- The rescue workflow restores from git history when the dataset is polluted above the safe people-count threshold.
