import fs from "node:fs";

const INDEX_PATH = "index.html";
const CANDIDATE_PATH = "data/crawler/publishable-appearances.json";
const REPORT_PATH = "data/diagnostics/publish-report.json";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const REQUIRED_TOP_LEVEL_KEYS = [
  "meta",
  "categories",
  "people",
  "appearances",
  "encounters",
  "roster",
  "topRoster",
  "watchlistExamples",
  "sourceHealth",
  "summits",
  "signals",
  "calls",
  "telephoneCalls",
  "eventAgendas",
  "profileAuditSummary",
  "influenceEventCatalog",
  "globalConnectorCatalog",
  "frequentTravellerExpansion",
  "sourceRegistryNotes",
  "intelligenceModules",
  "eventAlertProduct",
  "eventIntelligencePriorities",
  "alerts",
  "topicTags",
  "organizationProfiles",
  "powerCities",
  "topicMigrations",
  "influenceTimeline",
  "eventGraphNotes",
  "openCatalogs",
  "expansionRoster",
  "priorityExpansion",
  "structuredSourceWatch"
];

const REQUIRED_ARRAYS = [
  "categories",
  "people",
  "appearances",
  "roster",
  "expansionRoster"
];

const MINIMUM_COUNTS = {
  people: 90,
  roster: 190,
  expansionRoster: 100,
  appearances: 500,
  categories: 10
};

const REQUIRED_APPEARANCE_KEYS = [
  "id",
  "personId",
  "startsAt",
  "endsAt",
  "status",
  "confidence",
  "confidenceLabel",
  "eventType",
  "title",
  "summary",
  "significance",
  "decisions",
  "location",
  "venuePublic",
  "securityPrecision",
  "publicInterestScore",
  "eventGroupId",
  "topics",
  "counterpartIds",
  "sourcePack",
  "visual",
  "lastCheckedAt",
  "marketImpact"
];

function readEmbeddedData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);

  if (start === -1) {
    throw new Error("demo-data opening script tag not found in index.html");
  }

  const jsonStart = start + OPEN_TAG.length;
  const end = html.indexOf(CLOSE_TAG, jsonStart);

  if (end === -1) {
    throw new Error("demo-data closing script tag not found in index.html");
  }

  const jsonText = html.slice(jsonStart, end).trim();

  return {
    html,
    jsonStart,
    jsonEnd: end,
    data: JSON.parse(jsonText)
  };
}

function count(value) {
  return Array.isArray(value) ? value.length : null;
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function validateLiveShape(data, label) {
  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in data)) {
      throw new Error(`${label}: missing top-level key ${key}`);
    }
  }

  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(data[key])) {
      throw new Error(`${label}: ${key} must be an array`);
    }
  }

  for (const [key, minimum] of Object.entries(MINIMUM_COUNTS)) {
    if (data[key].length < minimum) {
      throw new Error(`${label}: ${key} count too low. Expected at least ${minimum}, got ${data[key].length}`);
    }
  }

  if (!data.meta || typeof data.meta !== "object" || Array.isArray(data.meta)) {
    throw new Error(`${label}: meta must be an object`);
  }
}

function normalizeCandidatePayload(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.appearances)) return raw.appearances;
  if (Array.isArray(raw.publishableAppearances)) return raw.publishableAppearances;
  if (Array.isArray(raw.records)) return raw.records;

  throw new Error("Candidate file does not contain an appearances array");
}

function hasUsableCandidateShape(item) {
  return Boolean(
    item &&
    typeof item === "object" &&
    item.id &&
    item.personId &&
    item.startsAt &&
    item.title &&
    item.location &&
    typeof item.location === "object" &&
    Array.isArray(item.sourcePack) &&
    item.sourcePack.length > 0
  );
}

function validateAppearanceShape(item, label) {
  for (const key of REQUIRED_APPEARANCE_KEYS) {
    if (!(key in item)) {
      throw new Error(`${label}: missing appearance key ${key}`);
    }
  }

  if (!item.location || typeof item.location !== "object" || Array.isArray(item.location)) {
    throw new Error(`${label}: location must be an object`);
  }

  if (!Array.isArray(item.sourcePack) || item.sourcePack.length === 0) {
    throw new Error(`${label}: sourcePack must be a non-empty array`);
  }

  if (!Array.isArray(item.topics)) {
    throw new Error(`${label}: topics must be an array`);
  }

  if (!Array.isArray(item.counterpartIds)) {
    throw new Error(`${label}: counterpartIds must be an array`);
  }
}

