import fs from "node:fs";

const INDEX_PATH = "index.html";
const CANDIDATE_PATH = "data/crawler/publishable-appearances.json";
const APPROVED_PATH = "data/crawler/quality-approved-appearances.json";
const REJECTED_PATH = "data/crawler/rejected-appearances.json";
const REPORT_PATH = "data/diagnostics/publish-report.json";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const GENERIC_TITLE_RE = /\b(faq|foire aux questions|frequently asked|programme|program|programmation|cultural|culturel|organiser|organizer|fact sheet|privacy|terms|search|sitemap|cookie|home page)\b/i;

function readEmbeddedData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);

  if (start === -1) throw new Error("demo-data opening tag not found");

  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);

  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");

  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());

  return { html, jsonStart, jsonEnd, data };
}

function writeEmbeddedData(payload, data) {
  const nextHtml =
    payload.html.slice(0, payload.jsonStart) +
    "\n" +
    JSON.stringify(data, null, 2) +
    "\n" +
    payload.html.slice(payload.jsonEnd);

  fs.writeFileSync(INDEX_PATH, nextHtml);
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return norm(value).replace(/ /g, "-").slice(0, 80);
}

function sourceUrls(item) {
  return Array.isArray(item.sourcePack)
    ? item.sourcePack.map((source) => source.url || "").filter(Boolean)
    : [];
}

function evidenceText(item) {
  return [
    item.title,
    item.summary,
    item.personName,
    ...sourceUrls(item)
  ].join(" ");
}

function hasOfficialSource(item) {
  if (!Array.isArray(item.sourcePack)) return false;

  return item.sourcePack.some((source) => {
    const type = String(source.type || "");
    const reliability = String(source.reliability || "");

    return type.includes("official") || type.includes("host") || reliability.includes("primary") || reliability.includes("host");
  });
}

function hasPersonEvidence(item) {
  const text = norm(evidenceText(item));
  const full = norm(item.personName || "");

  if (full && text.includes(full)) return true;

  const meaningfulParts = full
    .split(" ")
    .filter((part) => part.length >= 4)
    .filter((part) => !["president", "prime", "minister", "secretary", "general"].includes(part));

  return meaningfulParts.some((part) => text.includes(part));
}

function hasLocationEvidence(item) {
  const text = norm(evidenceText(item));
  const city = norm(item.location?.city || "");
  const country = norm(item.location?.countryName || "");

  if (city && text.includes(city)) return true;
  if (country && text.includes(country)) return true;

  return false;
}

function qualityReasons(item) {
  const reasons = [];

  if (!item || typeof item !== "object") {
    return ["not_an_object"];
  }

  if (!item.id) reasons.push("missing_id");
  if (!item.personId) reasons.push("missing_personId");
  if (!item.startsAt || Number.isNaN(Date.parse(item.startsAt))) reasons.push("bad_or_missing_date");
  if (!item.title) reasons.push("missing_title");
  if (!item.location || typeof item.location !== "object") reasons.push("missing_location");
  if (!Array.isArray(item.sourcePack) || item.sourcePack.length === 0) reasons.push("missing_sourcePack");

  const text = evidenceText(item);

  if (GENERIC_TITLE_RE.test(text)) reasons.push("generic_or_non_event_page");
  if (!hasOfficialSource(item)) reasons.push("no_official_or_host_source");
  if (!hasPersonEvidence(item)) reasons.push("person_not_clearly_evidenced");
  if (!hasLocationEvidence(item)) reasons.push("location_not_clearly_evidenced");

  if (norm(item.location?.city) === "geneva") {
    const textNorm = norm(text);
    if (!textNorm.includes("geneva") && !textNorm.includes("switzerland")) {
      reasons.push("geneva_fallback_without_evidence");
    }
  }

  if (Number(item.confidence ?? 0) < 0.8) {
    reasons.push("confidence_below_0_8");
  }

  return reasons;
}

function readCandidates() {
  if (!fs.existsSync(CANDIDATE_PATH)) return [];

  const raw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, "utf8"));

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.appearances)) return raw.appearances;
  if (Array.isArray(raw.publishableAppearances)) return raw.publishableAppearances;
  if (Array.isArray(raw.records)) return raw.records;

  return [];
}

function validateLiveShape(data, label) {
  for (const key of ["meta", "people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!(key in data)) throw new Error(`${label}: missing ${key}`);
  }

  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  }

  if (data.people.length < 90) throw new Error(`${label}: people count too low`);
  if (data.roster.length < 190) throw new Error(`${label}: roster count too low`);
  if (data.expansionRoster.length < 100) throw new Error(`${label}: expansionRoster count too low`);
  if (data.appearances.length < 500) throw new Error(`${label}: appearances count too low`);
}

