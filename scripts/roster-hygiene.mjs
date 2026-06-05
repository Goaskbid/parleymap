import fs from "node:fs";

const INDEX_PATH = "index.html";
const BASES_PATH = "data/institutional-bases.json";
const REPORT_PATH = "data/diagnostics/roster-hygiene-report.json";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const COLLECTIONS = [
  "people",
  "roster",
  "topRoster",
  "expansionRoster",
  "priorityExpansion"
];

const COUNT_KEYS = [
  "people",
  "roster",
  "expansionRoster",
  "appearances",
  "categories"
];

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readEmbeddedData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);

  if (start === -1) throw new Error("demo-data opening tag not found");

  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);

  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");

  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());

  return {
    html,
    jsonStart,
    jsonEnd,
    data
  };
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

function counts(data) {
  const out = {};

  for (const key of COUNT_KEYS) {
    out[key] = Array.isArray(data[key]) ? data[key].length : null;
  }

  return out;
}

function assertCountsPreserved(before, after) {
  for (const key of COUNT_KEYS) {
    if (before[key] !== after[key]) {
      throw new Error(`${key} count changed unexpectedly. Before ${before[key]}, after ${after[key]}`);
    }
  }
}

function validateCoreShape(data) {
  for (const key of COUNT_KEYS) {
    if (!Array.isArray(data[key])) {
      throw new Error(`${key} must be an array`);
    }
  }

  if (data.people.length < 90) throw new Error("people count too low");
  if (data.roster.length < 190) throw new Error("roster count too low");
  if (data.expansionRoster.length < 100) throw new Error("expansionRoster count too low");
  if (data.appearances.length < 500) throw new Error("appearances count too low");
  if (data.categories.length < 10) throw new Error("categories count too low");
}

