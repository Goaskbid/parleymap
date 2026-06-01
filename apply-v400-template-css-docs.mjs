#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const data = readJson(path.join(root, 'data/demo.json'), { people: [], roster: [] });
const cfg = readJson(path.join(root, 'data/heavy-hitter-search-expansion-v3.8.0.json'), { eventFamilies: [], nativeSearchPhrases: {}, priorityPeopleHints: [] });
const registry = readJson(path.join(root, 'data/source-registry.json'), { sources: [], eventAgendaSources: [], eventAttendeeSources: [] });
const outDir = path.join(root, 'data/crawler');
fs.mkdirSync(outDir, { recursive: true });

const roster = dedupePeople([...(data.roster || []), ...(data.expansionRoster || []), ...(data.people || []).map((p) => ({
  id: p.id,
  name: p.canonicalName || p.name,
  roleTitle: p.roleTitle || p.role,
  organization: p.organization,
  countryCode: p.countryCode || p.countryFocus,
  sector: p.sector,
  bucket: p.category
}))]);

const sourceFamilies = [
  { id: 'official-schedule', label: 'official schedule and calendar', cadence: 'nightly', publicationLane: 'high-confidence' },
  { id: 'foreign-ministry-readouts', label: 'foreign ministry readouts and trip releases', cadence: 'nightly', publicationLane: 'high-confidence' },
  { id: 'protocol-office', label: 'protocol office and presidency/chancellery pages', cadence: 'nightly', publicationLane: 'high-confidence' },
  { id: 'central-bank-speeches', label: 'central bank calendars and speech pages', cadence: 'nightly', publicationLane: 'high-confidence' },
  { id: 'summit-host', label: 'summit host pages and participant lists', cadence: 'nightly', publicationLane: 'high-confidence' },
  { id: 'conference-agenda', label: 'conference agendas, PDFs and speaker lists', cadence: 'weekly', publicationLane: 'review' },
  { id: 'university-thinktank', label: 'university and think tank event pages', cadence: 'weekly', publicationLane: 'review' },
  { id: 'corporate-ir-sec', label: 'corporate IR, SEC filings and annual reports', cadence: 'weekly', publicationLane: 'review' },
  { id: 'official-video', label: 'official livestream and YouTube metadata', cadence: 'weekly', publicationLane: 'review' },
  { id: 'verified-social-leads', label: 'verified X/LinkedIn/social posts', cadence: 'nightly', publicationLane: 'lead-only' },
  { id: 'local-media-leads', label: 'local media and regional TV captions', cadence: 'nightly', publicationLane: 'lead-only' },
  { id: 'security-notice-leads', label: 'public event security notices, road closures and police advisories', cadence: 'nightly', publicationLane: 'lead-only' }
];

const rolePatterns = [
  /president|prime minister|chancellor|head of state|head of government|king|queen|crown prince|royal/i,
  /foreign minister|secretary of state|external affairs|foreign secretary|high representative|minister of foreign/i,
  /defen[cs]e minister|security|nato|military|general/i,
  /finance minister|treasury|central bank|federal reserve|ecb|bank of england|bank of japan|bis|monetary|governor/i,
  /imf|world bank|oecd|wto|who|united nations|un |opec|gavi|wef|bilderberg|group of thirty|g30/i,
  /ceo|chair|founder|investor|asset|blackrock|blackstone|jpmorgan|goldman|morgan stanley|sovereign|wealth|technology|ai|energy|media/i
];

const priorityNames = new Set((cfg.priorityPeopleHints || []).map(norm));
const targets = roster.filter((p) => {
  const hay = [p.name, p.roleTitle, p.organization, p.sector, p.bucket, p.countryCode].map(String).join(' ');
  return priorityNames.has(norm(p.name)) || rolePatterns.some((rx) => rx.test(hay));
});

const jobs = [];
for (const person of targets) {
  const role = classify(person);
  const country = person.countryCode || person.countryFocus || person.country || '';
  const nativeTerms = relevantLanguageCodes(country).flatMap((lang) => (cfg.nativeSearchPhrases?.[lang] || []).slice(0, 10));
  for (const source of sourceFamilies) {
    if (source.publicationLane === 'high-confidence' || shouldUseLeadSource(person, source)) {
      jobs.push({
        person: person.name,
        country,
        role,
        sourceFamily: source.label,
        cadence: source.cadence,
        publicationLane: source.publicationLane,
        querySeeds: buildQuerySeeds(person, source, nativeTerms),
        safetyGate: source.publicationLane === 'lead-only' ? 'lead-only: promote only after person/date/city/public-context source pack' : 'publish candidate after sensitive-location rejection and dedupe'
      });
    }
  }
  for (const event of cfg.eventFamilies || []) {
    if (eventMatch(person, event, role)) {
      jobs.push({
        person: person.name,
        country,
        role,
        event: event.name,
        eventCategory: event.category,
        priority: event.priority,
        publicationLane: 'event-attendee-graph',
        querySeeds: buildEventSeeds(person, event, nativeTerms),
        safetyGate: 'attendance edge only after official/organiser/source-pack confirmation'
      });
    }
  }
}

