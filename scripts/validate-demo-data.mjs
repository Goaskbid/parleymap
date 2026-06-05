import fs from "fs";

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script id="demo-data" type="application\/json">([\s\S]*?)<\/script>/);

if (!match) throw new Error("demo-data block not found in index.html");

const data = JSON.parse(match[1]);

const requiredTopLevelKeys = [
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

for (const key of requiredTopLevelKeys) {
  if (!(key in data)) throw new Error(`missing top-level key: ${key}`);
}

const requiredArrays = [
  "categories",
  "people",
  "appearances",
  "roster",
  "expansionRoster"
];

for (const key of requiredArrays) {
  if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
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
    throw new Error(`${key} count too low. Expected at least ${min}, got ${data[key].length}`);
  }
}

if (!data.meta || typeof data.meta !== "object" || Array.isArray(data.meta)) {
  throw new Error("meta must be an object");
}

for (const key of ["project", "name", "version", "iteration", "lastDataUpdate", "coverageSummary"]) {
  if (!(key in data.meta)) throw new Error(`meta.${key} missing`);
}

const firstAppearance = data.appearances[0] || {};
for (const key of ["id", "personId", "startsAt", "status", "confidence", "eventType", "title", "location", "sourcePack"]) {
  if (!(key in firstAppearance)) throw new Error(`appearance schema missing key: ${key}`);
}

const firstPerson = data.people[0] || {};
for (const key of ["id", "slug", "canonicalName", "category", "roleTitle", "organization"]) {
  if (!(key in firstPerson)) throw new Error(`person schema missing key: ${key}`);
}

console.log("ParleyMap embedded dataset validation passed");
console.log(JSON.stringify({
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length,
  version: data.meta.version,
  lastDataUpdate: data.meta.lastDataUpdate
}, null, 2));
