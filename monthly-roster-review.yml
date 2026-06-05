name: ParleyMap monthly roster review

on:
  workflow_dispatch:
  schedule:
    - cron: "31 4 1 * *"

permissions:
  contents: write

concurrency:
  group: parleymap-monthly-roster-review
  cancel-in-progress: false

jobs:
  roster-review:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: main

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Validate current live embedded dataset
        run: node scripts/validate-demo-data.mjs

      - name: Force correct institutional anchors
        run: node scripts/fix-anchors-now.mjs

      - name: Run roster review diagnostics when available
        continue-on-error: true
        run: |
          if [ -f scripts/roster-review.mjs ]; then
            node scripts/roster-review.mjs || echo "roster review diagnostics failed"
          else
            mkdir -p data/diagnostics
            node - <<'NODE'
            const fs = require('fs');
            const report = {
              generatedAt: new Date().toISOString(),
              status: 'roster_review_script_not_present_anchor_hygiene_only',
              note: 'Monthly workflow ran anchor hygiene. Add scripts/roster-review.mjs for real people add/remove candidates.'
            };
            fs.writeFileSync('data/diagnostics/roster-review.json', JSON.stringify(report, null, 2) + '\n');
            fs.writeFileSync('data/diagnostics/roster-patch-candidates.json', JSON.stringify({ generatedAt: report.generatedAt, additions: [], possibleRemovalsOrRoleChanges: [], status: 'manual_review_required' }, null, 2) + '\n');
            NODE
          fi

      - name: Validate after monthly review
        run: node scripts/validate-demo-data.mjs

      - name: Add report to job summary
        if: always()
        run: |
          if [ -f data/diagnostics/LATEST_RUN_SUMMARY.md ]; then
            cat data/diagnostics/LATEST_RUN_SUMMARY.md >> "$GITHUB_STEP_SUMMARY"
          fi
          if [ -f data/diagnostics/roster-review.json ]; then
            echo "" >> "$GITHUB_STEP_SUMMARY"
            echo "## Roster review" >> "$GITHUB_STEP_SUMMARY"
            cat data/diagnostics/roster-review.json >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Show files changed before commit
        run: git diff --name-only

      - name: Upload downloadable run files
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: parleymap-run-files
          path: |
            data/diagnostics/*.json
            data/diagnostics/*.md
            data/crawler/*.json
          if-no-files-found: ignore

      - name: Commit roster review data
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Review ParleyMap roster and anchors"
          file_pattern: "index.html data/demo.json data/diagnostics/*.json data/diagnostics/*.md"
