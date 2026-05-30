#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/demo.json'), 'utf8'));
const sourceData = JSON.parse(fs.readFileSync(path.join(root, 'data/source-registry.json'), 'utf8'));
const sources = sourceData.sources || [];
const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const roster = data.roster || [];
const mapped = data.people || [];
const targetTerms = /foreign minister|secretary of state|external affairs|foreign secretary|high representative|prime minister|president|vice president|central bank|federal reserve|ecb|bis|g30|bilderberg|world economic forum|davos|opec|akdn|aga khan|rothschild|sovereign|finance minister|treasury/i;
const people = [...new Map([...roster, ...mapped.map((p) => ({ ...p, name: p.canonicalName || p.name, countryFocus: p.countryFocus || p.countryFocusCode }))]
  .filter((p) => targetTerms.test([p.name, p.bucket, p.roleTitle, p.organization, p.sector, p.category].join(' ')))
  .map((p) => [norm(p.name || p.canonicalName), p])).values()];
const targetSources = sources.filter((s) => /travel_index|activity_index|speech_index|participant_lists|social_discovery/i.test(s.type || ''));
const jobs = [];
function addJob(person, source, reason) {
  jobs.push({ person: person.name || person.canonicalName, countryFocus: person.countryFocus || person.countryCode || person.country, source: source.name, url: source.url, mode: source.type, cadence: source.cadence || 'nightly', reason });
}
for (const person of people) {
  const hay = norm([person.name, person.bucket, person.roleTitle, person.organization, person.sector, person.countryFocus, person.country, person.countryName].join(' '));
  let matched = 0;
  for (const source of targetSources) {
    const hints = [...(source.peopleHints || []), ...(source.countryCodes || []), source.name].map(norm).filter(Boolean);
    const sourceHay = norm([source.name, source.type, source.note, source.url].join(' '));
    const country = norm(person.countryFocus || person.countryCode || person.country || person.countryName || '');
    const countryMatch = (source.countryCodes || []).map(norm).includes(country) || (country === 'gb' && (source.countryCodes || []).includes('GB'));
    const personMatch = hints.some((h) => h.length > 2 && (hay.includes(h) || h.includes(norm(person.name || person.canonicalName))));
    const isHostEvent = /participant_lists/.test(source.type || '');
    const isSpeech = /speech_index/.test(source.type || '');
    const isOfficialActivity = /travel_index|activity_index/.test(source.type || '');
    const personIsFinance = /central bank|federal reserve|ecb|bis|g30|finance|treasury|imf|world bank|asset|banking/i.test(hay);
    const personIsConnector = /bilderberg|davos|world economic forum|milken|g30|akdn|aga khan|rothschild|opec|energy|sovereign/i.test(hay);
    const sourceIsFinanceSpeech = /federal reserve|ecb|bis|bank|g30|imf|world bank/.test(sourceHay);
    const usableCountryMatch = countryMatch && (isOfficialActivity || (isSpeech && personIsFinance && sourceIsFinanceSpeech));
    const categoryMatch = (isHostEvent && (personIsConnector || personIsFinance || /foreign minister|secretary of state|high representative|president|prime minister/i.test(hay))) || (isSpeech && sourceIsFinanceSpeech && personIsFinance);
    if (usableCountryMatch || personMatch || categoryMatch) {
      addJob(person, source, usableCountryMatch ? 'country/source match' : personMatch ? 'named-source match' : 'event/speech watch match');
      matched++;
    }
  }
  if (!matched) {
    addJob(person, { name: 'Targeted official-source search pattern', url: 'generated:official-domain-search', type: 'official_discovery_pattern', cadence: 'nightly' }, 'fallback: generate official-domain queries, then require a public source pack before publication');
  }
}
const uniq = new Map();
for (const job of jobs) uniq.set([job.person, job.source].join('|'), job);
const out = {
  generatedAt: new Date().toISOString(),
  people: people.length,
  sources: targetSources.length,
  plannedJobs: uniq.size,
  jobs: [...uniq.values()].slice(0, 3000),
  note: 'Planner only. Networked production run fetches official pages, extracts person/date/city/event lines, rejects private-location terms, deduplicates by source/date/city, and promotes only verified public records.'
};
fs.mkdirSync(path.join(root, 'data/crawler'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/crawler/foreign-minister-travel-index-plan.json'), JSON.stringify(out, null, 2));
console.log('Foreign-minister and connector travel planner:', out.plannedJobs, 'jobs for', out.people, 'profiles across', out.sources, 'sources.');
