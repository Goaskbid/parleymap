import fs from 'node:fs';

const OUT = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
function readJson(path) { try { return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : null; } catch { return null; } }
function value(v) { return v === undefined || v === null ? 'n/a' : String(v); }
fs.mkdirSync('data/diagnostics', { recursive: true });
const rescue = readJson('data/diagnostics/final-rescue-report.json');
const audit = readJson('data/diagnostics/final-audit-report.json');
const holder = readJson('data/diagnostics/roster-current-holder-review.json');
const publish = readJson('data/diagnostics/publish-report.json');
const crawl = readJson('data/crawler/crawl-report.json');
const lines = [];
lines.push('# ParleyMap latest automated run');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Workflow: ${process.env.GITHUB_WORKFLOW || 'local'}`);
lines.push(`Run: ${process.env.GITHUB_RUN_NUMBER || 'local'}`);
lines.push('');
lines.push('## Safety status');
lines.push('');
lines.push(`- Final rescue: ${rescue?.status || 'n/a'}`);
lines.push(`- Final audit: ${audit?.status || 'n/a'}`);
lines.push(`- Runtime guard installed: ${value(audit?.runtimeGuardInstalled ?? rescue?.runtimeGuardInstalled)}`);
lines.push(`- Current-holder review: ${holder?.status || 'n/a'}`);
lines.push(`- Crawler publish: ${publish?.status || 'n/a'}`);
lines.push('');
const counts = audit?.counts || rescue?.finalCounts || holder?.after || publish?.after || {};
lines.push('## Counts');
lines.push('');
lines.push('| Dataset | Count |');
lines.push('|---|---:|');
for (const key of ['people','roster','topRoster','expansionRoster','appearances','categories']) lines.push(`| ${key} | ${value(counts[key])} |`);
if (rescue?.patchesByTarget) {
  lines.push('', '## Curated anchor patches', '');
  for (const [key, count] of Object.entries(rescue.patchesByTarget)) lines.push(`- ${key}: ${count}`);
}
if (audit?.findings) {
  lines.push('', '## Anchor audit', '');
  for (const [key, result] of Object.entries(audit.findings)) lines.push(`- ${key}: checked ${result.checked}, bad ${result.bad}`);
}
if (holder) {
  lines.push('', '## Current-holder review', '');
  lines.push(`- replacements: ${value(holder.replacementCount)}`);
  lines.push(`- added people: ${value(holder.addedPeopleCount)}`);
  lines.push(`- errors: ${value(holder.errors?.length)}`);
}
if (crawl) {
  lines.push('', '## Crawler report', '', '```json', JSON.stringify(crawl, null, 2).slice(0, 4000), '```');
}
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(lines.join('\n'));
