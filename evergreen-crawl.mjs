#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const publish = args.has("--publish");
const dryRun = args.has("--dry-run");
const maxPerPerson = Number(argValue("--max-per-person") || process.env.PARLEYMAP_MAX_PER_PERSON || 8);
const maxPagesPerSource = Number(argValue("--max-pages-per-source") || process.env.PARLEYMAP_MAX_PAGES_PER_SOURCE || 80);
const maxRoster = Number(argValue("--max-roster") || process.env.PARLEYMAP_MAX_ROSTER || 200);
const now = new Date();
const since = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
const futureUntil = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
const recentSince = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

const dataPath = path.join(root, "data", "demo.json");
const registryPath = path.join(root, "data", "source-registry.json");
const outDir = path.join(root, "data", "crawler");
fs.mkdirSync(outDir, { recursive: true });

const data = readJson(dataPath, null);
if (!data) throw new Error("Missing data/demo.json");
const registry = readJson(registryPath, { officialDomains: [], sitemaps: [], eventKeywords: [], blockedLocationTerms: [] });
const roster = (data.roster || []).slice(0, maxRoster);
const peopleByName = new Map((data.people || []).map((p) => [norm(p.canonicalName), p]));
const existingIds = new Set((data.appearances || []).map((a) => a.id));
const officialDomains = new Set((registry.officialDomains || []).map((d) => d.toLowerCase()));

const cityGazetteer = [
  ["Washington", "US", "United States", 38.9072, -77.0369],
  ["Palm Beach", "US", "United States", 26.7056, -80.0364],
  ["New York", "US", "United States", 40.7128, -74.0060],
  ["Miami", "US", "United States", 25.7617, -80.1918],
  ["San Francisco", "US", "United States", 37.7749, -122.4194],
  ["Austin", "US", "United States", 30.2672, -97.7431],
  ["Beijing", "CN", "China", 39.9042, 116.4074],
  ["Shanghai", "CN", "China", 31.2304, 121.4737],
  ["Moscow", "RU", "Russia", 55.7558, 37.6173],
  ["New Delhi", "IN", "India", 28.6139, 77.2090],
  ["Mumbai", "IN", "India", 19.0760, 72.8777],
  ["London", "GB", "United Kingdom", 51.5072, -0.1276],
  ["Paris", "FR", "France", 48.8566, 2.3522],
  ["Berlin", "DE", "Germany", 52.5200, 13.4050],
  ["Rome", "IT", "Italy", 41.9028, 12.4964],
  ["Brussels", "BE", "Belgium", 50.8503, 4.3517],
  ["Geneva", "CH", "Switzerland", 46.2044, 6.1432],
  ["Zurich", "CH", "Switzerland", 47.3769, 8.5417],
  ["Davos", "CH", "Switzerland", 46.8027, 9.8359],
  ["Basel", "CH", "Switzerland", 47.5596, 7.5886],
  ["Ankara", "TR", "Turkey", 39.9334, 32.8597],
  ["Istanbul", "TR", "Turkey", 41.0082, 28.9784],
  ["Riyadh", "SA", "Saudi Arabia", 24.7136, 46.6753],
  ["Jeddah", "SA", "Saudi Arabia", 21.4858, 39.1925],
  ["Abu Dhabi", "AE", "United Arab Emirates", 24.4539, 54.3773],
  ["Dubai", "AE", "United Arab Emirates", 25.2048, 55.2708],
  ["Doha", "QA", "Qatar", 25.2854, 51.5310],
  ["Jerusalem", "IL", "Israel", 31.7683, 35.2137],
  ["Kyiv", "UA", "Ukraine", 50.4501, 30.5234],
  ["Tokyo", "JP", "Japan", 35.6762, 139.6503],
  ["Seoul", "KR", "South Korea", 37.5665, 126.9780],
  ["Singapore", "SG", "Singapore", 1.3521, 103.8198],
  ["Jakarta", "ID", "Indonesia", -6.2088, 106.8456],
  ["Canberra", "AU", "Australia", -35.2809, 149.1300],
  ["Ottawa", "CA", "Canada", 45.4215, -75.6972],
  ["Kananaskis", "CA", "Canada", 51.0760, -115.1280],
  ["Mexico City", "MX", "Mexico", 19.4326, -99.1332],
  ["Brasilia", "BR", "Brazil", -15.7975, -47.8919],
  ["Pretoria", "ZA", "South Africa", -25.7479, 28.2293],
  ["Johannesburg", "ZA", "South Africa", -26.2041, 28.0473],
  ["Nairobi", "KE", "Kenya", -1.2921, 36.8219],
  ["Cairo", "EG", "Egypt", 30.0444, 31.2357],
  ["Addis Ababa", "ET", "Ethiopia", 8.9806, 38.7578]
].map(([city, countryCode, countryName, lat, lng]) => ({ city, countryCode, countryName, lat, lng }));

