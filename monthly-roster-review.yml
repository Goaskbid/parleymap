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
  monthly-roster-review:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - name: Checkout repository with history
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Repair canonical data before roster review
        run: node scripts/parleymap-canonical-governor.cjs repair --require-adsense-ready false

      - name: Run safe current-holder roster review
        run: node scripts/parleymap-safe-roster-review.cjs

      - name: Append summary
        if: always()
        run: |
          if [ -f data/diagnostics/LATEST_RUN_SUMMARY.md ]; then
            cat data/diagnostics/LATEST_RUN_SUMMARY.md >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Upload monthly roster diagnostics
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: parleymap-monthly-roster-files
          path: |
            index.html
            data/demo.json
            data/diagnostics/*.json
            data/diagnostics/*.md

      - name: Commit monthly roster review
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Review ParleyMap roster and canonical data"
          file_pattern: "index.html data/demo.json data/diagnostics/*.json data/diagnostics/*.md"
