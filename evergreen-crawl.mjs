#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DATA_PATH = path.join(ROOT, 'data', 'demo.json');
const ROSTER_PATH = path.join(ROOT, 'data', 'top200-roster.json');
const OUT_PATH = path.join(ROOT, 'data', 'crawl', 'roster-review-latest.json');
const NOW = new Date();
const UA = process.env.PARLEYMAP_USER_AGENT || 'ParleyMapBot/0.1 (+https://example.com; public-source research; contact required before launch)';
const write = process.argv.includes('--write');

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
function slug(text) { return String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90); }

const queries = {
  headsOfState: `SELECT ?person ?personLabel ?countryLabel ?dob WHERE { ?country wdt:P35 ?person . OPTIONAL { ?person wdt:P569 ?dob . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 250`,
  headsOfGovernment: `SELECT ?person ?personLabel ?countryLabel ?dob WHERE { ?country wdt:P6 ?person . OPTIONAL { ?person wdt:P569 ?dob . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 250`
};

async function sparql(query) {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'application/sparql-results+json,application/json' } });
  if (!res.ok) throw new Error(`WDQS HTTP ${res.status}`);
  const data = await res.json();
  return data.results.bindings.map((row) => ({
    qid: row.person?.value?.split('/').pop(),
    name: row.personLabel?.value,
    country: row.countryLabel?.value,
    birthDate: row.dob?.value?.slice(0, 10)
  })).filter((row) => row.name && row.qid);
}

function compareRoster(roster, found) {
  const current = new Map(roster.map((p) => [String(p.canonicalName || p.name || '').toLowerCase(), p]));
  const candidates = [];
  for (const item of found) {
    const key = item.name.toLowerCase();
    if (!current.has(key)) {
      candidates.push({ ...item, reason: 'current office holder not present by exact name in top-200 roster' });
    }
  }
  return candidates;
}

async function main() {
  const [data, roster] = await Promise.all([readJson(DATA_PATH), readJson(ROSTER_PATH)]);
  const out = { generatedAt: NOW.toISOString(), status: 'ok', sources: ['Wikidata P35 head of state', 'Wikidata P6 head of government'], suggestions: [], errors: [] };
  const all = [];
  for (const [name, query] of Object.entries(queries)) {
    try {
      const rows = await sparql(query);
      out[name] = rows.length;
      all.push(...rows.map((row) => ({ ...row, sourceQuery: name })));
    } catch (error) {
      out.errors.push({ query: name, message: error.message });
    }
  }
  const unique = Array.from(new Map(all.map((row) => [`${row.qid}-${row.sourceQuery}`, row])).values());
  out.suggestions = compareRoster(roster, unique).slice(0, 80);
  out.summary = `${unique.length} current office-holder rows checked; ${out.suggestions.length} possible roster additions or replacements.`;

  if (write) {
    data.meta = { ...(data.meta || {}), lastTop200Review: NOW.toISOString().slice(0, 10), nextTop200Review: new Date(NOW.getTime() + 30 * 86400000).toISOString().slice(0, 10), rosterReviewStatus: out.summary };
    await writeJson(DATA_PATH, data);
  }
  await writeJson(OUT_PATH, out);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