function toAppearance(candidate, nowIso) {
  const startsAt = String(candidate.startsAt);
  const location = candidate.location;
  const cityPart = slug(location.city || location.label || "public-location");
  const datePart = slug(startsAt.slice(0, 10));

  return {
    id: String(candidate.id),
    personId: String(candidate.personId),
    startsAt,
    endsAt: candidate.endsAt ?? null,
    status: candidate.status || (new Date(startsAt) > new Date() ? "ANNOUNCED_FUTURE" : "VERIFIED_PAST"),
    confidence: Number(candidate.confidence ?? 0.86),
    confidenceLabel: candidate.confidenceLabel || "official or host-public source",
    eventType: candidate.eventType || "PUBLIC_APPEARANCE",
    title: String(candidate.title).slice(0, 180),
    summary: candidate.summary || String(candidate.title),
    significance: candidate.significance || "Crawler-added public-source appearance.",
    decisions: candidate.decisions || "",
    location,
    venuePublic: candidate.venuePublic ?? true,
    securityPrecision: candidate.securityPrecision || "city-level public appearance only; no private stops, hotels, residences, leaked routes or live proximity",
    publicInterestScore: Number(candidate.publicInterestScore ?? candidate.importanceScore ?? 50),
    eventGroupId: candidate.eventGroupId || `eg-${cityPart}-${datePart}`,
    topics: Array.isArray(candidate.topics) ? candidate.topics : [],
    counterpartIds: Array.isArray(candidate.counterpartIds) ? candidate.counterpartIds : [],
    sourcePack: candidate.sourcePack,
    visual: candidate.visual || {
      status: "runtime portrait",
      policy: "Use only audited public media with attribution."
    },
    lastCheckedAt: candidate.lastCheckedAt || nowIso,
    marketImpact: candidate.marketImpact || {
      sectors: [],
      companies: [],
      countries: location.countryName ? [location.countryName] : [],
      confidence: "low"
    },
    crawler: candidate.crawler || {
      detectedAt: nowIso,
      rule: "quality gated crawler"
    }
  };
}

function mergeAppearances(existing, approved, nowIso) {
  const byId = new Map();

  for (const item of existing) {
    if (item && item.id) byId.set(String(item.id), item);
  }

  let added = 0;
  let updated = 0;

  for (const candidate of approved) {
    const appearance = toAppearance(candidate, nowIso);
    const id = String(appearance.id);

    if (byId.has(id)) {
      byId.set(id, { ...byId.get(id), ...appearance });
      updated++;
    } else {
      byId.set(id, appearance);
      added++;
    }
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    return String(b.startsAt || "").localeCompare(String(a.startsAt || ""));
  });

  return { merged, added, updated };
}

fs.mkdirSync("data/crawler", { recursive: true });
fs.mkdirSync("data/diagnostics", { recursive: true });

const nowIso = new Date().toISOString();
const payload = readEmbeddedData();
const data = payload.data;

validateLiveShape(data, "before");

const candidates = readCandidates();
const approved = [];
const rejected = [];

for (const candidate of candidates) {
  const reasons = qualityReasons(candidate);

  if (reasons.length === 0) {
    approved.push(candidate);
  } else {
    rejected.push({
      id: candidate?.id || null,
      personId: candidate?.personId || null,
      personName: candidate?.personName || null,
      title: candidate?.title || null,
      city: candidate?.location?.city || null,
      sourceUrl: sourceUrls(candidate)[0] || null,
      reasons
    });
  }
}

fs.writeFileSync(APPROVED_PATH, JSON.stringify(approved, null, 2) + "\n");
fs.writeFileSync(REJECTED_PATH, JSON.stringify(rejected, null, 2) + "\n");
fs.writeFileSync(CANDIDATE_PATH, JSON.stringify(approved, null, 2) + "\n");

const before = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

if (approved.length === 0) {
  const report = {
    generatedAt: nowIso,
    candidatePath: CANDIDATE_PATH,
    candidateCount: candidates.length,
    approved: 0,
    rejected: rejected.length,
    before,
    after: before,
    status: "no_approved_candidates_index_not_changed"
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const merge = mergeAppearances(data.appearances, approved, nowIso);

const afterData = structuredClone(data);
afterData.appearances = merge.merged;
afterData.meta = {
  ...afterData.meta,
  lastDataUpdate: nowIso,
  lastCrawlerRun: nowIso,
  crawlerStatus: `quality gated crawler merged ${merge.added} new and ${merge.updated} updated public-source records`
};

validateLiveShape(afterData, "after");

const after = {
  people: afterData.people.length,
  roster: afterData.roster.length,
  expansionRoster: afterData.expansionRoster.length,
  appearances: afterData.appearances.length,
  categories: afterData.categories.length
};

if (after.people !== before.people) throw new Error("people count changed unexpectedly");
if (after.roster !== before.roster) throw new Error("roster count changed unexpectedly");
if (after.expansionRoster !== before.expansionRoster) throw new Error("expansionRoster count changed unexpectedly");
if (after.categories !== before.categories) throw new Error("categories count changed unexpectedly");
if (after.appearances < before.appearances) throw new Error("appearances count went down");

writeEmbeddedData(payload, afterData);

const report = {
  generatedAt: nowIso,
  candidatePath: CANDIDATE_PATH,
  candidateCount: candidates.length,
  approved: approved.length,
  rejected: rejected.length,
  added: merge.added,
  updated: merge.updated,
  before,
  after,
  status: "published_to_index_html"
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
