PARLEYMAP LAST STAND FIX

Upload the contents of this folder to the repository root:

.github
scripts
data
FALLBACK_WORKFLOW_FILES
AUDIT_RESULTS.txt
README_LAST_STAND.txt

Commit message:
Install ParleyMap last stand fix

FIRST RUN:
Use the existing visible workflow in the left sidebar:
ParleyMap data validation

This package deliberately replaces ParleyMap data validation with the final stabilization job, because that workflow already appears in the Actions sidebar. If a new ParleyMap final rescue now item appears, you may run that too, but it is not required.

After running ParleyMap data validation, wait for pages-build-deployment, then hard refresh the live site with Ctrl+F5.

WHAT IT DOES:
- Restores the last safe index.html from git history if data is polluted.
- Removes historical active leader pollution such as Vincent Auriol as a current president.
- Repairs anchors for Sheinbaum, Pope Leo XIV, Prabowo Subianto, Rafael Grossi, MBS, Guterres, Rutte, von der Leyen, Kallas, Georgieva, Banga, Tedros, Macron, Trump, Xi, and Modi.
- Removes non-real or generic event records such as City of London, homepage, FAQ, profile, fact sheet, and other non-events.
- Removes loose crawler records that do not pass event quality.
- Installs a runtime Leaflet marker guard for visible map marker correction.
- Restores faces only when image fields are missing or placeholder-like.
- Writes reports under data/diagnostics.

DAILY:
ParleyMap nightly refresh runs daily at 03:19 UTC.
It runs the stabilizer before and after crawler refresh and audits before commit.

MONTHLY:
ParleyMap monthly roster review runs on day 1 at 04:31 UTC.
It performs a safe current-holder review. It refuses historical chains and refuses bulk changes.

REPORTS:
- data/diagnostics/LATEST_RUN_SUMMARY.md
- data/diagnostics/final-stabilize-report.json
- data/diagnostics/final-audit-report.json
- data/diagnostics/roster-current-holder-review.json
- data/diagnostics/roster-patch-candidates.json

EXPORT:
Open any workflow run and download its artifact ZIP.
