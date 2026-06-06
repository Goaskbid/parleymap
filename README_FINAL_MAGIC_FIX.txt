ParleyMap final safe integrity and AdSense repair

Upload the CONTENTS of this folder to the repository root:
.github
scripts
data
FALLBACK_WORKFLOW_FILES
README_FINAL_MAGIC_FIX.txt
AUDIT_RESULTS.txt
THREAD_RESCUE_PROMPT.txt

Then run the existing GitHub Action:
ParleyMap data validation

This package is intentionally built around that existing workflow name so that you do not need a new action to appear in the sidebar.

What it does:
1. Restores a full crawler-visible index.html from git history if current index.html is a thin one-line listing.
2. Uses data/demo.json or safe embedded data, never blindly injecting a partial JSON file.
3. Removes fake dated watch cards such as City of London, IAEA nuclear diplomacy watch, think-tank watch and royal diary watch.
4. Repairs critical institutional anchors and faces.
5. Removes duplicate-prone Rafael Grossi rows from topRoster and visible duplicate lists while keeping the canonical roster row.
6. Searches current files and git history for existing AdSense ca-pub and data-ad-slot values.
7. Writes ads.txt only from the preserved publisher ID.
8. Installs missing AdSense meta/loader/slot guard only with preserved IDs. It never invents IDs.
9. Installs a runtime Leaflet marker guard for critical anchors.
10. Fails before commit if hard data audit fails.

Outputs:
data/diagnostics/final-safe-repair-report.json
data/diagnostics/final-hard-audit-report.json
data/diagnostics/adsense-preserve-audit-report.json
data/diagnostics/LATEST_RUN_SUMMARY.md

Daily automation:
ParleyMap nightly refresh runs daily at 03:19 UTC. It is safe by design and does not generate synthetic events.

Monthly automation:
ParleyMap monthly roster review runs at 04:31 UTC on day 1. It is review-only and cannot mass-replace people.

If GitHub upload skips hidden .github:
Use the files in FALLBACK_WORKFLOW_FILES and create the workflow files manually.
