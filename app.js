#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'demo.json'), 'utf8'));
const outDir = path.join(root, 'data', 'crawler');
fs.mkdirSync(outDir, { recursive: true });
const expansion = data.expansionRoster || [];
const sourceWatch = data.structuredSourceWatch || [];
const languages = ['en','de','fr','es','pt','ru','zh','ar','ja','ko','it','tr'];
const intentTemplates = [
  'official biography', 'public schedule', 'travel', 'visit', 'speech', 'remarks', 'meeting readout', 'participant list', 'agenda', 'conference speaker', 'on the sidelines', 'telephone conversation'
];

const highYield = new Set(['FOREIGN_MINISTER','CENTRAL_BANK','INTERNATIONAL_ORG']);
const jobs = [];
for (const profile of expansion) {
  const priority = highYield.has(profile.category) ? 'daily' : /Royalty|Former/.test(profile.bucket || '') ? 'weekly' : 'weekly';
  const families = sourceFamiliesFor(profile);
  for (const family of families) {
    for (const lang of languages.slice(0, highYield.has(profile.category) ? 12 : 6)) {
      jobs.push({
        id: `${profile.id}-${family.id}-${lang}`,
        personId: profile.id,
        name: profile.name,
        role: profile.roleTitle,
        country: profile.countryName || profile.country,
        cadence: priority,
        language: lang,
        sourceFamily: family.id,
        sourceUrl: family.url || null,
        querySeeds: querySeeds(profile, lang, family),
        publicationGate: 'candidate only until person/date/city/public context are confirmed by official or host-public source',
        reject: ['live proximity','private address','hotel guess','aircraft tracking','family movement','unsourced sighting']
      });
    }
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  profiles: expansion.length,
  sourceFamilies: sourceWatch.length,
  languages: languages.length,
  jobs: jobs.length,
  notes: [
    'Profile-only names are no longer passive: every added person receives multilingual source-watch jobs.',
    'Official schedules, speeches, readouts and host-event pages are promotion sources; media and social posts are leads unless independently verified.',
    'The event-attendee graph can absorb new faces, topics, calls, trips and organisations every night.'
  ],
  topGroups: groupCounts(expansion)
};
fs.writeFileSync(path.join(outDir, 'priority-entity-expansion-jobs-v5.1.0.json'), JSON.stringify({ report, jobs }, null, 2));
console.log(`Priority entity expansion: ${report.jobs} jobs for ${report.profiles} added profiles across ${report.sourceFamilies} source families.`);

function sourceFamiliesFor(profile) {
  const role = `${profile.bucket || ''} ${profile.sector || ''} ${profile.roleTitle || ''}`.toLowerCase();
  const base = [];
  const add = (id) => { const f = sourceWatch.find(s => s.id === id); if (f && !base.some(x => x.id === f.id)) base.push(f); };
  if (/foreign minister|diplomacy/.test(role)) { add('state-secretary-travel'); add('india-mea'); add('russian-mfa-lavrov-speeches'); add('china-mfa-main'); }
  if (/central|g30|econom|finance|bank/.test(role)) { add('g30-current-members'); add('state-secretary-travel'); }
  if (/bilderberg|technology|business|capital|finance/.test(role)) add('bilderberg-current-participants');
  if (/think|policy|forum|trilateral/.test(role)) { add('trilateral-members'); add('wef-leadership'); }
  if (/open society|foundation|philanthropy/.test(role)) add('open-society-leadership');
  if (/iaea|nuclear/.test(role)) add('iaea-dg');
  if (/city of london|lady mayor|lord mayor/.test(role)) add('city-london-lord-mayor');
  if (/swiss|fdfa|federal/.test(role)) { add('swiss-fdfa'); add('swiss-presidency-2026'); }
  add('bilderberg-current-participants');
  add('g30-current-members');
  return base.slice(0, 5);
}
function querySeeds(p, lang, family) {
  const name = p.name;
  const quoted = `"${name}"`;
  const terms = intentTemplates.slice(0, /official|travel|mfa|state/.test(family.id) ? 12 : 8);
  return terms.map(t => `${quoted} ${t} ${p.countryName || p.country} ${lang}`).slice(0, 8);
}
function groupCounts(arr) {
  return arr.reduce((acc, p) => { const key = p.bucket || p.category || 'Other'; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
}
