name: ParleyMap nightly refresh

on:
  workflow_dispatch:
  schedule:
    - cron: "19 3 * * *"

permissions:
  contents: write

concurrency:
  group: parleymap-nightly-refresh
  cancel-in-progress: false

jobs:
  refresh-and-publish:
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

      - name: Force correct institutional anchors before refresh
        run: node scripts/fix-anchors-now.mjs

      - name: Run bounded crawler
        continue-on-error: true
        run: |
          if [ -f nightly-refresh.mjs ]; then
            timeout 12m node nightly-refresh.mjs --max-roster 60 --max-per-person 2 --max-pages-per-source 8 --lookback-days 21 || echo "crawler failed or timed out"
          else
            echo "nightly-refresh.mjs not found"
          fi
        env:
          PARLEYMAP_FETCH_TIMEOUT_MS: "3000"

      - name: Guard and publish crawler output when available
        continue-on-error: true
        run: |
          if [ -f scripts/guarded-publish-from-crawler.mjs ]; then
            node scripts/guarded-publish-from-crawler.mjs || echo "guarded publish produced no website change"
          else
            echo "guarded publisher not found"
          fi

      - name: Strict audit crawler output when available
        continue-on-error: true
        run: |
          if [ -f scripts/strict-crawler-audit.mjs ]; then
            node scripts/strict-crawler-audit.mjs || echo "strict crawler audit did not complete"
          else
            echo "strict crawler audit not found"
          fi

      - name: Force correct institutional anchors after refresh
        run: node scripts/fix-anchors-now.mjs

      - name: Validate final index.html
        run: node scripts/validate-demo-data.mjs

      - name: Add report to job summary
        if: always()
        run: |
          if [ -f data/diagnostics/LATEST_RUN_SUMMARY.md ]; then
            cat data/diagnostics/LATEST_RUN_SUMMARY.md >> "$GITHUB_STEP_SUMMARY"
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

      - name: Commit refreshed website data
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Refresh ParleyMap guarded data"
          file_pattern: "index.html data/demo.json data/crawler/*.json data/diagnostics/*.json data/diagnostics/*.md"
