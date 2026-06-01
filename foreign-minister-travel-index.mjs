#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fetchGdeltDoc, personDiscoveryQuery } from "../connectors/gdelt-doc.mjs";
import { fetchPortraitBatch } from "../connectors/wikimedia-portraits.mjs";
import { loadSourceRegistry, officialSources } from "../connectors/official-source-registry.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const has = (name) => args.has(name);
const valueOf = (prefix, fallback) => {
  const raw = Array.from(args).find((arg) => arg.startsWith(`${prefix}=`));
  return raw ? raw.slice(prefix.length + 1) : fallback;
};
const dryRun = has("--dry-run");
const offline = has("--offline") || process.env.PARLEYMAP_OFFLINE === "1";
const nightly = has("--nightly");
const backfill = has("--backfill");
const months = Math.max(1, Math.min(24, Number(valueOf("--months", backfill ? "24" : "3")) || 3));
const maxPeople = Math.max(1, Math.min(340, Number(valueOf("--max-people", nightly ? "340" : "20")) || (nightly ? 340 : 20)));
const now = new Date();

const dataPath = path.join(root, "data", "demo.json");
const demo = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const roster = [...(demo.roster || []), ...(demo.expansionRoster || [])].slice().sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
const registry = loadSourceRegistry(path.join(root, "data", "source-registry.json"));
const outputDir = path.join(root, "data", "crawler");
fs.mkdirSync(outputDir, { recursive: true });

const cityDb = [
  ["Washington", "US", "United States", 38.9072, -77.0369], ["New York", "US", "United States", 40.7128, -74.0060], ["Palm Beach", "US", "United States", 26.7056, -80.0364],
  ["Beijing", "CN", "China", 39.9042, 116.4074], ["Shanghai", "CN", "China", 31.2304, 121.4737], ["Moscow", "RU", "Russia", 55.7558, 37.6173], ["New Delhi", "IN", "India", 28.6139, 77.2090], ["Mumbai", "IN", "India", 19.0760, 72.8777],
  ["Brussels", "BE", "Belgium", 50.8503, 4.3517], ["Paris", "FR", "France", 48.8566, 2.3522], ["London", "GB", "United Kingdom", 51.5072, -0.1276], ["Berlin", "DE", "Germany", 52.52, 13.405], ["Rome", "IT", "Italy", 41.9028, 12.4964],
  ["Kyiv", "UA", "Ukraine", 50.4501, 30.5234], ["Ankara", "TR", "Turkey", 39.9334, 32.8597], ["Riyadh", "SA", "Saudi Arabia", 24.7136, 46.6753], ["Abu Dhabi", "AE", "United Arab Emirates", 24.4539, 54.3773], ["Doha", "QA", "Qatar", 25.2854, 51.5310],
  ["Geneva", "CH", "Switzerland", 46.2044, 6.1432], ["Davos", "CH", "Switzerland", 46.8027, 9.8350], ["Zurich", "CH", "Switzerland", 47.3769, 8.5417], ["Basel", "CH", "Switzerland", 47.5596, 7.5886],
  ["Tokyo", "JP", "Japan", 35.6762, 139.6503], ["Seoul", "KR", "South Korea", 37.5665, 126.9780], ["Singapore", "SG", "Singapore", 1.3521, 103.8198], ["Jakarta", "ID", "Indonesia", -6.2088, 106.8456],
  ["Canberra", "AU", "Australia", -35.2809, 149.1300], ["Ottawa", "CA", "Canada", 45.4215, -75.6972], ["Kananaskis", "CA", "Canada", 51.0763, -115.1286], ["Miami", "US", "United States", 25.7617, -80.1918],
  ["Mexico City", "MX", "Mexico", 19.4326, -99.1332], ["Brasília", "BR", "Brazil", -15.7975, -47.8919], ["Buenos Aires", "AR", "Argentina", -34.6037, -58.3816],
  ["Pretoria", "ZA", "South Africa", -25.7479, 28.2293], ["Cape Town", "ZA", "South Africa", -33.9249, 18.4241], ["Abuja", "NG", "Nigeria", 9.0765, 7.3986], ["Nairobi", "KE", "Kenya", -1.2921, 36.8219], ["Cairo", "EG", "Egypt", 30.0444, 31.2357], ["Addis Ababa", "ET", "Ethiopia", 8.9806, 38.7578]
].map(([city, countryCode, countryName, lat, lng]) => ({ city, countryCode, countryName, lat, lng }));

