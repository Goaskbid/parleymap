import fs from 'node:fs';

fs.mkdirSync('data/crawler', { recursive: true });
const now = new Date().toISOString();
const report = {
  generatedAt: now,
  status: 'safe_no_invented_events',
  note: 'This replacement nightly refresh deliberately does not create generic watch/index cards. Official-source ingestion should be added only through validated candidate files.',
  candidates: 0,
  publishable: 0
};
fs.writeFileSync('data/crawler/crawl-report.json', JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync('data/crawler/candidate-appearances.json', '[]\n');
fs.writeFileSync('data/crawler/publishable-appearances.json', '[]\n');
console.log(JSON.stringify(report, null, 2));
