import fs from "node:fs";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const REPORT_PATH = "data/diagnostics/final-anchor-fix-report.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";

const OPEN_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["']\s*>/i;
const CLOSE_TAG_RE = /<\/script>/i;

const TARGETS = [
  {
    key: "claudia_sheinbaum",
    label: "Claudia Sheinbaum",
    tests: ["claudia sheinbaum", "claudia-sheinbaum", "q515229", "r-028-claudia-sheinbaum"],
    code: "MX",
    countryName: "Mexico",
    city: "Mexico City",
    lat: 19.4326,
    lng: -99.1332,
    region: "North America"
  },
  {
    key: "pope_leo_xiv",
    label: "Pope Leo XIV",
    tests: ["pope leo xiv", "pope-leo-xiv", "q134707349", "robert francis prevost", "robert prevost"],
    code: "VA",
    countryName: "Vatican City",
    city: "Vatican City",
    lat: 41.9029,
    lng: 12.4534,
    region: "Europe"
  },
  {
    key: "prabowo_subianto",
    label: "Prabowo Subianto",
    tests: ["prabowo subianto", "prabowo-subianto", "q57669", "r-021-prabowo-subianto"],
    code: "ID",
    countryName: "Indonesia",
    city: "Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    region: "Asia"
  },
  {
    key: "mohammed_bin_salman",
    label: "Mohammed bin Salman",
    tests: ["mohammed bin salman", "mohammad bin salman", "muhammad bin salman", "mohammed-bin-salman", "mbs", "q58190"],
    code: "SA",
    countryName: "Saudi Arabia",
    city: "Riyadh",
    lat: 24.7136,
    lng: 46.6753,
    region: "Middle East"
  }
];

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const openMatch = html.match(OPEN_RE);
  if (!openMatch || openMatch.index === undefined) {
    throw new Error("demo-data script block not found in index.html");
  }

  const jsonStart = openMatch.index + openMatch[0].length;
  const closeMatch = html.slice(jsonStart).match(CLOSE_TAG_RE);
  if (!closeMatch || closeMatch.index === undefined) {
    throw new Error("demo-data closing script tag not found in index.html");
  }

  const jsonEnd = jsonStart + closeMatch.index;
  const jsonText = html.slice(jsonStart, jsonEnd).trim();
  const data = JSON.parse(jsonText);

  return { html, jsonStart, jsonEnd, data };
}

function writeEmbedded(payload, data) {
  const json = JSON.stringify(data, null, 2);
  const nextHtml = payload.html.slice(0, payload.jsonStart) + "\n" + json + "\n" + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(DEMO_PATH, json + "\n");
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stableString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stableString).join(" ");
  if (typeof value === "object") {
    return [
      value.id,
      value.slug,
      value.name,
      value.canonicalName,
      value.wikidataId,
      value.wikiTitle,
      value.profileUrl,
      value.roleTitle,
      value.organization,
      value.country,
      value.countryName,
      value.countryFocus,
      value.countryFocusCode,
      value.profileLine
    ].map(stableString).join(" ");
  }
  return "";
}

function isEventLike(obj) {
  return Boolean(obj && typeof obj === "object" && (obj.startsAt || obj.eventType || obj.sourcePack || obj.venuePublic));
}

function targetFor(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj) || isEventLike(obj)) return null;
  const text = norm(stableString(obj));
  return TARGETS.find((target) => target.tests.some((test) => text.includes(norm(test)))) || null;
}

function makeAnchor(target) {
  return {
    label: `${target.city} institutional base`,
    city: target.city,
    countryCode: target.code,
    countryName: target.countryName,
    lat: target.lat,
    lng: target.lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only"
  };
}

