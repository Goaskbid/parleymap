#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DATA_PATH = path.join(ROOT, 'data', 'demo.json');
const ROSTER_PATH = path.join(ROOT, 'data', 'top200-roster.json');
const SOURCE_PATH = path.join(ROOT, 'config', 'source-registry.json');
const CRAWL_DIR = path.join(ROOT, 'data', 'crawl');
const SNAPSHOT_DIR = path.join(CRAWL_DIR, 'snapshots');
const UA = process.env.PARLEYMAP_USER_AGENT || 'ParleyMapBot/0.1 (+https://example.com; public-source research; contact required before launch)';
const NOW = new Date();
const DAY_MS = 86400000;

const args = new Set(process.argv.slice(2));
const write = args.has('--write') || args.has('--update-site');
const updateSite = args.has('--update-site');
const dryRun = args.has('--dry-run') || !write;
const promoteOfficial = args.has('--promote-official') || updateSite;

const CITY_GAZETTEER = [
  ['Washington', 'US', 'United States', 38.9072, -77.0369], ['Palm Beach', 'US', 'United States', 26.7056, -80.0364],
  ['New York', 'US', 'United States', 40.7128, -74.0060], ['Miami', 'US', 'United States', 25.7617, -80.1918],
  ['Beijing', 'CN', 'China', 39.9042, 116.4074], ['Shanghai', 'CN', 'China', 31.2304, 121.4737],
  ['Moscow', 'RU', 'Russia', 55.7558, 37.6173], ['Saint Petersburg', 'RU', 'Russia', 59.9311, 30.3609],
  ['New Delhi', 'IN', 'India', 28.6139, 77.2090], ['Delhi', 'IN', 'India', 28.6139, 77.2090], ['Mumbai', 'IN', 'India', 19.0760, 72.8777],
  ['Brussels', 'BE', 'Belgium', 50.8503, 4.3517], ['Geneva', 'CH', 'Switzerland', 46.2044, 6.1432], ['Davos', 'CH', 'Switzerland', 46.8027, 9.8359],
  ['Bern', 'CH', 'Switzerland', 46.9480, 7.4474], ['Zurich', 'CH', 'Switzerland', 47.3769, 8.5417],
  ['Paris', 'FR', 'France', 48.8566, 2.3522], ['Evian', 'FR', 'France', 46.4011, 6.5879], ['Strasbourg', 'FR', 'France', 48.5734, 7.7521],
  ['London', 'GB', 'United Kingdom', 51.5072, -0.1276], ['Windsor', 'GB', 'United Kingdom', 51.4839, -0.6044],
  ['Berlin', 'DE', 'Germany', 52.5200, 13.4050], ['Munich', 'DE', 'Germany', 48.1351, 11.5820],
  ['Rome', 'IT', 'Italy', 41.9028, 12.4964], ['Milan', 'IT', 'Italy', 45.4642, 9.1900],
  ['Ankara', 'TR', 'Turkey', 39.9334, 32.8597], ['Istanbul', 'TR', 'Turkey', 41.0082, 28.9784],
  ['Riyadh', 'SA', 'Saudi Arabia', 24.7136, 46.6753], ['Jeddah', 'SA', 'Saudi Arabia', 21.4858, 39.1925],
  ['Abu Dhabi', 'AE', 'United Arab Emirates', 24.4539, 54.3773], ['Dubai', 'AE', 'United Arab Emirates', 25.2048, 55.2708],
  ['Doha', 'QA', 'Qatar', 25.2854, 51.5310], ['Jerusalem', 'IL', 'Israel', 31.7683, 35.2137], ['Tel Aviv', 'IL', 'Israel', 32.0853, 34.7818],
  ['Kyiv', 'UA', 'Ukraine', 50.4501, 30.5234], ['The Hague', 'NL', 'Netherlands', 52.0705, 4.3007], ['Amsterdam', 'NL', 'Netherlands', 52.3676, 4.9041],
  ['Ottawa', 'CA', 'Canada', 45.4215, -75.6972], ['Kananaskis', 'CA', 'Canada', 51.0767, -115.1286],
  ['Tokyo', 'JP', 'Japan', 35.6762, 139.6503], ['Seoul', 'KR', 'South Korea', 37.5665, 126.9780],
  ['Singapore', 'SG', 'Singapore', 1.3521, 103.8198], ['Jakarta', 'ID', 'Indonesia', -6.2088, 106.8456],
  ['Canberra', 'AU', 'Australia', -35.2809, 149.1300], ['Pretoria', 'ZA', 'South Africa', -25.7479, 28.2293],
  ['Johannesburg', 'ZA', 'South Africa', -26.2041, 28.0473], ['Cape Town', 'ZA', 'South Africa', -33.9249, 18.4241],
  ['Brasília', 'BR', 'Brazil', -15.7975, -47.8919], ['Rio de Janeiro', 'BR', 'Brazil', -22.9068, -43.1729],
  ['Mexico City', 'MX', 'Mexico', 19.4326, -99.1332], ['Buenos Aires', 'AR', 'Argentina', -34.6037, -58.3816]
].map(([city, countryCode, countryName, lat, lng]) => ({ city, countryCode, countryName, lat, lng }));

