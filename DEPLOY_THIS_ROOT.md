
> parleymap-static@4.8.0 check
> npm run check:js && npm run validate:data && npm run crawl:24m:dry-run && npm run portraits:dry-run && npm run crawler:plan && npm run build && npm run crawl:heavy-hitters && npm run crawl:alerts && npm run crawl:influence-intel && npm run crawl:intelligence-plan


> parleymap-static@4.8.0 check:js
> node --check src/app.js && node --check scripts/build-standalone.mjs && node --check scripts/validate-data.mjs && node --check scripts/evergreen-crawl.mjs && node --check scripts/evergreen-roster-review.mjs && node --check scripts/nightly-refresh.mjs && node --check scripts/cache-portraits.mjs && node --check scripts/crawl-24-months.mjs && node --check scripts/review-top200.mjs && node --check scripts/evergreen-refresh.mjs && node --check scripts/roster-review.mjs && node --check connectors/wikimedia-portraits.mjs && node --check connectors/gdelt-doc.mjs && node --check connectors/official-source-registry.mjs && node --check scripts/foreign-minister-travel-index.mjs && node --check scripts/heavy-hitter-capture-plan.mjs && node --check scripts/influence-intelligence-plan.mjs && node --check scripts/alert-theme-graph-planner.mjs


> parleymap-static@4.8.0 validate:data
> node scripts/validate-data.mjs

Valid demo data: 94 people, 536 appearances, 64 encounters, 200 roster seeds.

> parleymap-static@4.8.0 crawl:24m:dry-run
> node scripts/crawl-24-months.mjs --dry-run

ParleyMap 24-month crawl dry-run: 0 candidates, 0 publishable.

> parleymap-static@4.8.0 portraits:dry-run
> node scripts/cache-portraits.mjs --dry-run

Portrait dry-run: 200 profiles, 25 preview rows written.

> parleymap-static@4.8.0 crawler:plan
> node scripts/evergreen-refresh.mjs --dry-run --offline --backfill --months=24 --max-people=200

ParleyMap evergreen refresh: dry-run; 4800 backfill jobs planned; 0 leads; 0 publishable candidates.

> parleymap-static@4.8.0 build
> node scripts/build-standalone.mjs

Built index.html

> parleymap-static@4.8.0 crawl:heavy-hitters
> node scripts/heavy-hitter-capture-plan.mjs

Heavy-hitter capture plan: 14410 jobs for 174 heavy-hitter targets across 30 event families.

> parleymap-static@4.8.0 crawl:alerts
> node scripts/alert-theme-graph-planner.mjs

Alert/theme graph planner: 232 jobs for 28 event families, 7 topics and 8 organizations.

> parleymap-static@4.8.0 crawl:influence-intel
> node scripts/influence-intelligence-plan.mjs

Influence intelligence planner: 33600 planned jobs for 200 people across 14 source families and 12 languages.

> parleymap-static@4.8.0 crawl:intelligence-plan
> node scripts/influence-intelligence-plan.mjs

Influence intelligence planner: 33600 planned jobs for 200 people across 14 source families and 12 languages.
