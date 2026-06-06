#!/usr/bin/env node
import fs from 'node:fs';

fs.mkdirSync('data/crawler', { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  status: 'safe_noop_real_event_gate',
  mode: 'real-event-gated-noop',
  candidates: 0,
  publishable: 0,
  sourcesScanned: 0,
  notes: [
    'Generic watch cards, office homepages, fact sheets, FAQ pages, and diary placeholders are not events.',
    'No crawler record is published unless it is a specific source-backed public appearance with date, city, person, and sourcePack.',
    'This safe no-op prevents fabricated City of London / IAEA watch events while the source registry is reviewed.'
  ]
};
fs.writeFileSync('data/crawler/candidate-appearances.json', '[]\n');
fs.writeFileSync('data/crawler/publishable-appearances.json', '[]\n');
fs.writeFileSync('data/crawler/quality-approved-appearances.json', '[]\n');
fs.writeFileSync('data/crawler/rejected-appearances.json', '[]\n');
fs.writeFileSync('data/crawler/crawl-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