const registrySources = [ ...(registry.sources || []), ...(registry.eventAgendaSources || []), ...(registry.eventAttendeeSources || []) ];
const officialWatchJobs = targets.flatMap((person) => registrySources.slice(0, 120).map((source) => ({
  person: person.name,
  country: person.countryCode || person.country || '',
  source: source.name || source.label || source.id,
  url: source.url || source.homepage || '',
  type: source.type || 'registry-source',
  cadence: source.cadence || 'weekly',
  safetyGate: 'registry watch; never publish without source pack'
}))).slice(0, 10000);

const report = {
  generatedAt: new Date().toISOString(),
  version: cfg.version || '3.8.0',
  rosterProfiles: roster.length,
  heavyHitterTargets: targets.length,
  sourceFamilies: sourceFamilies.length,
  eventFamilies: (cfg.eventFamilies || []).length,
  multilingualPhrases: Object.values(cfg.nativeSearchPhrases || {}).reduce((sum, arr) => sum + arr.length, 0),
  plannedDeepSearchJobs: jobs.length,
  plannedRegistryWatchJobs: officialWatchJobs.length,
  totalPlannedJobs: jobs.length + officialWatchJobs.length,
  jobs,
  registryWatchJobs: officialWatchJobs,
  publicationBoundary: cfg.publicationBoundary,
  note: 'Planner only. Networked crawler fetches pages, extracts person/date/city/context, deduplicates, scores confidence, rejects sensitive/private signals, and promotes only verified public records.'
};

fs.writeFileSync(path.join(outDir, 'heavy-hitter-capture-plan-v3.8.0.json'), JSON.stringify(report, null, 2));
console.log(`Heavy-hitter capture plan: ${report.totalPlannedJobs} jobs for ${report.heavyHitterTargets} heavy-hitter targets across ${report.eventFamilies} event families.`);

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function norm(v) { return String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function dedupePeople(list) {
  const m = new Map();
  for (const p of list) {
    const name = p.name || p.canonicalName;
    if (!name) continue;
    const key = norm(name);
    if (!m.has(key)) m.set(key, { ...p, name });
  }
  return [...m.values()];
}
function classify(p) {
  const hay = [p.roleTitle, p.organization, p.sector, p.bucket, p.name].join(' ');
  if (/foreign minister|secretary of state|external affairs|foreign secretary|high representative/i.test(hay)) return 'foreign-policy principal';
  if (/central bank|federal reserve|ecb|bank of england|bank of japan|bis|monetary|governor/i.test(hay)) return 'central banking';
  if (/finance minister|treasury|imf|world bank|asset|blackrock|blackstone|bank|investor|sovereign/i.test(hay)) return 'finance/capital';
  if (/ceo|founder|technology|ai|software|semiconductor|media/i.test(hay)) return 'corporate/technology';
  if (/nato|defence|defense|security|military/i.test(hay)) return 'security';
  if (/king|queen|prince|royal/i.test(hay)) return 'royalty';
  if (/united nations|oecd|wto|who|opec|wef|bilderberg|g30|group of thirty/i.test(hay)) return 'institutional connector';
  return 'political leader';
}
function relevantLanguageCodes(country) {
  const c = String(country || '').toUpperCase();
  const map = { CN: ['zh','en'], RU: ['ru','en'], SA: ['ar','en'], AE: ['ar','en'], QA: ['ar','en'], EG: ['ar','en'], FR: ['fr','en'], DE: ['de','en'], ES: ['es','en'], BR: ['pt','en'], PT: ['pt','en'], JP: ['ja','en'], KR: ['ko','en'], IT: ['it','en'], TR: ['tr','en'] };
  return map[c] || ['en'];
}
function shouldUseLeadSource(person, source) {
  const hay = [person.name, person.roleTitle, person.organization, person.sector, person.bucket].join(' ');
  if (source.id === 'security-notice-leads') return /president|prime minister|foreign minister|secretary|king|queen|crown prince|nato|defen[cs]e|central bank/i.test(hay);
  return true;
}
function buildQuerySeeds(person, source, terms) {
  const base = [`"${person.name}"`, person.organization, person.roleTitle].filter(Boolean).slice(0, 3);
  const termPart = terms.slice(0, 4);
  return [...base, ...termPart, source.id].filter(Boolean).slice(0, 8);
}
function buildEventSeeds(person, event, terms) {
  return [`"${person.name}"`, `"${event.name}"`, 'speaker', 'attended', 'on the sidelines', ...terms.slice(0, 3)].slice(0, 8);
}
function eventMatch(person, event, role) {
  const hay = [person.name, person.roleTitle, person.organization, person.sector, person.bucket, role].join(' ');
  if (/central bank|monetary|finance/i.test(role) && /Jackson Hole|BIS|ECB|FOMC|IMF|World Bank|Group of Thirty/i.test(event.name)) return true;
  if (/foreign|political|security|royalty/i.test(role) && /G7|G20|BRICS|APEC|UN|COP|NATO|Munich|Shangri|Raisina|Bilderberg/i.test(event.name)) return true;
  if (/corporate|technology|finance|capital|connector/i.test(role) && /Davos|Bilderberg|Boao|Ambrosetti|Sun Valley|CES|Milken|Future Investment|CERAWeek|ADIPEC|Paris Air Show|Farnborough/i.test(event.name)) return true;
  if (/institutional/i.test(role)) return true;
  return /Davos|UN General Assembly|G20|Bilderberg/i.test(event.name);
}
