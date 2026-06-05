import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/map-anchor-hygiene-report.json";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const COLLECTIONS = [
  "people",
  "roster",
  "topRoster",
  "expansionRoster",
  "priorityExpansion"
];

const BASES = {
  MX: ["Mexico City", "Mexico", 19.4326, -99.1332, "North America"],
  VA: ["Vatican City", "Vatican City", 41.9029, 12.4534, "Europe"],
  ID: ["Jakarta", "Indonesia", -6.2088, 106.8456, "Asia"],
  US: ["Washington", "United States", 38.9072, -77.0369, "North America"],
  CA: ["Ottawa", "Canada", 45.4215, -75.6972, "North America"],
  GB: ["London", "United Kingdom", 51.5074, -0.1278, "Europe"],
  FR: ["Paris", "France", 48.8566, 2.3522, "Europe"],
  DE: ["Berlin", "Germany", 52.52, 13.405, "Europe"],
  BE: ["Brussels", "Belgium", 50.8503, 4.3517, "Europe"],
  EU: ["Brussels", "Belgium", 50.8503, 4.3517, "Europe"],
  CN: ["Beijing", "China", 39.9042, 116.4074, "Asia"],
  RU: ["Moscow", "Russia", 55.7558, 37.6173, "Europe"],
  UA: ["Kyiv", "Ukraine", 50.4501, 30.5234, "Europe"],
  IN: ["New Delhi", "India", 28.6139, 77.209, "South Asia"],
  SA: ["Riyadh", "Saudi Arabia", 24.7136, 46.6753, "Middle East"],
  AE: ["Abu Dhabi", "United Arab Emirates", 24.4539, 54.3773, "Middle East"],
  QA: ["Doha", "Qatar", 25.2854, 51.531, "Middle East"],
  IR: ["Tehran", "Iran", 35.6892, 51.389, "Middle East"],
  TR: ["Ankara", "Turkey", 39.9334, 32.8597, "Middle East"],
  AU: ["Canberra", "Australia", -35.2809, 149.13, "Oceania"],
  BR: ["Brasilia", "Brazil", -15.7939, -47.8828, "South America"],
  JP: ["Tokyo", "Japan", 35.6762, 139.6503, "Asia"],
  IT: ["Rome", "Italy", 41.9028, 12.4964, "Europe"],
  ES: ["Madrid", "Spain", 40.4168, -3.7038, "Europe"],
  CH: ["Bern", "Switzerland", 46.948, 7.4474, "Europe"],
  SG: ["Singapore", "Singapore", 1.3521, 103.8198, "Asia"],
  IL: ["Jerusalem", "Israel", 31.7683, 35.2137, "Middle East"],
  AR: ["Buenos Aires", "Argentina", -34.6037, -58.3816, "South America"],
  ZA: ["Pretoria", "South Africa", -25.7479, 28.2293, "Africa"],
  NG: ["Abuja", "Nigeria", 9.0765, 7.3986, "Africa"],
  KE: ["Nairobi", "Kenya", -1.2921, 36.8219, "Africa"],
  EG: ["Cairo", "Egypt", 30.0444, 31.2357, "Africa"],
  ET: ["Addis Ababa", "Ethiopia", 9.03, 38.74, "Africa"],
  RW: ["Kigali", "Rwanda", -1.9441, 30.0619, "Africa"],
  PL: ["Warsaw", "Poland", 52.2297, 21.0122, "Europe"],
  HU: ["Budapest", "Hungary", 47.4979, 19.0402, "Europe"],
  CO: ["Bogota", "Colombia", 4.711, -74.0721, "South America"],
  CL: ["Santiago", "Chile", -33.4489, -70.6693, "South America"],
  FI: ["Helsinki", "Finland", 60.1699, 24.9384, "Europe"],
  NZ: ["Wellington", "New Zealand", -41.2865, 174.7762, "Oceania"],
  NO: ["Oslo", "Norway", 59.9139, 10.7522, "Europe"],
  SE: ["Stockholm", "Sweden", 59.3293, 18.0686, "Europe"],
  DK: ["Copenhagen", "Denmark", 55.6761, 12.5683, "Europe"],
  CZ: ["Prague", "Czech Republic", 50.0755, 14.4378, "Europe"],
  AT: ["Vienna", "Austria", 48.2082, 16.3738, "Europe"],
  MA: ["Rabat", "Morocco", 34.0209, -6.8416, "Africa"],
  VE: ["Caracas", "Venezuela", 10.4806, -66.9036, "South America"],
  LB: ["Beirut", "Lebanon", 33.8938, 35.5018, "Middle East"],
  IE: ["Dublin", "Ireland", 53.3498, -6.2603, "Europe"],
  KW: ["Kuwait City", "Kuwait", 29.3759, 47.9774, "Middle East"],
  TW: ["Taipei", "Taiwan", 25.033, 121.5654, "Asia"],
  NL: ["Amsterdam", "Netherlands", 52.3676, 4.9041, "Europe"],
  LU: ["Luxembourg", "Luxembourg", 49.6116, 6.1319, "Europe"],
  MC: ["Monaco", "Monaco", 43.7384, 7.4246, "Europe"],
  LI: ["Vaduz", "Liechtenstein", 47.141, 9.5209, "Europe"],
  JO: ["Amman", "Jordan", 31.9539, 35.9106, "Middle East"],

  UN: ["New York", "United States", 40.7499, -73.968, "North America"],
  IM: ["Washington", "United States", 38.8995, -77.0436, "North America"],
  WB: ["Washington", "United States", 38.8993, -77.0427, "North America"],
  WT: ["Geneva", "Switzerland", 46.2044, 6.1432, "Europe"],
  WH: ["Geneva", "Switzerland", 46.2327, 6.1341, "Europe"],
  OC: ["Paris", "France", 48.861, 2.269, "Europe"],
  BI: ["Basel", "Switzerland", 47.5596, 7.5886, "Europe"],
  IA: ["Vienna", "Austria", 48.2345, 16.4166, "Europe"],
  IAEA: ["Vienna", "Austria", 48.2345, 16.4166, "Europe"],
  FIFA: ["Zurich", "Switzerland", 47.3769, 8.5417, "Europe"],
  IO: ["Lausanne", "Switzerland", 46.5197, 6.6323, "Europe"],
  IOC: ["Lausanne", "Switzerland", 46.5197, 6.6323, "Europe"]
};

