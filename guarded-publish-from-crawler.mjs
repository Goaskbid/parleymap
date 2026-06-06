#!/usr/bin/env node
import fs from 'node:fs';
import './parleymap-final-stabilize.mjs';

fs.mkdirSync('data/crawler', { recursive: true });
fs.mkdirSync('data/diagnostics', { recursive: true });
const reportPath = 'data/diagnostics/publish-report.json';
const approvedPath = 'data/crawler/quality-approved-appearances.json';
const rejectedPath = 'data/crawler/rejected-appearances.json';

const existing = fs.existsSync('data/crawler/publishable-appearances.json')
  ? JSON.parse(fs.readFileSync('data/crawler/publishable-appearances.json', 'utf8'))
  : [];

const rows = Array.isArray(existing) ? existing : (existing.appearances || existing.publishableAppearances || existing.records || []);
const rejectPattern = /city of london finance diplomacy|iaea nuclear diplomacy watch|think-tank leadership events watch|royal diaries|watch$|homepage|home page|faq|fact sheet|programme|programmation/i;
const approved = [];
const rejected = [];
for (const row of rows) {
  const text = [row?.title, row?.summary, row?.label, row?.location?.city, row?.location?.countryName].join(' ');
  if (!row || !row.id || !row.personId || !row.startsAt || !Array.isArray(row.sourcePack) || row.sourcePack.length === 0 || rejectPattern.test(text)) {
    rejected.push({ id: row?.id || null, title: row?.title || row?.label || null, reason: 'not a specific source-backed real public event' });
  } else {
    approved.push(row);
  }
}
fs.writeFileSync(approvedPath, JSON.stringify(approved, null, 2) + '\n');
fs.writeFileSync(rejectedPath, JSON.stringify(rejected, null, 2) + '\n');
fs.writeFileSync('data/crawler/publishable-appearances.json', JSON.stringify(approved, null, 2) + '\n');
const report = {
  generatedAt: new Date().toISOString(),
  status: approved.length ? 'approved_candidates_left_for_manual_publish' : 'no_approved_candidates_index_not_changed',
  candidateCount: rows.length,
  approved: approved.length,
  rejected: rejected.length,
  note: 'This publisher no longer fabricates generic watch events. It leaves index.html changes to the final stabilizer unless specific source-backed events are proven.'
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
