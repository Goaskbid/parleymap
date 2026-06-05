import fs from "fs";

const INDEX_PATH = "index.html";
const CANDIDATE_PATH = "data/crawler/publishable-appearances.json";
const REPORT_PATH = "data/diagnostics/publish-report.json";

function readEmbeddedData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const match = html.match(/<script id="demo-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("demo-data block not found in index.html");
  return { html, jsonText: match[1], data: JSON.parse(match[1]) };
}

function count(v) {
  return Array.isArray(v) ? v.length : null;
}

function validateLiveShape(data, label) {
  const requiredKeys = [
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

  for (const key of requiredKeys) {
    if (!(key in data)) throw new Error(`${label}: missing top-level key ${key}`);
  }

  for (const key of ["categories", "people", "appearances", "roster", "expansionRoster"]) {
    if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  }

  const minimumCounts = {
    people: 90,
    roster: 190,
    expansionRoster: 100,
    appearances: 500,
    categories: 10
  };

  for (const [key, min] of Object.entries(minimumCounts)) {
    if (data[key].length < min) {
      throw new Error(`${label}: ${key} count too low. Expected at least ${min}, got ${data[key].length}`);
    }
  }

  if (!data.meta || typeof data.meta !== "object" || Array.isArray(data.meta)) {
    throw new Error(`${label}: meta must be an object`);
  }
}

function normalizeCandidate(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.appearances)) return raw.appearances;
  if (Array.isArray(raw.publishableAppearances)) return raw.publishableAppearances;
  if (Array.isArray(raw.records)) return raw.records;
  throw new Error("Candidate file does not contain an appearances array");
}

function isUsableAppearance(item) {
  return item &&
    typeof item === "object" &&
    item.id &&
    item.personId &&
    item.startsAt &&
    item.title &&
    item.location &&
    item.sourcePack;
}

function mergeAppearances(existing, candidates) {
  const byId = new Map();

  for (const item of existing) {
    if (item && item.id) byId.set(String(item.id), item);
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of candidates) {
    if (!isUsableAppearance(item)) {
      skipped++;
      continue;
    }

    const id = String(item.id);
    if (byId.has(id)) {
      byId.set(id, { ...byId.get(id), ...item });
      updated++;
    } else {
      byId.set(id, item);
      added++;
    }
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    const aa = String(a.startsAt || "");
    const bb = String(b.startsAt || "");
    return bb.localeCompare(aa);
  });

  return { merged, added, updated, skipped };
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const before = readEmbeddedData();
validateLiveShape(before.data, "before");

if (!fs.existsSync(CANDIDATE_PATH)) {
  throw new Error(`${CANDIDATE_PATH} not found. Run the crawler workflow first.`);
}

const rawCandidate = JSON.parse(fs.readFileSync(CANDIDATE_PATH, "utf8"));
const candidates = normalizeCandidate(rawCandidate);

const oldCounts = {
  people: count(before.data.people),
  roster: count(before.data.roster),
  expansionRoster: count(before.data.expansionRoster),
  appearances: count(before.data.appearances),
  categories: count(before.data.categories)
};

const { merged, added, updated, skipped } = mergeAppearances(before.data.appearances, candidates);

const afterData = structuredClone(before.data);
afterData.appearances = merged;
afterData.meta = {
  ...afterData.meta,
  lastDataUpdate: new Date().toISOString(),
  lastCrawlerRun: new Date().toISOString()
};

validateLiveShape(afterData, "after");

const newCounts = {
  people: count(afterData.people),
  roster: count(afterData.roster),
  expansionRoster: count(afterData.expansionRoster),
  appearances: count(afterData.appearances),
  categories: count(afterData.categories)
};

if (newCounts.people !== oldCounts.people) throw new Error("people count changed unexpectedly");
if (newCounts.roster !== oldCounts.roster) throw new Error("roster count changed unexpectedly");
if (newCounts.expansionRoster !== oldCounts.expansionRoster) throw new Error("expansionRoster count changed unexpectedly");
if (newCounts.categories !== oldCounts.categories) throw new Error("categories count changed unexpectedly");
if (newCounts.appearances < oldCounts.appearances) throw new Error("appearances count went down");

const nextJson = JSON.stringify(afterData, null, 2);
const nextHtml = before.html.replace(
  /<script id="demo-data" type="application\/json">([\s\S]*?)<\/script>/,
  `<script id="demo-data" type="application/json">${nextJson}</script>`
);

fs.writeFileSync(INDEX_PATH, nextHtml);

const report = {
  generatedAt: new Date().toISOString(),
  candidatePath: CANDIDATE_PATH,
  candidateCount: candidates.length,
  added,
  updated,
  skipped,
  before: oldCounts,
  after: newCounts,
  preservedTopLevelKeys: Object.keys(before.data),
  status: "published_to_index_html"
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify(report, null, 2));
