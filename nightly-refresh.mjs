Audit results for parleymap_final_working.zip
=============================================

Static checks
-------------
PASS node --check scripts/parleymap-canonical-rescue.cjs
PASS node --check scripts/parleymap-safe-roster-review.cjs
PASS node --check nightly-refresh.mjs
PASS YAML parse .github/workflows/data-validate.yml
PASS YAML parse .github/workflows/nightly-refresh.yml
PASS YAML parse .github/workflows/monthly-roster-review.yml
PASS YAML parse .github/workflows/roster-auto-update-now.yml

Mock repository dry run
-----------------------
PASS mock repo started with full historical index.html and current broken one-line index.html.
PASS canonical rescue recovered the safe full index.html from git history.
PASS people stayed 94.
PASS expansionRoster stayed 114.
PASS categories stayed 11.
PASS IAEA nuclear diplomacy watch was removed.
PASS City of London finance diplomacy watch was removed.
PASS Think-tank leadership events watch was removed.
PASS Royal diaries and state-visit watch was removed.
PASS official-source events were added while fake events were removed.
PASS Rafael Grossi was repaired to Austria / Vienna.
PASS Rafael Grossi no longer had IA or BI as location/flag code.
PASS Grossi duplicate helper rows were removed from topRoster in the mock.
PASS Pope Leo XIV was repaired to Vatican City.
PASS Claudia Sheinbaum was repaired to Mexico City.
PASS Prabowo Subianto was repaired to Jakarta.
PASS AdSense ca-pub client was preserved.
PASS header slot was preserved.
PASS sidebar slot was preserved.
PASS ads.txt was generated from the preserved publisher ID.
PASS runtime Leaflet/data guard was inserted.
PASS canonical-hard-audit-report.json returned status audit_passed.

Mock output summary
-------------------
canonical_rescue_applied
audit_passed
adsense_preserved_and_audited
