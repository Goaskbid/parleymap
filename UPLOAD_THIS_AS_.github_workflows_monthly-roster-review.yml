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
  review:
    runs-on: ubuntu-latest
    timeout-minutes: 20
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

      - name: Stabilize anchors before roster review
        run: node scripts/parleymap-institutional-rescue.cjs

      - name: Run safe roster review diagnostics
        run: node scripts/parleymap-safe-roster-review.cjs

      - name: Add summary to workflow page
        if: always()
        run: |
          if [ -f data/diagnostics/LATEST_RUN_SUMMARY.md ]; then
            cat data/diagnostics/LATEST_RUN_SUMMARY.md >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Upload roster review files
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: parleymap-monthly-roster-files
          path: |
            index.html
            data/demo.json
            data/diagnostics/*.json
            data/diagnostics/*.md

      - name: Commit roster review diagnostics
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Review ParleyMap roster safely"
          file_pattern: "index.html data/demo.json data/diagnostics/*.json data/diagnostics/*.md"
