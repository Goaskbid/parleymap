#!/usr/bin/env node
import fs from 'node:fs';
const files = [
  'data/diagnostics/LATEST_RUN_SUMMARY.md',
  'data/diagnostics/final-stabilize-report.json',
  'data/diagnostics/final-audit-report.json',
  'data/crawler/crawl-report.json',
  'data/diagnostics/roster-current-holder-review.json',
  'data/diagnostics/roster-patch-candidates.json'
];
fs.mkdirSync('data/diagnostics', { recursive: true });
if (!fs.existsSync('data/diagnostics/LATEST_RUN_SUMMARY.md')) {
  fs.writeFileSync('data/diagnostics/LATEST_RUN_SUMMARY.md', '# ParleyMap run summary\n\nNo detailed summary was produced.\n');
}
for (const file of files) {
  if (fs.existsSync(file)) {
    console.log(`--- ${file} ---`);
    console.log(fs.readFileSync(file, 'utf8').slice(0, 12000));
  }
}