function profileText(item) {
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

function getDisplayName(item) {
  return item.canonicalName || item.name || item.slug || item.id || "Unknown";
}

function normalizeCode(value) {
  const raw = String(value || "").trim().toUpperCase();

  if (/^[A-Z]{2}$/.test(raw)) return raw;

  return null;
}

function expectedCountryCode(item, registry) {
  const values = [
    item.countryFocusCode,
    item.countryFocus,
    item.countryCode,
    item.country,
    item.countryName
  ];

  for (const value of values) {
    const code = normalizeCode(value);

    if (code && registry.countryCapitalFallbacks[code]) {
      return code === "UK" ? "GB" : code;
    }

    const byName = registry.countryNameToCode[norm(value)];

    if (byName && registry.countryCapitalFallbacks[byName]) {
      return byName === "UK" ? "GB" : byName;
    }
  }

  return null;
}

function matchRule(item, rule) {
  const text = profileText(item);

  if (Array.isArray(rule.matchAll)) {
    const ok = rule.matchAll.every((token) => text.includes(norm(token)));

    if (!ok) return false;
  }

  if (Array.isArray(rule.matchAny)) {
    const ok = rule.matchAny.some((token) => text.includes(norm(token)));

    if (!ok) return false;
  }

  if (Array.isArray(rule.roleAny)) {
    const ok = rule.roleAny.some((token) => text.includes(norm(token)));

    if (!ok) return false;
  }

  return true;
}

function firstHomeBase(item) {
  return Array.isArray(item.homeBases) ? item.homeBases[0] : null;
}

function hasBadCoordinates(base) {
  if (!base || typeof base !== "object") return true;

  const lat = Number(base.lat);
  const lng = Number(base.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  if (Math.abs(lat) < 1 && Math.abs(lng) < 1) return true;

  return false;
}

function sameBase(current, target) {
  if (!current || !target) return false;

  const currentLat = Number(current.lat);
  const currentLng = Number(current.lng);

  if (!Number.isFinite(currentLat) || !Number.isFinite(currentLng)) return false;

  const sameCountry = String(current.countryCode || "").toUpperCase() === target.countryCode;
  const sameCity = norm(current.city) === norm(target.city);
  const closeLat = Math.abs(currentLat - target.lat) < 0.2;
  const closeLng = Math.abs(currentLng - target.lng) < 0.2;

  return sameCountry && sameCity && closeLat && closeLng;
}

function countryMismatch(item, expectedCode) {
  if (!expectedCode) return false;

  const base = firstHomeBase(item);

  if (!base || !base.countryCode) return true;

  return String(base.countryCode).toUpperCase() !== expectedCode;
}

function makeHomeBase(base) {
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

function applyBase(item, base, options) {
  item.homeBases = [makeHomeBase(base)];
  item.locationStatus = "institutional_base_city_level";
  item.homeRegion = base.region || item.homeRegion || null;

  if (options.updateCountryFocus) {
    item.countryFocus = base.countryCode;
    item.countryFocusCode = base.countryCode;
    item.countryName = base.countryName;
  }
}

function snapshot(item) {
  return {
    countryFocus: item.countryFocus || null,
    countryFocusCode: item.countryFocusCode || null,
    countryName: item.countryName || null,
    homeRegion: item.homeRegion || null,
    locationStatus: item.locationStatus || null,
    homeBases: Array.isArray(item.homeBases) ? item.homeBases : null
  };
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const registry = JSON.parse(fs.readFileSync(BASES_PATH, "utf8"));
const payload = readEmbeddedData();
const data = payload.data;

validateCoreShape(data);

const beforeCounts = counts(data);
const fixes = [];
const unresolved = [];

for (const collectionName of COLLECTIONS) {
  const rows = Array.isArray(data[collectionName]) ? data[collectionName] : [];

  rows.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return;

    const before = snapshot(item);
    const displayName = getDisplayName(item);

    const namedRule = (registry.namedRules || []).find((rule) => matchRule(item, rule));

    if (namedRule) {
      const base = registry.bases[namedRule.base];

      if (!base) {
        unresolved.push({
          collection: collectionName,
          index,
          id: item.id || null,
          name: displayName,
          reason: `named rule ${namedRule.id} references missing base ${namedRule.base}`
        });
        return;
      }

      if (!sameBase(firstHomeBase(item), base)) {
        applyBase(item, base, {
          updateCountryFocus: namedRule.updateCountryFocus !== false
        });

        fixes.push({
          collection: collectionName,
          index,
          id: item.id || null,
          slug: item.slug || null,
          name: displayName,
          reason: "named_institutional_base_rule",
          ruleId: namedRule.id,
          from: before,
          to: snapshot(item)
        });
      }

      return;
    }

    const expectedCode = expectedCountryCode(item, registry);
    const fallbackBaseId = expectedCode ? registry.countryCapitalFallbacks[expectedCode] : null;
    const fallbackBase = fallbackBaseId ? registry.bases[fallbackBaseId] : null;

    if (!fallbackBase) {
      if (hasBadCoordinates(firstHomeBase(item))) {
        unresolved.push({
          collection: collectionName,
          index,
          id: item.id || null,
          name: displayName,
          reason: "bad_or_missing_base_but_no_country_fallback",
          countryFocus: item.countryFocus || null,
          countryFocusCode: item.countryFocusCode || null,
          countryName: item.countryName || null
        });
      }

      return;
    }

    const needsFallback =
      hasBadCoordinates(firstHomeBase(item)) ||
      countryMismatch(item, expectedCode);

    if (!needsFallback) return;

    applyBase(item, fallbackBase, {
      updateCountryFocus: true
    });

    fixes.push({
      collection: collectionName,
      index,
      id: item.id || null,
      slug: item.slug || null,
      name: displayName,
      reason: "country_capital_fallback",
      expectedCountryCode: expectedCode,
      from: before,
      to: snapshot(item)
    });
  });
}

data.meta = {
  ...data.meta,
  lastRosterHygieneRun: new Date().toISOString(),
  rosterHygieneStatus: fixes.length
    ? `applied ${fixes.length} institutional-base fixes`
    : "no institutional-base fixes needed"
};

validateCoreShape(data);

const afterCounts = counts(data);
assertCountsPreserved(beforeCounts, afterCounts);

writeEmbeddedData(payload, data);

const report = {
  generatedAt: new Date().toISOString(),
  before: beforeCounts,
  after: afterCounts,
  fixes,
  unresolved,
  status: fixes.length ? "roster_hygiene_applied" : "roster_hygiene_no_changes"
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