const EXACT_RULES = [
  { id: "claudia_sheinbaum", terms: ["claudia", "sheinbaum"], code: "MX" },
  { id: "pope_leo_xiv", any: ["pope leo xiv", "pope", "leo xiv", "robert prevost", "prevost"], code: "VA" },
  { id: "prabowo_subianto", terms: ["prabowo", "subianto"], code: "ID" },
  { id: "mohammed_bin_salman", terms: ["salman"], any: ["mohammed", "mohammad", "muhammad", "mbs"], code: "SA" }
];

function readData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");

  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");

  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { html, jsonStart, jsonEnd, data };
}

function writeData(payload, data) {
  const next =
    payload.html.slice(0, payload.jsonStart) +
    "\n" +
    JSON.stringify(data, null, 2) +
    "\n" +
    payload.html.slice(payload.jsonEnd);

  fs.writeFileSync(INDEX_PATH, next);
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function blob(item) {
  return norm([
    item.id,
    item.slug,
    item.name,
    item.canonicalName,
    item.roleTitle,
    item.organization,
    item.country,
    item.countryName,
    item.countryFocus,
    item.countryFocusCode,
    item.profileLine
  ].join(" "));
}

function normalizedCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (code === "UK") return "GB";
  if (code === "WH") return "WH";
  if (/^[A-Z]{2,5}$/.test(code)) return code;
  return "";
}

function exactCode(item) {
  const text = blob(item);

  for (const rule of EXACT_RULES) {
    const termsOk = !rule.terms || rule.terms.every((term) => text.includes(norm(term)));
    const anyOk = !rule.any || rule.any.some((term) => text.includes(norm(term)));

    if (termsOk && anyOk) return rule.code;
  }

  return "";
}

function codeForItem(item) {
  const exact = exactCode(item);
  if (exact) return exact;

  const candidates = [
    item.countryFocusCode,
    item.countryFocus,
    item.countryCode
  ].map(normalizedCode);

  for (const code of candidates) {
    if (BASES[code]) return code;
  }

  const country = norm(item.countryName || item.country || item.organization);

  const byName = {
    mexico: "MX",
    "holy see": "VA",
    vatican: "VA",
    "vatican city": "VA",
    indonesia: "ID",
    "united states": "US",
    "united kingdom": "GB",
    france: "FR",
    germany: "DE",
    china: "CN",
    russia: "RU",
    ukraine: "UA",
    india: "IN",
    "saudi arabia": "SA",
    "united arab emirates": "AE",
    qatar: "QA",
    iran: "IR",
    turkey: "TR",
    australia: "AU",
    canada: "CA",
    brazil: "BR",
    japan: "JP",
    italy: "IT",
    spain: "ES",
    switzerland: "CH",
    singapore: "SG"
  };

  return byName[country] || "";
}

function baseObject(code) {
  const row = BASES[code];
  if (!row) return null;

  const [city, countryName, lat, lng, region] = row;

  return {
    label: `${city} institutional base`,
    city,
    countryCode: code,
    countryName,
    lat,
    lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only",
    region
  };
}

