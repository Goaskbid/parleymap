ParleyMap last fix instructions

Main route:
1. Extract this ZIP.
2. Upload these items to the GitHub repo root:
   .github
   scripts
   data
   FALLBACK_WORKFLOW_FILES
   nightly-refresh.mjs
   AUDIT_RESULTS.txt
   README_LAST_FIX.txt
   THREAD_RESCUE_PROMPT.txt
3. Commit directly to main with message:
   Install ParleyMap last audited fix
4. Go to Actions.
5. Run the existing workflow:
   ParleyMap nightly refresh

Do not look for a new workflow name. This package is designed to work through the existing ParleyMap nightly refresh action, because that action already appears in the sidebar and has write permission.

Why nightly refresh is the action to run:
- The existing nightly workflow calls scripts/validate-demo-data.mjs.
- This package replaces that script with a final stabilizer.
- The existing nightly workflow has repository write permission and a commit step.
- The package also replaces nightly-refresh.mjs with a safe no-op real-event gate, so no fake City of London or IAEA watch events are created.

Expected after running ParleyMap nightly refresh:
- Vincent Auriol is no longer active as a current French president.
- Claudia Sheinbaum is anchored to Mexico City.
- Pope Leo XIV is anchored to Vatican City.
- Prabowo Subianto is anchored to Jakarta.
- Rafael Grossi is anchored to Vienna.
- Duplicate visible Grossi markers from fake events are removed.
- Generic City of London / IAEA watch cards are removed as events.
- Missing or placeholder faces are replaced for curated critical profiles when possible.

Check these files after the run:
- data/diagnostics/LATEST_RUN_SUMMARY.md
- data/diagnostics/final-stabilize-report.json
- data/diagnostics/final-audit-report.json
- data/crawler/crawl-report.json

If workflow files still look wrong:
- The visible fallback workflow files are in FALLBACK_WORKFLOW_FILES.
- Replace .github/workflows/nightly-refresh.yml with the content of FALLBACK_WORKFLOW_FILES/UPLOAD_THIS_AS_.github_workflows_nightly-refresh.yml.

Daily automation after upload:
- ParleyMap nightly refresh runs daily at 03:19 UTC.
- It runs stabilization, prevents fake crawler events, audits, uploads artifacts, and commits.

Monthly automation after upload:
- ParleyMap monthly roster review runs on day 1 of each month at 04:31 UTC.
- It performs safe review only. It does not mass-replace people automatically.
- This prevents another historical-office-holder chain.
