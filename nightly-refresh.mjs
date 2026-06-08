import fs from 'node:fs';

fs.mkdirSync('data/crawler', { recursive: true });
const now = new Date().toISOString();
const seedsPath = 'data/official-event-seeds.json';
let seeds = [];
if (fs.existsSync(seedsPath)) {
  const parsed = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
  seeds = Array.isArray(parsed.events) ? parsed.events : [];
}

const report = {
  generatedAt: now,
  status: 'safe_official_seed_refresh_only',
  note: 'This refresh does not create generic watch cards. Canonical repair handles official event insertion and hard audits.',
  officialSeedEventsAvailable: seeds.length,
  blockedSyntheticEventTypes: [
    'IAEA nuclear diplomacy watch',
    'City of London finance diplomacy watch',
    'Think-tank leadership events watch',
    'Royal diaries and state-visit watch',
    'generic source-watch cards'
  ]
};

fs.writeFileSync('data/crawler/crawl-report.json', JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync('data/crawler/candidate-appearances.json', '[]\n');
fs.writeFileSync('data/crawler/publishable-appearances.json', '[]\n');
console.log(JSON.stringify(report, null, 2));