function currentLatLng(item) {
  const base = Array.isArray(item.homeBases) ? item.homeBases[0] : item.homeBase || item.mapAnchor || item.anchorLocation || item;

  return {
    lat: Number(base?.lat ?? base?.latitude ?? item.lat ?? item.latitude),
    lng: Number(base?.lng ?? base?.longitude ?? item.lng ?? item.longitude)
  };
}

function needsFix(item, base, exact) {
  if (exact) return true;

  const current = currentLatLng(item);
  if (!Number.isFinite(current.lat) || !Number.isFinite(current.lng)) return true;
  if (Math.abs(current.lat) < 1 && Math.abs(current.lng) < 1) return true;

  const distance = Math.abs(current.lat - base.lat) + Math.abs(current.lng - base.lng);
  const currentCode = normalizedCode(item.homeBases?.[0]?.countryCode || item.countryFocusCode || item.countryFocus);

  if (currentCode && currentCode !== base.countryCode && BASES[currentCode]) return true;

  return distance > 1.5;
}

function applyAnchor(item, base, code, exact) {
  const anchor = {
    label: base.label,
    city: base.city,
    countryCode: code,
    countryName: base.countryName,
    lat: base.lat,
    lng: base.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };

  item.homeBases = [anchor];
  item.homeBase = anchor;
  item.mapAnchor = anchor;
  item.anchorLocation = anchor;

  item.lat = base.lat;
  item.lng = base.lng;
  item.latitude = base.lat;
  item.longitude = base.lng;
  item.homeLat = base.lat;
  item.homeLng = base.lng;
  item.mapLat = base.lat;
  item.mapLng = base.lng;

  item.locationStatus = "institutional_base_city_level";
  item.homeRegion = base.region || item.homeRegion || null;

  if (exact || /^[A-Z]{2}$/.test(code)) {
    item.countryFocus = code;
    item.countryFocusCode = code;
    item.countryName = base.countryName;
    item.flagAudit = {
      ...(item.flagAudit || {}),
      code,
      status: "country flag",
      label: base.countryName
    };
  }
}

function validate(data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }

  if (data.people.length < 90) throw new Error("people count too low");
  if (data.roster.length < 190) throw new Error("roster count too low");
  if (data.expansionRoster.length < 100) throw new Error("expansionRoster count too low");
  if (data.appearances.length < 500) throw new Error("appearances count too low");
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const payload = readData();
const data = payload.data;

validate(data);

const before = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

const fixes = [];
const unresolved = [];

for (const collection of COLLECTIONS) {
  const rows = Array.isArray(data[collection]) ? data[collection] : [];

  rows.forEach((item, index) => {
    if (!item || typeof item !== "object") return;

    const exact = exactCode(item);
    const code = codeForItem(item);
    const base = baseObject(code);

    if (!base) {
      unresolved.push({
        collection,
        index,
        id: item.id || null,
        name: item.canonicalName || item.name || null,
        countryFocus: item.countryFocus || null,
        countryFocusCode: item.countryFocusCode || null,
        countryName: item.countryName || item.country || null
      });
      return;
    }

    if (!needsFix(item, base, Boolean(exact))) return;

    const from = {
      lat: currentLatLng(item).lat,
      lng: currentLatLng(item).lng,
      countryFocus: item.countryFocus || null,
      countryFocusCode: item.countryFocusCode || null,
      countryName: item.countryName || null,
      flagAudit: item.flagAudit || null
    };

    applyAnchor(item, base, code, Boolean(exact));

    fixes.push({
      collection,
      index,
      id: item.id || null,
      slug: item.slug || null,
      name: item.canonicalName || item.name || null,
      rule: exact || "country_or_org_fallback",
      from,
      to: {
        city: base.city,
        countryCode: code,
        countryName: base.countryName,
        lat: base.lat,
        lng: base.lng
      }
    });
  });
}

data.meta = {
  ...data.meta,
  lastMapAnchorHygieneRun: new Date().toISOString(),
  mapAnchorHygieneStatus: fixes.length ? `applied ${fixes.length} map-anchor fixes` : "no map-anchor fixes needed"
};

validate(data);

const after = {
  people: data.people.length,
  roster: data.roster.length,
  expansionRoster: data.expansionRoster.length,
  appearances: data.appearances.length,
  categories: data.categories.length
};

for (const key of Object.keys(before)) {
  if (before[key] !== after[key]) {
    throw new Error(`${key} count changed unexpectedly`);
  }
}

writeData(payload, data);

const report = {
  generatedAt: new Date().toISOString(),
  before,
  after,
  fixes,
  unresolved,
  status: fixes.length ? "map_anchor_hygiene_applied" : "map_anchor_hygiene_no_changes"
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