function isoDay(date) { return date.toISOString().slice(0, 10); }
function addMonths(date, n) { const copy = new Date(date); copy.setMonth(copy.getMonth() + n); return copy; }
function monthWindows(count) {
  const windows = [];
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addMonths(end, -i);
    windows.push({ start: isoDay(start), end: isoDay(addMonths(start, 1)) });
  }
  return windows;
}
function safeId(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90) || "item"; }
function firstCity(text) {
  const haystack = String(text || "");
  return cityDb.find((city) => new RegExp(`\\b${escapeRegExp(city.city)}\\b`, "i").test(haystack));
}
function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function banned(text) { return /\b(hotel|private residence|home address|hospital|leaked|flight tracker|aircraft tracking|tail number|school)\b/i.test(String(text || "")); }
function candidateFromArticle(person, article, sourceType = "discovery") {
  const text = [article.title, article.url].join(" ");
  const city = firstCity(text);
  return {
    id: `cand-${safeId(person.id || person.name)}-${safeId(article.id || article.title || article.url)}`,
    personId: person.id,
    personName: person.canonicalName || person.name,
    title: article.title || "Public appearance lead",
    url: article.url,
    publishedAt: article.publishedAt || null,
    sourceType,
    verificationLevel: sourceType === "official" || sourceType === "official_host" ? "Likely" : "Reported",
    city: city?.city || null,
    countryCode: city?.countryCode || null,
    countryName: city?.countryName || null,
    lat: city?.lat || null,
    lng: city?.lng || null,
    status: city && !banned(text) && /official|host/.test(sourceType) ? "publishable_candidate" : "lead_only",
    reason: city ? "city detected in public source title or URL" : "needs date/location extraction"
  };
}
function candidateToAppearance(candidate) {
  if (candidate.status !== "publishable_candidate" || !candidate.lat || !candidate.lng) return null;
  return {
    id: `auto-${safeId(candidate.personId)}-${safeId(candidate.publishedAt || now.toISOString())}-${safeId(candidate.city)}-${safeId(candidate.title)}`,
    personId: candidate.personId,
    startsAt: candidate.publishedAt || now.toISOString(),
    endsAt: null,
    status: new Date(candidate.publishedAt || now) > now ? "ANNOUNCED_FUTURE" : "VERIFIED_PAST",
    confidence: 0.72,
    confidenceLabel: "auto-ingested public source candidate; review source pack for publication quality",
    eventType: "PUBLIC_APPEARANCE",
    title: candidate.title,
    summary: `Public source places ${candidate.personName} in or around ${candidate.city}. The record was generated by the evergreen crawler and needs a final source-pack check before prominent display.`,
    significance: "Public appearance added by crawler because a source, date and city were detected.",
    decisions: "No decision claim is made by the crawler.",
    location: { label: `${candidate.city} public city-level record`, city: candidate.city, countryCode: candidate.countryCode, countryName: candidate.countryName, lat: candidate.lat, lng: candidate.lng, precision: "city" },
    venuePublic: false,
    securityPrecision: "city-level public-source record only; no private stops, hotels, residences, leaked routes or live proximity",
    publicInterestScore: 62,
    eventGroupId: `eg-auto-${safeId(candidate.city)}-${safeId(candidate.publishedAt || now.toISOString()).slice(0, 10)}`,
    topics: ["crawler", "public source"],
    counterpartIds: [],
    sourcePack: [{ label: candidate.title, url: candidate.url, type: candidate.sourceType, license: "public web source; rights remain with publisher", checkedAt: now.toISOString(), reliability: candidate.sourceType === "discovery" ? "secondary" : "primary_or_host" }],
    visual: { status: "runtime-or-audited-portrait", policy: "Use only self-created, public-domain, official-use, or license-audited media with attribution captured.", license: "not bundled; portraits require license and attribution capture" },
    lastCheckedAt: now.toISOString(),
    needsHumanReview: true,
    verificationLevel: candidate.verificationLevel,
    importanceScore: 62,
    peaceProcess: false,
    marketImpact: { sectors: [], companies: [], countries: [candidate.countryName], confidence: "low" }
  };
}

