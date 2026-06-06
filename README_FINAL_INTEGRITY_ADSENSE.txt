ParleyMap final integrity + AdSense preservation package

Purpose
- Repair the live embedded demo-data safely.
- Remove fake dated watch/index cards.
- Restore the last safe index.html from git history if the current file is thin or polluted.
- Preserve existing AdSense publisher and slot IDs already present in index.html or git history.
- Create ads.txt only from the existing publisher ID. No fake publisher or slot IDs are invented.
- Replace the existing visible workflows rather than relying on a new workflow name.

First run
1. Upload the contents of this extracted folder to the repository root:
   .github
   scripts
   data
   nightly-refresh.mjs
   FALLBACK_WORKFLOW_FILES
   AUDIT_RESULTS.txt
   README_FINAL_INTEGRITY_ADSENSE.txt
   THREAD_RESCUE_PROMPT.txt
2. Commit directly to main.
3. Run the existing workflow: ParleyMap data validation.
4. Wait for pages-build-deployment.
5. Hard refresh parleymap.com with Ctrl+F5.

Why this does not corrupt index.html
- It never overwrites the whole file with data/demo.json.
- It extracts and replaces only the JSON inside <script id="demo-data" type="application/json">.
- If index.html is thin or polluted, it restores the newest safe full index.html from git history, requiring people, roster, expansionRoster, appearances, and categories to pass count gates.
- It fails before commit if hard audit fails.

AdSense behavior
- It detects existing ca-pub and data-ad-slot values in index.html.
- If the current index.html is thin, it searches git history for the latest valid AdSense setup and transplants only the same publisher and slot IDs.
- It creates ads.txt using the existing publisher ID.
- It does not replace existing slot IDs.
- If no publisher or fewer than two slots are found in current index.html or git history, it fails rather than inventing IDs.

Daily automation
- ParleyMap nightly refresh runs at 03:19 UTC.
- It stabilizes data, preserves AdSense, runs a safe no-invented-events refresh, stabilizes again, audits, uploads artifacts, and commits only if audit passes.

Monthly automation
- ParleyMap monthly roster review runs at 04:31 UTC on day 1.
- It performs current-holder review in diagnostics only. It does not mass-replace people.
- This is intentional after the historical-office-holder pollution incident.

Where to see results
- Actions > latest run > Summary
- data/diagnostics/LATEST_RUN_SUMMARY.md
- data/diagnostics/integrity-rescue-report.json
- data/diagnostics/adsense-preserve-audit-report.json
- data/diagnostics/final-hard-audit-report.json
- data/diagnostics/roster-current-holder-review.json
- data/diagnostics/roster-patch-candidates.json

How to save fixed files locally
- Actions > open the run > Artifacts > download the ZIP artifact.
- Or Code > Download ZIP for the whole repo.