const FORBIDDEN = /\b(private|hotel|residence|home address|hospital|medical|school of his children|leaked|flight tracker|tail number|convoy|motorcade|GPS|phone location|unconfirmed sighting)\b/i;

function parseFlag(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function isoDate(date) { return date.toISOString().slice(0, 10); }
function clean(text) { return String(text || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function slug(text) { return String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'item'; }
function safeDate(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; }
function sourceRecord(source) { return { label: source.name, url: source.url, type: source.kind, reliability: source.reliability, checkedAt: NOW.toISOString() }; }

function monthNumber(name) {
  const months = { jan:0, january:0, feb:1, february:1, mar:2, march:2, apr:3, april:3, may:4, jun:5, june:5, jul:6, july:6, aug:7, august:7, sep:8, sept:8, september:8, oct:9, october:9, nov:10, november:10, dec:11, december:11 };
  return months[String(name || '').toLowerCase()];
}

function extractDate(text) {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(20\d{2})\b/i);
  if (dmy) return isoDate(new Date(Date.UTC(Number(dmy[3]), monthNumber(dmy[2]), Number(dmy[1]))));
  const mdy = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i);
  if (mdy) return isoDate(new Date(Date.UTC(Number(mdy[3]), monthNumber(mdy[1]), Number(mdy[2]))));
  return null;
}

function extractCity(text) {
  const normalized = ` ${text.toLowerCase()} `;
  const candidates = CITY_GAZETTEER.filter((city) => normalized.includes(` ${city.city.toLowerCase()} `));
  return candidates.sort((a, b) => b.city.length - a.city.length)[0] || null;
}

function personAliases(person) {
  const full = person.canonicalName || person.name || '';
  const pieces = full.split(/\s+/).filter(Boolean);
  const last = pieces.length ? pieces[pieces.length - 1].replace(/[’']/g, '') : '';
  const out = new Set([full, person.name, person.wikiTitle?.replaceAll('_', ' '), last.length > 4 ? last : '']);
  return Array.from(out).filter(Boolean);
}

function matchPerson(line, roster, hints = []) {
  const lower = line.toLowerCase();
  const hintLower = hints.map((h) => h.toLowerCase());
  const candidates = roster.filter((person) => !hints.length || hintLower.some((hint) => (person.canonicalName || '').toLowerCase().includes(hint) || hint.includes((person.canonicalName || '').toLowerCase())));
  const pools = candidates.length ? candidates : roster;
  for (const person of pools) {
    if (personAliases(person).some((alias) => alias && lower.includes(alias.toLowerCase()))) return person;
  }
  return null;
}

function makeCandidate({ source, line, roster }) {
  if (FORBIDDEN.test(line)) return null;
  const date = extractDate(line);
  const city = extractCity(line);
  const person = matchPerson(line, roster, source.peopleHints || []);
  if (!date || !city || !person) return null;
  const starts = new Date(`${date}T12:00:00Z`);
  const future = starts.getTime() > NOW.getTime();
  const title = line.split(/[.;]\s/)[0].slice(0, 160) || `${person.canonicalName} public appearance in ${city.city}`;
  return {
    id: `cand-${slug(person.id || person.canonicalName)}-${date}-${slug(city.city)}-${slug(title).slice(0, 36)}`,
    personId: person.mappedPersonId || null,
    rosterId: person.id,
    personName: person.canonicalName,
    startsAt: `${date}T12:00:00Z`,
    status: future ? 'ANNOUNCED_FUTURE' : 'VERIFIED_PAST',
    title,
    summary: line.slice(0, 420),
    location: { ...city, label: `${city.city} public-source city` },
    verificationLevel: source.reliability === 'primary' ? 'Verified' : 'Likely',
    sourceId: source.id,
    sourceName: source.name,
    sourcePack: [sourceRecord(source)],
    autoPublishEligible: Boolean(source.autoPublish && source.reliability === 'primary'),
    extractedAt: NOW.toISOString(),
    extractionMethod: 'date-city-person line extraction from public web source'
  };
}

function splitCandidateLines(text) {
  const short = clean(text);
  const chunks = short.split(/(?<=\.)\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 32 && s.length <= 1200);
  const merged = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const line = chunks[i];
    if (/20\d{2}|January|February|March|April|May|June|July|August|September|October|November|December/i.test(line)) merged.push(line);
  }
  return merged.slice(0, 500);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'text/html,application/xml,application/json;q=0.9,*/*;q=0.8' }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }

async function hydratePortraits(roster, mappedPeople) {
  const byTitle = new Map();
  for (const p of [...roster, ...mappedPeople]) if (p.wikiTitle && !p.imageUrl) byTitle.set(p.wikiTitle, p);
  const titles = Array.from(byTitle.keys());
  const batches = [];
  for (let i = 0; i < titles.length; i += 45) batches.push(titles.slice(i, i + 45));
  const updates = [];
  for (const batch of batches) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages|pageprops&piprop=thumbnail&pithumbsize=220&titles=${encodeURIComponent(batch.join('|'))}`;
    try {
      const raw = await fetchText(url);
      const json = JSON.parse(raw);
      const alias = new Map();
      for (const item of json.query?.normalized || []) alias.set(item.from, item.to);
      for (const item of json.query?.redirects || []) alias.set(item.from, item.to);
      for (const page of Object.values(json.query?.pages || {})) {
        const source = page.thumbnail?.source || '';
        if (!source) continue;
        const title = page.title;
        const original = batch.find((b) => (alias.get(b) || b) === title) || title;
        const person = byTitle.get(original) || byTitle.get(title);
        if (person) {
          person.imageUrl = source;
          person.visualStatus = 'runtime thumbnail candidate from Wikipedia PageImages; audit license before production cache';
          updates.push({ person: person.canonicalName || person.name, wikiTitle: original, imageUrl: source });
        }
      }
    } catch (error) {
      updates.push({ batch: batch.slice(0, 3).join(', '), error: error.message });
    }
  }
  return updates;
}

function promoteCandidates(data, roster, candidates) {
  const peopleByName = new Map((data.people || []).map((p) => [p.canonicalName.toLowerCase(), p]));
  const existing = new Set((data.appearances || []).map((a) => `${a.personId}|${a.startsAt.slice(0,10)}|${a.location?.city}|${slug(a.title).slice(0,40)}`));
  const promoted = [];
  for (const c of candidates) {
    if (!c.autoPublishEligible) continue;
    const mapped = peopleByName.get(String(c.personName || '').toLowerCase());
    if (!mapped) continue;
    const key = `${mapped.id}|${c.startsAt.slice(0,10)}|${c.location.city}|${slug(c.title).slice(0,40)}`;
    if (existing.has(key)) continue;
    existing.add(key);
    promoted.push({
      id: `crawl-${slug(mapped.id)}-${c.startsAt.slice(0,10)}-${slug(c.location.city)}-${slug(c.title).slice(0,28)}`,
      personId: mapped.id,
      startsAt: c.startsAt,
      endsAt: null,
      status: c.status,
      confidence: 0.78,
      confidenceLabel: 'official-source crawler candidate; check source pack',
      eventType: 'PUBLIC_APPEARANCE',
      title: c.title,
      summary: c.summary,
      significance: 'Added by the overnight crawler from an official or host-public source. Human review should tighten the card if it becomes prominent.',
      decisions: 'No decision claim is made unless the source text states one.',
      location: c.location,
      venuePublic: true,
      securityPrecision: 'public appearance only; no private stops, hotels, residences, leaked routes, convoy detail or live proximity',
      publicInterestScore: Math.max(55, mapped.prominenceScore ? Math.min(95, mapped.prominenceScore - 8) : 65),
      eventGroupId: `eg-${slug(c.sourceId)}-${c.startsAt.slice(0,10)}-${slug(c.location.city)}`,
      topics: [c.sourceName, c.location.countryName].filter(Boolean),
      counterpartIds: [],
      sourcePack: c.sourcePack,
      verificationLevel: c.verificationLevel,
      crawlerAdded: true,
      crawlerCheckedAt: NOW.toISOString()
    });
  }
  if (promoted.length) data.appearances.push(...promoted);
  return promoted;
}

async function main() {
  const sinceArg = parseFlag('since');
  const untilArg = parseFlag('until');
  const since = sinceArg ? safeDate(sinceArg) : new Date(NOW.getTime() - 730 * DAY_MS);
  const until = untilArg ? safeDate(untilArg) : new Date(NOW.getTime() + 120 * DAY_MS);
  const [data, registry] = await Promise.all([readJson(DATA_PATH), readJson(SOURCE_PATH)]);
  const rosterEnvelope = await readJson(ROSTER_PATH).catch(() => ({ roster: data.roster || data.topRoster || [] }));
  const roster = Array.isArray(rosterEnvelope) ? rosterEnvelope : (Array.isArray(rosterEnvelope.roster) ? rosterEnvelope.roster : (data.roster || data.topRoster || []));
  await fs.mkdir(CRAWL_DIR, { recursive: true });

  const summary = { generatedAt: NOW.toISOString(), dryRun, updateSite, since: isoDate(since), until: isoDate(until), sources: [], candidates: 0, promoted: 0, portraitUpdates: 0, errors: [] };
  const candidates = [];

  for (const source of registry.sources || []) {
    const entry = { id: source.id, name: source.name, url: source.url, status: 'pending', candidates: 0 };
    try {
      if (dryRun) {
        entry.status = 'planned: dry-run did not fetch network source';
        summary.sources.push(entry);
        continue;
      }
      if (source.kind === 'secondary_discovery' && !process.env.GDELT_API_KEY) {
        entry.status = 'skipped: secondary discovery key not configured';
        summary.sources.push(entry);
        continue;
      }
      const raw = await fetchText(source.url);
      if (write) {
        const dayDir = path.join(SNAPSHOT_DIR, isoDate(NOW));
        await fs.mkdir(dayDir, { recursive: true });
        await fs.writeFile(path.join(dayDir, `${source.id}.txt`), clean(raw).slice(0, 400000));
      }
      const lines = splitCandidateLines(raw);
      for (const line of lines) {
        const c = makeCandidate({ source, line, roster });
        if (!c) continue;
        const d = safeDate(c.startsAt);
        if (d && d >= since && d <= until) candidates.push(c);
      }
      entry.status = 'ok';
      entry.candidates = candidates.filter((c) => c.sourceId === source.id).length;
    } catch (error) {
      entry.status = 'error';
      entry.error = error.message;
      summary.errors.push({ source: source.id, message: error.message });
    }
    summary.sources.push(entry);
  }

  const unique = new Map();
  for (const c of candidates) unique.set(c.id, c);
  const uniqueCandidates = Array.from(unique.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.personName.localeCompare(b.personName));
  summary.candidates = uniqueCandidates.length;

  let portraitUpdates = [];
  if (!dryRun) portraitUpdates = await hydratePortraits(roster, data.people || []);
  summary.portraitUpdates = portraitUpdates.filter((item) => item.imageUrl).length;

  let promoted = [];
  if (promoteOfficial) promoted = promoteCandidates(data, roster, uniqueCandidates);
  summary.promoted = promoted.length;

  const importStatus = `Evergreen crawl ${isoDate(NOW)}: ${summary.candidates} candidates, ${summary.promoted} promoted, ${summary.portraitUpdates} portrait updates`;
  data.meta = { ...(data.meta || {}), version: '2.4.0', lastDataUpdate: NOW.toISOString(), lastCrawlerRun: NOW.toISOString(), importStatus, crawlerLookback: `${summary.since} to ${summary.until}` };
  data.roster = data.roster || roster;
  for (const r of roster) {
    const inData = data.roster.find((p) => p.id === r.id);
    if (inData && r.imageUrl && !inData.imageUrl) inData.imageUrl = r.imageUrl;
  }

  await writeJson(path.join(CRAWL_DIR, 'candidates-latest.json'), uniqueCandidates);
  await writeJson(path.join(CRAWL_DIR, 'import-summary-latest.json'), summary);
  await writeJson(path.join(CRAWL_DIR, 'portrait-updates-latest.json'), portraitUpdates);
  if (write) {
    await writeJson(DATA_PATH, data);
    if (Array.isArray(rosterEnvelope)) await writeJson(ROSTER_PATH, roster);
    else await writeJson(ROSTER_PATH, { ...(rosterEnvelope || {}), roster, meta: { ...((rosterEnvelope && rosterEnvelope.meta) || {}), lastPortraitRefresh: NOW.toISOString() } });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
