import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/force-map-anchor-repair-report.json";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const COLLECTIONS = [
  "people",
  "roster",
  "topRoster",
  "expansionRoster",
  "priorityExpansion"
];

const TARGETS = [
  {
    id: "claudia_sheinbaum",
    required: ["claudia", "sheinbaum"],
    base: {
      label: "Mexico City institutional base",
      city: "Mexico City",
      countryCode: "MX",
      countryName: "Mexico",
      lat: 19.4326,
      lng: -99.1332,
      region: "North America"
    }
  },
  {
    id: "pope_leo_xiv",
    any: ["pope leo xiv", "leo xiv", "robert prevost", "robert francis prevost", "pontiff", "bishop of rome", "pope"],
    base: {
      label: "Vatican City institutional base",
      city: "Vatican City",
      countryCode: "VA",
      countryName: "Vatican City",
      lat: 41.9029,
      lng: 12.4534,
      region: "Europe"
    }
  },
  {
    id: "prabowo_subianto",
    required: ["prabowo", "subianto"],
    base: {
      label: "Jakarta institutional base",
      city: "Jakarta",
      countryCode: "ID",
      countryName: "Indonesia",
      lat: -6.2088,
      lng: 106.8456,
      region: "Asia"
    }
  }
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

function profileBlob(item) {
  return norm([
    item.id,
    item.slug,
    item.name,
    item.canonicalName,
    item.roleTitle,
    item.organization,
    item.category,
    item.country,
    item.countryName,
    item.countryFocus,
    item.countryFocusCode,
    item.profileLine,
    Array.isArray(item.profileLines) ? item.profileLines.join(" ") : ""
  ].join(" "));
}

function matchesTarget(item, target) {
  const text = profileBlob(item);

  const requiredOk = !target.required || target.required.every((token) => text.includes(norm(token)));
  const anyOk = !target.any || target.any.some((token) => text.includes(norm(token)));

  return requiredOk && anyOk;
}

function cloneAnchor(base) {
  return {
    label: base.label,
    city: base.city,
    countryCode: base.countryCode,
    countryName: base.countryName,
    lat: base.lat,
    lng: base.lng,
    latitude: base.lat,
    longitude: base.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function snapshot(item) {
  return {
    countryFocus: item.countryFocus ?? null,
    countryFocusCode: item.countryFocusCode ?? null,
    countryName: item.countryName ?? null,
    homeRegion: item.homeRegion ?? null,
    locationStatus: item.locationStatus ?? null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    homeLat: item.homeLat ?? null,
    homeLng: item.homeLng ?? null,
    mapLat: item.mapLat ?? null,
    mapLng: item.mapLng ?? null,
    anchorLat: item.anchorLat ?? null,
    anchorLng: item.anchorLng ?? null,
    homeBases: Array.isArray(item.homeBases) ? item.homeBases : null,
    homeBase: item.homeBase ?? null,
    mapAnchor: item.mapAnchor ?? null,
    anchorLocation: item.anchorLocation ?? null,
    baseLocation: item.baseLocation ?? null
  };
}

function applyBase(item, base) {
  const anchor = cloneAnchor(base);

  item.countryFocus = base.countryCode;
  item.countryFocusCode = base.countryCode;
  item.countryName = base.countryName;
  item.homeRegion = base.region;
  item.locationStatus = "institutional_base_city_level";

  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;
  item.baseLocation = anchor;
  item.institutionalBase = anchor;

  item.lat = base.lat;
  item.lng = base.lng;
  item.latitude = base.lat;
  item.longitude = base.lng;
  item.homeLat = base.lat;
  item.homeLng = base.lng;
  item.mapLat = base.lat;
  item.mapLng = base.lng;
  item.anchorLat = base.lat;
  item.anchorLng = base.lng;
  item.baseLat = base.lat;
  item.baseLng = base.lng;

  item.coordinates = { lat: base.lat, lng: base.lng };
  item.geo = { lat: base.lat, lng: base.lng };

  item.flagAudit = {
    ...(item.flagAudit || {}),
    status: "country flag",
    code: base.countryCode,
    label: base.countryName
  };
}

function validateCounts(data) {
  const required = ["people", "roster", "expansionRoster", "appearances", "categories"];

  for (const key of required) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }

  if (data.people.length < 90) throw new Error("people count too low");
  if (data.roster.length < 190) throw new Error("roster count too low");
  if (data.expansionRoster.length < 100) throw new Error("expansionRoster count too low");
  if (data.appearances.length < 500) throw new Error("appearances count too low");
  if (data.categories.length < 10) throw new Error("categories count too low");
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const payload = readEmbeddedData();
const data = payload.data;
validateCounts(data);

const beforeCounts = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

const fixes = [];
const matchedTargets = new Set();

for (const collection of COLLECTIONS) {
  const rows = Array.isArray(data[collection]) ? data[collection] : [];

  rows.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;

    for (const target of TARGETS) {
      if (!matchesTarget(item, target)) continue;

      const from = snapshot(item);
      applyBase(item, target.base);
      const to = snapshot(item);

      matchedTargets.add(target.id);
      fixes.push({
        target: target.id,
        collection,
        index,
        id: item.id || null,
        slug: item.slug || null,
        name: item.canonicalName || item.name || null,
        from,
        to
      });
    }
  });
}

const missingTargets = TARGETS
  .map((target) => target.id)
  .filter((id) => !matchedTargets.has(id));

if (missingTargets.length > 0) {
  throw new Error(`No matching records found for: ${missingTargets.join(", ")}`);
}

data.meta = {
  ...data.meta,
  lastManualMapAnchorRepair: new Date().toISOString(),
  mapAnchorRepairStatus: `forced ${fixes.length} anchor fixes for Sheinbaum, Pope Leo XIV and Prabowo Subianto`
};

validateCounts(data);

const afterCounts = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

for (const key of Object.keys(beforeCounts)) {
  if (beforeCounts[key] !== afterCounts[key]) {
    throw new Error(`${key} count changed unexpectedly`);
  }
}

writeEmbeddedData(payload, data);

const report = {
  generatedAt: new Date().toISOString(),
  before: beforeCounts,
  after: afterCounts,
  fixes,
  status: "force_map_anchor_repair_applied"
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