function toAppearance(candidate, nowIso) {
  const location = candidate.location;
  const startsAt = String(candidate.startsAt);
  const datePart = startsAt.slice(0, 10);
  const cityPart = slug(location.city || location.label || "public-location");

  const appearance = {
    id: String(candidate.id),
    personId: String(candidate.personId),
    startsAt,
    endsAt: candidate.endsAt ?? null,
    status: candidate.status || (new Date(startsAt) > new Date() ? "ANNOUNCED_FUTURE" : "VERIFIED_PAST"),
    confidence: Number(candidate.confidence ?? 0.82),
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
    }
  };

  if (candidate.verificationLevel) appearance.verificationLevel = candidate.verificationLevel;
  if (candidate.importanceScore !== undefined) appearance.importanceScore = candidate.importanceScore;
  if (candidate.peaceProcess !== undefined) appearance.peaceProcess = candidate.peaceProcess;
  if (candidate.crawler) appearance.crawler = candidate.crawler;

  validateAppearanceShape(appearance, `candidate ${appearance.id}`);

  return appearance;
}

function mergeAppearances(existing, candidates, nowIso) {
  const byId = new Map();

  for (const item of existing) {
    if (item && item.id) {
      byId.set(String(item.id), item);
    }
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (!hasUsableCandidateShape(candidate)) {
      skipped++;
      continue;
    }

    const appearance = toAppearance(candidate, nowIso);
    const id = String(appearance.id);

    if (byId.has(id)) {
      byId.set(id, {
        ...byId.get(id),
        ...appearance
      });
      updated++;
    } else {
      byId.set(id, appearance);
      added++;
    }
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    return String(b.startsAt || "").localeCompare(String(a.startsAt || ""));
  });

  return {
    merged,
    added,
    updated,
    skipped
  };
}

function writeReport(report) {
  fs.mkdirSync("data/diagnostics", { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
}

const nowIso = new Date().toISOString();

const before = readEmbeddedData();
validateLiveShape(before.data, "before");

if (!fs.existsSync(CANDIDATE_PATH)) {
  throw new Error(`${CANDIDATE_PATH} not found. The crawler did not produce a candidate file.`);
}

const rawCandidate = JSON.parse(fs.readFileSync(CANDIDATE_PATH, "utf8"));
const candidates = normalizeCandidatePayload(rawCandidate);

const beforeCounts = {
  people: count(before.data.people),
  roster: count(before.data.roster),
  expansionRoster: count(before.data.expansionRoster),
  appearances: count(before.data.appearances),
  categories: count(before.data.categories)
};

if (candidates.length === 0) {
  const report = {
    generatedAt: nowIso,
    candidatePath: CANDIDATE_PATH,
    candidateCount: 0,
    before: beforeCounts,
    status: "no_publishable_candidates_index_not_changed"
  };

  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const merge = mergeAppearances(before.data.appearances, candidates, nowIso);

if (merge.added + merge.updated === 0) {
  const report = {
    generatedAt: nowIso,
    candidatePath: CANDIDATE_PATH,
    candidateCount: candidates.length,
    added: merge.added,
    updated: merge.updated,
    skipped: merge.skipped,
    before: beforeCounts,
    status: "no_new_or_updated_appearances_index_not_changed"
  };

  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const afterData = structuredClone(before.data);
afterData.appearances = merge.merged;
afterData.meta = {
  ...afterData.meta,
  lastDataUpdate: nowIso,
  lastCrawlerRun: nowIso,
  crawlerStatus: `nightly crawler merged ${merge.added} new and ${merge.updated} updated public-source records`
};

validateLiveShape(afterData, "after");

const afterCounts = {
  people: count(afterData.people),
  roster: count(afterData.roster),
  expansionRoster: count(afterData.expansionRoster),
  appearances: count(afterData.appearances),
  categories: count(afterData.categories)
};

if (afterCounts.people !== beforeCounts.people) throw new Error("people count changed unexpectedly");
if (afterCounts.roster !== beforeCounts.roster) throw new Error("roster count changed unexpectedly");
if (afterCounts.expansionRoster !== beforeCounts.expansionRoster) throw new Error("expansionRoster count changed unexpectedly");
if (afterCounts.categories !== beforeCounts.categories) throw new Error("categories count changed unexpectedly");
if (afterCounts.appearances < beforeCounts.appearances) throw new Error("appearances count went down");

const beforeKeys = Object.keys(before.data).sort();
const afterKeys = Object.keys(afterData).sort();

if (JSON.stringify(beforeKeys) !== JSON.stringify(afterKeys)) {
  throw new Error("top-level keys changed unexpectedly");
}

const nextJson = JSON.stringify(afterData, null, 2);
const nextHtml = before.html.slice(0, before.jsonStart) + "\n" + nextJson + "\n" + before.html.slice(before.jsonEnd);

fs.writeFileSync(INDEX_PATH, nextHtml);

const report = {
  generatedAt: nowIso,
  candidatePath: CANDIDATE_PATH,
  candidateCount: candidates.length,
  added: merge.added,
  updated: merge.updated,
  skipped: merge.skipped,
  before: beforeCounts,
  after: afterCounts,
  preservedTopLevelKeys: Object.keys(before.data),
  status: "published_to_index_html"
};

writeReport(report);
console.log(JSON.stringify(report, null, 2));