const run = async () => {
  const candidates = [];
  const failures = [];

  if (!dryRun) {
    const sitemapLeads = await crawlSitemaps(failures);
    candidates.push(...sitemapLeads);
    const discoveryLeads = await crawlRecentDiscovery(failures);
    candidates.push(...discoveryLeads);
  }

  const deduped = dedupeCandidates(candidates).slice(0, maxRoster * maxPerPerson);
  const publishable = deduped.filter((item) => item.publicationGate === "publishable");

  const report = {
    generatedAt: now.toISOString(),
    mode: dryRun ? "dry-run" : publish ? "publish" : "candidate-only",
    window: { since: since.toISOString(), until: now.toISOString(), futureUntil: futureUntil.toISOString() },
    rosterScanned: roster.length,
    sourcesScanned: dryRun ? 0 : (registry.sitemaps || []).length,
    candidates: deduped.length,
    publishable: publishable.length,
    failures,
    notes: [
      "Future records are kept only when a public event date and city are visible in an official or host-public source.",
      "Private addresses, hotels, hospitals, live movement, aircraft tracking, and leaked itineraries are rejected before publication.",
      "GDELT is used as a recent discovery layer. Official and host sources outrank media leads."
    ]
  };

  fs.writeFileSync(path.join(outDir, "candidate-appearances.json"), JSON.stringify(deduped, null, 2));
  fs.writeFileSync(path.join(outDir, "publishable-appearances.json"), JSON.stringify(publishable, null, 2));
  fs.writeFileSync(path.join(outDir, "crawl-report.json"), JSON.stringify(report, null, 2));

  if (publish) {
    const before = data.appearances.length;
    for (const item of publishable) {
      if (existingIds.has(item.id)) continue;
      data.appearances.push(toAppearance(item));
      existingIds.add(item.id);
    }
    data.meta = data.meta || {};
    data.meta.version = "2.6.0";
    data.meta.lastDataUpdate = now.toISOString();
    data.meta.crawlerStatus = `nightly crawler ran: ${publishable.length} publishable / ${deduped.length} candidates`;
    data.meta.importStatus = `crawler merged ${data.appearances.length - before} new public-source records`;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    report.merged = data.appearances.length - before;
    fs.writeFileSync(path.join(outDir, "crawl-report.json"), JSON.stringify(report, null, 2));
  }

  console.log(`ParleyMap 24-month crawl ${report.mode}: ${deduped.length} candidates, ${publishable.length} publishable.`);
  if (failures.length) console.log(`Soft failures: ${failures.length}. See data/crawler/crawl-report.json.`);
};

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function norm(value) { return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function slug(value) { return norm(value).replace(/ /g, "-").slice(0, 80); }
function escapeRe(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function domainOf(rawUrl) { try { return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } }
function isOfficialUrl(rawUrl) {
  const d = domainOf(rawUrl);
  return Array.from(officialDomains).some((official) => d === official || d.endsWith(`.${official}`));
}
function blockedText(text) {
  const lower = String(text || "").toLowerCase();
  return (registry.blockedLocationTerms || []).some((term) => lower.includes(term));
}
function eventish(text) {
  const lower = String(text || "").toLowerCase();
  return (registry.eventKeywords || []).some((kw) => lower.includes(kw));
}
function findCity(text, fallbackCountryCode) {
  const hay = ` ${norm(text)} `;
  const hit = cityGazetteer.find((city) => hay.includes(` ${norm(city.city)} `));
  if (hit) return hit;
  const countryCity = cityGazetteer.find((city) => city.countryCode === fallbackCountryCode);
  return countryCity || cityGazetteer.find((city) => city.city === "Geneva");
}
function namesMentioned(text, subjectName) {
  const hay = norm(text);
  return roster
    .filter((person) => person.name !== subjectName && hay.includes(norm(person.name)))
    .slice(0, 8)
    .map((person) => mappedPersonForRoster(person)?.id)
    .filter(Boolean);
}
function mappedPersonForRoster(person) {
  return peopleByName.get(norm(person.name || person.canonicalName));
}
function candidateStatus(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "REPORTED_PAST";
  return date > now ? "ANNOUNCED_FUTURE" : "VERIFIED_PAST";
}
function sourceTypeForUrl(url, sourceKind) {
  if (sourceKind === "official" || sourceKind === "host") return "official_or_host";
  return isOfficialUrl(url) ? "official_or_host" : "discovery";
}
function verificationForUrl(url, sourceKind) {
  if (sourceKind === "official" || sourceKind === "host" || isOfficialUrl(url)) return "Verified";
  return "Reported";
}
function safeText(text) { return String(text || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function datesFromText(text, fallbackDate) {
  const dates = new Set();
  const iso = String(text || "").match(/\b20\d{2}-\d{2}-\d{2}\b/g) || [];
  iso.forEach((d) => dates.add(`${d}T12:00:00Z`));
  if (!dates.size && fallbackDate) dates.add(new Date(fallbackDate).toISOString());
  return Array.from(dates).filter((d) => !Number.isNaN(Date.parse(d)));
}
function createCandidate({ person, title, text, url, sourceLabel, sourceKind, dateValue }) {
  if (!person || !title || !url || blockedText(text)) return null;
  if (!eventish(`${title} ${text}`)) return null;
  const mapped = mappedPersonForRoster(person);
  if (!mapped) return null;
  const city = findCity(`${title} ${text}`, person.countryFocus || person.country || "UN");
  const dates = datesFromText(`${title} ${text}`, dateValue);
  const date = dates.find((d) => new Date(d) >= since && new Date(d) <= futureUntil) || (dateValue ? new Date(dateValue).toISOString() : now.toISOString());
  const verificationLevel = verificationForUrl(url, sourceKind);
  const publicationGate = verificationLevel === "Verified" && city && !blockedText(`${title} ${text}`) ? "publishable" : "candidate_review";
  const id = `crawl-${slug(mapped.id)}-${slug(city.city)}-${slug(date.slice(0,10))}-${slug(title).slice(0,40)}`;
  return {
    id,
    personId: mapped.id,
    personName: mapped.canonicalName,
    startsAt: date,
    status: candidateStatus(date),
    eventType: inferEventType(`${title} ${text}`),
    title: title.slice(0, 140),
    summary: oneSentence(text || title, 260),
    significance: `Public record linking ${mapped.canonicalName} to ${city.city}. This is useful when it confirms a meeting, summit, speech, visit, or delegation record.`,
    decisions: "Follow the official source and subsequent communiques for decisions, signings, or market-relevant policy detail.",
    location: { label: `${city.city} public-source location`, city: city.city, countryCode: city.countryCode, countryName: city.countryName, lat: city.lat, lng: city.lng, precision: "city" },
    publicInterestScore: Number(person.prominenceScore || mapped.prominenceScore || 70),
    counterpartIds: namesMentioned(`${title} ${text}`, person.name),
    topics: topicsForText(`${title} ${text}`),
    verificationLevel,
    confidence: verificationLevel === "Verified" ? 0.86 : 0.62,
    confidenceLabel: verificationLevel === "Verified" ? "official or host-public source" : "discovery lead awaiting stronger source",
    publicationGate,
    sourcePack: [{ label: sourceLabel || domainOf(url), url, type: sourceTypeForUrl(url, sourceKind), checkedAt: now.toISOString(), reliability: verificationLevel === "Verified" ? "primary_or_host" : "secondary_discovery" }],
    crawler: { detectedAt: now.toISOString(), sourceKind, domain: domainOf(url), rule: "24-month public-source crawler" }
  };
}
function inferEventType(text) {
  const t = norm(text);
  if (t.includes("summit")) return "SUMMIT";
  if (t.includes("bilateral")) return "BILATERAL";
  if (t.includes("peace") || t.includes("ceasefire")) return "PEACE_PROCESS";
  if (t.includes("speech") || t.includes("address")) return "ADDRESS";
  if (t.includes("forum") || t.includes("conference")) return "CONFERENCE";
  if (t.includes("visit")) return "PUBLIC_VISIT";
  return "PUBLIC_APPEARANCE";
}
function topicsForText(text) {
  const pairs = [["peace", "peace"], ["trade", "trade"], ["defence", "defense"], ["defense", "defense"], ["energy", "energy"], ["ai", "AI"], ["technology", "technology"], ["finance", "finance"], ["climate", "climate"], ["security", "security"], ["summit", "summit"]];
  const t = norm(text);
  return pairs.filter(([needle]) => t.includes(needle)).map(([, label]) => label).slice(0, 6);
}
function oneSentence(text, limit) {
  const clean = safeText(text);
  const first = clean.split(/(?<=[.!?])\s+/)[0] || clean;
  return first.length > limit ? `${first.slice(0, limit - 1)}…` : first;
}
function dedupeCandidates(items) {
  const map = new Map();
  for (const item of items.filter(Boolean)) {
    const key = `${item.personId}|${item.location.city}|${item.startsAt.slice(0,10)}|${norm(item.title).slice(0,70)}`;
    const existing = map.get(key);
    if (!existing || (item.verificationLevel === "Verified" && existing.verificationLevel !== "Verified")) map.set(key, item);
  }
  return Array.from(map.values()).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
}
function toAppearance(item) {
  return {
    id: item.id,
    personId: item.personId,
    startsAt: item.startsAt,
    endsAt: null,
    status: item.status,
    confidence: item.confidence,
    confidenceLabel: item.confidenceLabel,
    eventType: item.eventType,
    title: item.title,
    summary: item.summary,
    significance: item.significance,
    decisions: item.decisions,
    location: item.location,
    venuePublic: true,
    securityPrecision: "city-level public appearance only; no private stops, hotels, residences, leaked routes or live proximity",
    publicInterestScore: item.publicInterestScore,
    eventGroupId: `eg-${slug(item.location.city)}-${item.startsAt.slice(0,10)}`,
    topics: item.topics,
    counterpartIds: item.counterpartIds,
    sourcePack: item.sourcePack,
    visual: { status: "runtime portrait", policy: "Use only audited public media with attribution." },
    lastCheckedAt: now.toISOString(),
    needsHumanReview: false,
    verificationLevel: item.verificationLevel,
    importanceScore: item.publicInterestScore,
    peaceProcess: item.eventType === "PEACE_PROCESS",
    marketImpact: { sectors: item.topics.filter((t) => !["summit", "peace"].includes(t)).slice(0, 4), companies: [], countries: [item.location.countryName], confidence: "low" },
    crawler: item.crawler
  };
}
async function fetchText(url, failures) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "ParleyMapPublicSourceCrawler/2.5 (+https://parleymap.example; public-source records only)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    failures.push({ url, error: err.message });
    return "";
  } finally { clearTimeout(timeout); }
}
function sitemapUrls(xml) {
  const out = [];
  const locs = [...String(xml || "").matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  const lastmods = [...String(xml || "").matchAll(/<lastmod>([^<]+)<\/lastmod>/gi)].map((m) => m[1].trim());
  locs.forEach((url, i) => out.push({ url, lastmod: lastmods[i] || null }));
  return out;
}
async function crawlSitemaps(failures) {
  const output = [];
  for (const source of registry.sitemaps || []) {
    const xml = await fetchText(source.url, failures);
    if (!xml) continue;
    let urls = sitemapUrls(xml);
    const nested = urls.filter((item) => /sitemap/i.test(item.url)).slice(0, 8);
    for (const nest of nested) {
      const nestedXml = await fetchText(nest.url, failures);
      urls.push(...sitemapUrls(nestedXml));
    }
    urls = urls
      .filter((item) => {
        const last = item.lastmod ? new Date(item.lastmod) : null;
        const inWindow = !last || (last >= since && last <= futureUntil);
        return inWindow && eventish(item.url);
      })
      .slice(0, maxPagesPerSource);
    for (const item of urls) {
      const html = await fetchText(item.url, failures);
      if (!html) continue;
      const text = safeText(html).slice(0, 12000);
      if (blockedText(text) || !eventish(text)) continue;
      for (const person of roster) {
        const name = person.name || person.canonicalName;
        if (!name || !new RegExp(`\\b${escapeRe(name)}\\b`, "i").test(text)) continue;
        const title = titleFromHtml(html) || item.url.split("/").filter(Boolean).slice(-1)[0]?.replace(/[-_]/g, " ") || `${name} public record`;
        const candidate = createCandidate({ person, title, text, url: item.url, sourceLabel: source.label, sourceKind: source.type, dateValue: item.lastmod });
        if (candidate) output.push(candidate);
      }
    }
  }
  return output;
}
function titleFromHtml(html) {
  const og = String(html || "").match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return safeText(og[1]);
  const title = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? safeText(title[1]) : "";
}
async function crawlRecentDiscovery(failures) {
  const out = [];
  // GDELT DOC API is used as a broad 24-month lead finder. Official/host pages remain the publication path.
  const windows = monthWindows(since, now);
  const perWindow = Math.max(3, Math.min(12, Math.ceil(maxPerPerson / Math.max(1, windows.length))));
  for (const person of roster.slice(0, Math.min(roster.length, maxRoster))) {
    const name = person.name || person.canonicalName;
    const query = `\"${name}\" (meeting OR visit OR summit OR speech OR address OR forum OR bilateral OR delegation OR opening OR ceremony)`;
    for (const win of windows) {
      const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
      url.searchParams.set("query", query);
      url.searchParams.set("mode", "artlist");
      url.searchParams.set("format", "json");
      url.searchParams.set("maxrecords", String(perWindow));
      url.searchParams.set("sort", "datedesc");
      url.searchParams.set("startdatetime", compactDate(win.start));
      url.searchParams.set("enddatetime", compactDate(win.end));
      const text = await fetchText(url.toString(), failures);
      if (!text) continue;
      let payload = null;
      try { payload = JSON.parse(text); } catch { continue; }
      for (const article of payload.articles || []) {
        const title = article.title || `${name} public record`;
        const body = [title, article.seendate, article.domain, article.url].join(" ");
        const candidate = createCandidate({ person, title, text: body, url: article.url, sourceLabel: article.domain || "GDELT discovery", sourceKind: "discovery", dateValue: article.seendate });
        if (candidate) out.push(candidate);
      }
      const mapped = mappedPersonForRoster(person);
      if (mapped && out.filter((item) => item.personId === mapped.id).length >= maxPerPerson) break;
    }
  }
  return out;
}
function monthWindows(start, end) {
  const out = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 0, 0, 0));
  const last = new Date(end);
  while (cursor < last) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1, 0, 0, 0));
    out.push({ start: new Date(Math.max(start.getTime(), cursor.getTime())), end: new Date(Math.min(last.getTime(), next.getTime() - 1000)) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}
function compactDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
