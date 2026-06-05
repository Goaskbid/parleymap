import fs from "fs";

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script id="demo-data" type="application\/json">([\s\S]*?)<\/script>/);

if (!match) {
  throw new Error("demo-data block not found in index.html");
}

const data = JSON.parse(match[1]);

const requiredArrays = [
  "categories",
  "people",
  "appearances",
  "roster",
  "topRoster",
  "watchlistExamples",
  "summits",
  "signals",
  "calls",
  "telephoneCalls",
  "eventAgendas",
  "alerts",
  "topicTags",
  "organizationProfiles",
  "powerCities",
  "openCatalogs",
  "expansionRoster",
  "priorityExpansion",
  "structuredSourceWatch"
];

const minimumCounts = {
  people: 90,
  roster: 190,
  expansionRoster: 100,
  appearances: 500,
  categories: 10
};

for (const key of requiredArrays) {
  if (!Array.isArray(data[key])) {
    throw new Error(`${key} must exist and must be an array`);
  }
}

for (const [key, min] of Object.entries(minimumCounts)) {
  if (!Array.isArray(data[key]) || data[key].length < min) {
    throw new Error(`${key} count too low. Expected at least ${min}, got ${data[key]?.length ?? "missing"}`);
  }
}

const requiredMeta = [
  "project",
  "name",
  "version",
  "iteration",
  "lastDataUpdate",
  "coverageSummary"
];

for (const key of requiredMeta) {
  if (!(key in data.meta)) {
    throw new Error(`meta.${key} missing`);
  }
}

const firstAppearance = data.appearances[0] || {};
const requiredAppearanceKeys = [
  "id",
  "personId",
  "startsAt",
  "status",
  "confidence",
  "eventType",
  "title",
  "location",
  "sourcePack"
];

for (const key of requiredAppearanceKeys) {
  if (!(key in firstAppearance)) {
    throw new Error(`appearance schema missing key: ${key}`);
  }
}

console.log("ParleyMap embedded dataset validation passed");
console.log({
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length,
  version: data.meta.version,
  lastDataUpdate: data.meta.lastDataUpdate
});
