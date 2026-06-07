ParleyMap final institutional rescue package

Purpose
- Restore a full crawlable index.html if the current one is thin.
- Repair institutional anchors where the app stores them across profile-like collections.
- Remove duplicate visible helper rows, especially Rafael Grossi duplicates.
- Remove non-events such as City of London finance diplomacy watch, IAEA nuclear diplomacy watch, think-tank watch and royal diary watch cards.
- Add a small set of official-source appearances for documented travel/meetings.
- Preserve recoverable AdSense IDs and create ads.txt from the recovered publisher ID.
- Replace broken one-line workflow files with multiline GitHub Actions YAML.

First workflow to run
Actions > ParleyMap data validation > Run workflow

Optional inputs
- publisher_id: use ca-pub-... or pub-... only if the workflow says IDs could not be recovered.
- header_slot_id: use your existing header slot only if the workflow says it could not recover it.
- sidebar_slot_id: use your existing sidebar slot only if the workflow says it could not recover it.

Reports
- data/diagnostics/LATEST_RUN_SUMMARY.md
- data/diagnostics/institutional-rescue-report.json
- data/diagnostics/institutional-hard-audit-report.json
- data/diagnostics/adsense-preserve-audit-report.json

Hard pass criteria
- institutional-hard-audit-report.json has status audit_passed.
- Rafael Grossi is not in expansionRoster, topRoster, priorityExpansion, watchlistExamples or frequentTravellerExpansion.
- Fake watch rows are gone.
- adsense-preserve-audit-report.json lists the recovered client, publisher ID, header slot and sidebar slot if they exist in current files or git history.

Daily and monthly
- ParleyMap nightly refresh runs at 03:19 UTC and uses the same rescue path.
- ParleyMap monthly roster review runs at 04:31 UTC on day 1 and is safe review only. It does not mass-replace people.