const selectedRoster = roster.slice(0, maxPeople);
const backfillJobs = selectedRoster.flatMap((person) => monthWindows(months).map((window) => ({ personId: person.id, name: person.canonicalName || person.name, window, query: personDiscoveryQuery(person) })));
const officialJobs = officialSources(registry).map((source) => ({ sourceId: source.id, label: source.label, url: source.url, type: source.type, cadence: source.cadence }));
const candidates = [];
const errors = [];

async function runNetwork() {
  for (const person of selectedRoster) {
    try {
      const items = await fetchGdeltDoc(globalThis.fetch, { query: personDiscoveryQuery(person), timespan: nightly ? "72h" : "30d", maxrecords: nightly ? 8 : 12 });
      for (const item of items) candidates.push(candidateFromArticle(person, item, "discovery"));
    } catch (error) {
      errors.push({ stage: "gdelt", person: person.canonicalName || person.name, message: error.message });
    }
  }

  // Portrait cache refresh. This is deliberately separate from location publication.
  const portraitTitles = selectedRoster.map((p) => p.wikiTitle).filter(Boolean);
  try {
    const portraitMap = await fetchPortraitBatch(globalThis.fetch, portraitTitles, 180);
    fs.writeFileSync(path.join(outputDir, "portrait-cache.json"), JSON.stringify(Object.fromEntries(portraitMap.entries()), null, 2));
  } catch (error) {
    errors.push({ stage: "portraits", message: error.message });
  }
}

if (!dryRun && !offline) await runNetwork();

const publishable = candidates.map(candidateToAppearance).filter(Boolean);
if (has("--publish-auto") && publishable.length) {
  const existing = new Set((demo.appearances || []).map((appearance) => appearance.id));
  demo.appearances.push(...publishable.filter((appearance) => !existing.has(appearance.id)));
}

const status = {
  generatedAt: now.toISOString(),
  mode: dryRun ? "dry-run" : nightly ? "nightly" : backfill ? "backfill" : "manual",
  offline,
  selectedPeople: selectedRoster.length,
  rosterSize: roster.length,
  officialSources: officialJobs.length,
  backfillMonths: months,
  plannedBackfillJobs: backfillJobs.length,
  candidatesFound: candidates.length,
  publishableCandidates: publishable.length,
  errors,
  safetyGate: registry.rules,
  note: offline || dryRun ? "Network calls skipped. GitHub Actions nightly refresh runs this same crawler with network access." : "Network crawl completed. Publication requires source, date, city and safety checks."
};

fs.writeFileSync(path.join(root, "data", "crawler-status.json"), JSON.stringify(status, null, 2));
fs.writeFileSync(path.join(outputDir, "latest-candidates.json"), JSON.stringify(candidates, null, 2));
fs.writeFileSync(path.join(outputDir, "backfill-plan.json"), JSON.stringify({ generatedAt: now.toISOString(), months, jobs: backfillJobs }, null, 2));
fs.writeFileSync(path.join(root, "data", "refresh-log.json"), JSON.stringify(status, null, 2));

if (!dryRun) {
  demo.meta = demo.meta || {};
  demo.meta.lastDataUpdate = now.toISOString();
  demo.meta.importStatus = `crawler ${status.mode}: ${status.candidatesFound} leads / ${status.publishableCandidates} publishable`;
  demo.meta.crawlerStatus = status.importStatus || `crawler ${status.mode}`;
  fs.writeFileSync(dataPath, JSON.stringify(demo, null, 2));
}

console.log(`ParleyMap evergreen refresh: ${status.mode}; ${status.plannedBackfillJobs} backfill jobs planned; ${status.candidatesFound} leads; ${status.publishableCandidates} publishable candidates.`);
if (errors.length) console.warn(`${errors.length} non-fatal crawler errors written to data/crawler-status.json`);