function patchObject(obj, target, path, fixes) {
  const before = {
    countryFocus: obj.countryFocus ?? null,
    countryFocusCode: obj.countryFocusCode ?? null,
    countryName: obj.countryName ?? null,
    flagAudit: obj.flagAudit ?? null,
    lat: obj.lat ?? obj.latitude ?? obj.mapLat ?? obj.homeLat ?? null,
    lng: obj.lng ?? obj.longitude ?? obj.mapLng ?? obj.homeLng ?? null,
    homeBases: obj.homeBases ?? null,
    mapAnchor: obj.mapAnchor ?? null
  };

  const anchor = makeAnchor(target);

  obj.countryFocus = target.code;
  obj.countryFocusCode = target.code;
  obj.countryCode = target.code;
  obj.countryName = target.countryName;
  obj.homeRegion = target.region;
  obj.region = obj.region || target.region;
  obj.locationStatus = "institutional_base_city_level_verified";

  obj.homeBases = [anchor];
  obj.homeBase = anchor;
  obj.mapAnchor = anchor;
  obj.anchorLocation = anchor;
  obj.baseLocation = anchor;
  obj.institutionalBase = anchor;

  obj.lat = target.lat;
  obj.lng = target.lng;
  obj.latitude = target.lat;
  obj.longitude = target.lng;
  obj.homeLat = target.lat;
  obj.homeLng = target.lng;
  obj.mapLat = target.lat;
  obj.mapLng = target.lng;
  obj.anchorLat = target.lat;
  obj.anchorLng = target.lng;
  obj.coordinates = { lat: target.lat, lng: target.lng };
  obj.geo = { lat: target.lat, lng: target.lng };

  obj.flagAudit = {
    ...(obj.flagAudit && typeof obj.flagAudit === "object" ? obj.flagAudit : {}),
    code: target.code,
    status: "country flag",
    label: target.countryName
  };

  if (Array.isArray(obj.profileLines)) {
    obj.profileLines = obj.profileLines.map((line) => {
      if (!line || typeof line !== "object") return line;
      const label = norm(line.label);
      if (label === "role") {
        return { ...line, text: `${obj.canonicalName || obj.name || target.label} is listed with a city-level public institutional anchor in ${target.countryName}.` };
      }
      if (label === "cities") {
        return { ...line, text: `Starting anchor: ${target.city}, ${target.countryName}. Travel appears only through public-source appearance records.` };
      }
      return line;
    });
  }

  const after = {
    countryFocus: obj.countryFocus ?? null,
    countryFocusCode: obj.countryFocusCode ?? null,
    countryName: obj.countryName ?? null,
    flagAudit: obj.flagAudit ?? null,
    lat: obj.lat ?? null,
    lng: obj.lng ?? null,
    homeBases: obj.homeBases ?? null,
    mapAnchor: obj.mapAnchor ?? null
  };

  fixes.push({
    target: target.key,
    label: target.label,
    path,
    id: obj.id ?? null,
    slug: obj.slug ?? null,
    name: obj.canonicalName || obj.name || null,
    before,
    after
  });
}

function walk(value, path, fixes) {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, fixes));
    return;
  }

  const target = targetFor(value);
  if (target) {
    patchObject(value, target, path, fixes);
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "appearances") continue;
    if (key === "sourcePack") continue;
    if (child && typeof child === "object") walk(child, `${path}.${key}`, fixes);
  }
}

function counts(data) {
  return {
    people: Array.isArray(data.people) ? data.people.length : null,
    roster: Array.isArray(data.roster) ? data.roster.length : null,
    expansionRoster: Array.isArray(data.expansionRoster) ? data.expansionRoster.length : null,
    appearances: Array.isArray(data.appearances) ? data.appearances.length : null,
    categories: Array.isArray(data.categories) ? data.categories.length : null
  };
}

function validateCounts(before, after) {
  for (const key of Object.keys(before)) {
    if (before[key] !== after[key]) {
      throw new Error(`${key} count changed. Before ${before[key]}, after ${after[key]}`);
    }
  }

  if (after.people < 90) throw new Error("people count too low");
  if (after.roster < 190) throw new Error("roster count too low");
  if (after.expansionRoster < 100) throw new Error("expansionRoster count too low");
  if (after.appearances < 500) throw new Error("appearances count too low");
  if (after.categories < 10) throw new Error("categories count too low");
}

function buildSummary(report) {
  const lines = [];
  lines.push("# ParleyMap final anchor fix");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status}`);
  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push("| Item | Before | After |");
  lines.push("|---|---:|---:|");
  for (const key of Object.keys(report.before)) {
    lines.push(`| ${key} | ${report.before[key]} | ${report.after[key]} |`);
  }
  lines.push("");
  lines.push("## Required fixes");
  lines.push("");
  for (const target of TARGETS) {
    const hits = report.fixes.filter((fix) => fix.target === target.key);
    lines.push(`- ${target.label}: ${hits.length} object(s) patched to ${target.city}, ${target.countryName}`);
  }
  lines.push("");
  lines.push("## Patched objects");
  lines.push("");
  for (const fix of report.fixes.slice(0, 80)) {
    lines.push(`- ${fix.label}: ${fix.path} -> ${fix.after.homeBases?.[0]?.city || "unknown"}, ${fix.after.countryName}`);
  }
  return lines.join("\n") + "\n";
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const payload = readEmbedded();
const before = counts(payload.data);
const fixes = [];

walk(payload.data, "data", fixes);

payload.data.meta = {
  ...(payload.data.meta || {}),
  lastAnchorEmergencyFix: new Date().toISOString(),
  anchorEmergencyFixStatus: `patched ${fixes.length} profile/roster objects for known bad institutional anchors`
};

const after = counts(payload.data);
validateCounts(before, after);
writeEmbedded(payload, payload.data);

const report = {
  generatedAt: new Date().toISOString(),
  before,
  after,
  requiredTargets: TARGETS.map((target) => ({
    key: target.key,
    label: target.label,
    city: target.city,
    countryCode: target.code,
    countryName: target.countryName
  })),
  fixes,
  status: "final_anchor_fix_applied"
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(SUMMARY_PATH, buildSummary(report));
console.log(JSON.stringify({
  status: report.status,
  fixes: fixes.length,
  before,
  after
}, null, 2));
