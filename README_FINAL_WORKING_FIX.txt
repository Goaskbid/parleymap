import fs from 'node:fs';

const outDir = 'data/crawler';
fs.mkdirSync(outDir, { recursive: true });

const seeds = JSON.parse(fs.readFileSync('data/official-event-seeds.json', 'utf8')).events || [];

const publishable = seeds.map((seed) => ({
  id: seed.id,
  personName: seed.personName,
  personKey: seed.personKey,
  startsAt: seed.startsAt,
  status: seed.status,
  confidence: seed.confidence,
  confidenceLabel: seed.confidenceLabel,
  eventType: seed.eventType,
  title: seed.title,
  summary: seed.summary,
  location: seed.location,
  sourcePack: seed.sourcePack,
  topics: seed.topics || [],
  realEvent: true,
  sourcePolicy: 'official-source seed; no generic watch cards'
}));

const report = {
  generatedAt: new Date().toISOString(),
  status: 'official_source_seed_refresh_complete',
  policy: 'This refresh writes only official-source event seeds. It does not create generic watch cards.',
  sourcesScanned: seeds.length,
  candidateCount: publishable.length,
  publishableCount: publishable.length,
  blockedGenericWatchCards: true
};

fs.writeFileSync(`${outDir}/candidate-appearances.json`, JSON.stringify(publishable, null, 2) + '\n');
fs.writeFileSync(`${outDir}/publishable-appearances.json`, JSON.stringify(publishable, null, 2) + '\n');
fs.writeFileSync(`${outDir}/crawl-report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
