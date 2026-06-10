import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/repair-report.json";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const BAD_CRAWLER_TITLE_RE = /\b(faq|foire aux questions|frequently asked|programme|program|programmation|cultural|culturel|organiser|organizer|fact sheet|privacy|terms|search|sitemap|cookie)\b/i;

const BASES = {
  SA: {
    label: "Riyadh institutional base",
    city: "Riyadh",
    countryCode: "SA",
    countryName: "Saudi Arabia",
    lat: 24.7136,
    lng: 46.6753,
    region: "Middle East"
  },
  AE: {
    label: "Abu Dhabi institutional base",
    city: "Abu Dhabi",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    lat: 24.4539,
    lng: 54.3773,
    region: "Middle East"
  },
  QA: {
    label: "Doha institutional base",
    city: "Doha",
    countryCode: "QA",
    countryName: "Qatar",
    lat: 25.2854,
    lng: 51.531,
    region: "Middle East"
  },
  IR: {
    label: "Tehran institutional base",
    city: "Tehran",
    countryCode: "IR",
    countryName: "Iran",
    lat: 35.6892,
    lng: 51.389,
    region: "Middle East"
  },
  TR: {
    label: "Ankara institutional base",
    city: "Ankara",
    countryCode: "TR",
    countryName: "Turkey",
    lat: 39.9334,
    lng: 32.8597,
    region: "Middle East"
  },
  IN: {
    label: "New Delhi institutional base",
    city: "New Delhi",
    countryCode: "IN",
    countryName: "India",
    lat: 28.6139,
    lng: 77.209,
    region: "South Asia"
  }
};

const NAMED_FIXES = [
  { needles: ["mohammed", "salman"], code: "SA" },
  { needles: ["mohammad", "salman"], code: "SA" },
  { needles: ["muhammad", "salman"], code: "SA" },
  { needles: ["mbs"], code: "SA" },
  { needles: ["mohammed", "zayed"], code: "AE" },
  { needles: ["mohamed", "zayed"], code: "AE" },
  { needles: ["nahyan"], code: "AE" },
  { needles: ["tamim"], code: "QA" },
  { needles: ["khamenei"], code: "IR" },
  { needles: ["pezeshkian"], code: "IR" },
  { needles: ["erdogan"], code: "TR" },
  { needles: ["modi"], code: "IN" }
];

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
  const nextJson = JSON.stringify(data, null, 2);
  const nextHtml =
    payload.html.slice(0, payload.jsonStart) +
    "\n" +
    nextJson +
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

function sourceUrls(item) {
  return Array.isArray(item.sourcePack)
    ? item.sourcePack.map((source) => source.url || "").filter(Boolean)
    : [];
}

function locationEvidence(item) {
  const city = norm(item.location?.city);
  const country = norm(item.location?.countryName);
  const evidence = norm([item.title, item.summary, ...sourceUrls(item)].join(" "));

  if (city && evidence.includes(city)) return true;
  if (country && evidence.includes(country)) return true;

  return false;
}

function isBadCrawlerAppearance(item) {
  if (!item || typeof item !== "object") return false;
  if (!String(item.id || "").startsWith("crawl-")) return false;

  const evidence = [item.title, item.summary, ...sourceUrls(item)].join(" ");

  if (BAD_CRAWLER_TITLE_RE.test(evidence)) return true;
  if (!locationEvidence(item)) return true;

  return false;
}

function isInvalidBase(base) {
  if (!base || typeof base !== "object") return true;

  const lat = Number(base.lat);
  const lng = Number(base.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  if (Math.abs(lat) < 1 && Math.abs(lng) < 1) return true;

  return false;
}

function objectBlob(item) {
  return norm([
    item.id,
    item.slug,
    item.name,
    item.canonicalName,
    item.roleTitle,
    item.organization,
    item.countryName,
    item.countryFocus,
    item.countryFocusCode
  ].join(" "));
}

function matchNamedFix(item) {
  const blob = objectBlob(item);

  return NAMED_FIXES.find((fix) => {
    return fix.needles.every((needle) => blob.includes(norm(needle)));
  });
}

function buildHomeBase(base) {
  return {
    label: base.label,
    city: base.city,
    countryCode: base.countryCode,
    countryName: base.countryName,
    lat: base.lat,
    lng: base.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function applyBase(item, base) {
  item.countryFocus = base.countryCode;
  item.countryFocusCode = base.countryCode;
  item.countryName = base.countryName;
  item.homeRegion = item.homeRegion || base.region;
  item.locationStatus = "institutional_base_city_level";
  item.homeBases = [buildHomeBase(base)];
}

function repairCollection(collectionName, data, changes) {
  const collection = Array.isArray(data[collectionName]) ? data[collectionName] : [];

  for (const item of collection) {
    const namedFix = matchNamedFix(item);

    if (namedFix && BASES[namedFix.code]) {
      applyBase(item, BASES[namedFix.code]);
      changes.homeBaseFixes.push({
        collection: collectionName,
        id: item.id || null,
        name: item.canonicalName || item.name || null,
        city: BASES[namedFix.code].city,
        countryCode: BASES[namedFix.code].countryCode,
        reason: "named_fix"
      });
      continue;
    }

    if (collectionName !== "people") continue;

    const currentBase = Array.isArray(item.homeBases) ? item.homeBases[0] : null;
    const code = item.countryFocusCode || item.countryFocus;

    if (isInvalidBase(currentBase) && BASES[code]) {
      applyBase(item, BASES[code]);
      changes.homeBaseFixes.push({
        collection: collectionName,
        id: item.id || null,
        name: item.canonicalName || item.name || null,
        city: BASES[code].city,
        countryCode: BASES[code].countryCode,
        reason: "invalid_or_missing_base"
      });
    }
  }
}

function validate(data) {
  for (const key of ["meta", "people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!(key in data)) throw new Error(`missing key ${key}`);
  }

  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }

  if (data.people.length < 90) throw new Error("people count too low");
  if (data.roster.length < 190) throw new Error("roster count too low");
  if (data.expansionRoster.length < 100) throw new Error("expansionRoster count too low");
  if (data.appearances.length < 500) throw new Error("appearances count too low");
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const payload = readEmbeddedData();
const data = payload.data;

validate(data);

const before = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

const changes = {
  removedCrawlerAppearances: [],
  homeBaseFixes: []
};

data.appearances = data.appearances.filter((item) => {
  if (!isBadCrawlerAppearance(item)) return true;

  changes.removedCrawlerAppearances.push({
    id: item.id || null,
    personId: item.personId || null,
    title: item.title || null,
    city: item.location?.city || null,
    sourceUrl: sourceUrls(item)[0] || null
  });

  return false;
});

repairCollection("people", data, changes);
repairCollection("roster", data, changes);
repairCollection("expansionRoster", data, changes);

data.meta = {
  ...data.meta,
  lastDataUpdate: new Date().toISOString(),
  lastRepairRun: new Date().toISOString()
};

validate(data);

const after = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

writeEmbeddedData(payload, data);

const report = {
  generatedAt: new Date().toISOString(),
  before,
  after,
  removedCrawlerAppearances: changes.removedCrawlerAppearances,
  homeBaseFixes: changes.homeBaseFixes,
  status: "live_dataset_repaired"
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
