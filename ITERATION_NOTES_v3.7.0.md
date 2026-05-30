# Frequent Traveller Capture Plan

ParleyMap should prioritise people with dense public records rather than static prestige names. The highest-yield sources are official travel indexes, speech pages, public schedules, foreign-minister readouts, public phone-call readouts and participant lists.

## Priority source families

1. Foreign ministry travel indexes: State Department, India MEA, GOV.UK / FCDO, France Diplomatie, Global Affairs Canada, German Foreign Office, Japan MOFA, Italy MFA, Australia DFAT, China MFA, Russian MFA, Brazil MRE, Iran MFA, Turkey MFA and South Africa DIRCO.
2. Ministerial readouts: bilateral meetings, phone calls, side meetings, joint statements and schedule pages.
3. Event participant lists: Bilderberg, WEF/Davos, Munich Security, G7/G20/BRICS, Quad, Jackson Hole, BIS, IMF/World Bank, Group of Thirty, FII, Milken and OPEC.
4. Public social accounts: official X/social accounts are discovery inputs only. A social post can become a source pack if the account is official and the post states person, date and city.

## Ranking shift

Frequent-traveller score should weigh verified public stops, countries, counterpart diversity, event density and recency. Static profiles remain searchable, but opening maps and roadmovies should favour moving nodes.

## Current planner

`npm run crawl:foreign-ministers` writes `data/crawler/foreign-minister-travel-index-plan.json`.

Current plan: 367 jobs for 68 frequent-traveller profiles across 26 high-yield source families.
