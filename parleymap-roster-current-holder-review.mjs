import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/final-rescue-audit-report.json";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const GUARD_ID = "pm-final-anchor-guard";

const TARGETS = [
  { key: "claudia_sheinbaum", required: true, all: ["claudia", "sheinbaum"], expected: { lat: 19.4326, lng: -99.1332, code: "MX" }, imageRequired: true },
  { key: "pope_leo_xiv", required: true, any: ["pope leo xiv", "leo xiv", "robert prevost", "prevost", "pope", "pontiff"], expected: { lat: 41.9029, lng: 12.4534, code: "VA" }, imageRequired: true },
  { key: "prabowo_subianto", required: true, all: ["prabowo", "subianto"], expected: { lat: -6.2088, lng: 106.8456, code: "ID" }, imageRequired: true },
  { key: "rafael_grossi", required: true, any: ["rafael grossi", "rafael mariano grossi", "grossi"], roleAny: ["iaea", "international atomic energy", "nuclear"], expected: { lat: 48.2345, lng: 16.4166, code: "AT" }, imageRequired: true },
  { key: "mohammed_bin_salman", required: false, all: ["salman"], any: ["mohammed", "mohammad", "muhammad", "mbs"], expected: { lat: 24.7136, lng: 46.6753, code: "SA" }, imageRequired: false }
];

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  return { html, data: JSON.parse(html.slice(jsonStart, jsonEnd).trim()) };
}

function counts(data) {
  return {
    people: Array.isArray(data.people) ? data.people.length : null,
    roster: Array.isArray(data.roster) ? data.roster.length : null,
    topRoster: Array.isArray(data.topRoster) ? data.topRoster.length : null,
    expansionRoster: Array.isArray(data.expansionRoster) ? data.expansionRoster.length : null,
    appearances: Array.isArray(data.appearances) ? data.appearances.length : null,
    categories: Array.isArray(data.categories) ? data.categories.length : null
  };
}

function rowBlob(row) {
  return norm([
    row.id,
    row.slug,
    row.name,
    row.canonicalName,
    row.roleTitle,
    row.organization,
    row.category,
    row.country,
    row.countryName,
    row.countryFocus,
    row.countryFocusCode,
    row.profileLine,
    Array.isArray(row.profileLines) ? row.profileLines.join(" ") : ""
  ].join(" "));
}

function targetMatches(row, target) {
  const text = rowBlob(row);
  const allOk = !target.all || target.all.every((part) => text.includes(norm(part)));
  const anyOk = !target.any || target.any.some((part) => text.includes(norm(part)));
  const roleOk = !target.roleAny || target.roleAny.some((part) => text.includes(norm(part)));
  return allOk && anyOk && roleOk;
}

function likelyPersonObject(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  return ["id", "slug", "name", "canonicalName", "roleTitle", "organization", "profileLine", "homeBases", "imageUrl"].some((key) => key in row);
}

function latLng(row) {
  const base = Array.isArray(row.homeBases) ? row.homeBases[0] : row.homeBase || row.mapAnchor || row.anchorLocation || row.location || row;
  return {
    lat: Number(base?.lat ?? base?.latitude ?? row.lat ?? row.latitude ?? row.mapLat ?? row.homeLat ?? row.anchorLat),
    lng: Number(base?.lng ?? base?.lon ?? base?.longitude ?? row.lng ?? row.lon ?? row.longitude ?? row.mapLng ?? row.homeLng ?? row.anchorLng)
  };
}

function distanceScore(a, b) {
  return Math.abs(a.lat - b.lat) + Math.abs(a.lng - b.lng);
}

function goodImage(row) {
  const value = String(row.imageUrl || "").trim();
  return Boolean(value && !/placeholder|needs[-_ ]?review|missing/i.test(value));
}

function walk(value, path, callback, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${path}[${index}]`, callback, seen));
    return;
  }
  callback(value, path);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") walk(child, `${path}.${key}`, callback, seen);
  }
}

function validateCore(data, html) {
  const errors = [];
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) errors.push(`${key} must be an array`);
  }
  if (Array.isArray(data.people) && data.people.length > 115) {
    errors.push(`people count is ${data.people.length}. This still looks polluted by the unsafe roster auto update.`);
  }
  if (Array.isArray(data.people) && data.people.length < 80) errors.push("people count too low");
  if (Array.isArray(data.roster) && data.roster.length < 180) errors.push("roster count too low");
  if (Array.isArray(data.expansionRoster) && data.expansionRoster.length < 90) errors.push("expansionRoster count too low");
  if (Array.isArray(data.appearances) && data.appearances.length < 480) errors.push("appearances count too low");
  if (!html.includes(`id="${GUARD_ID}"`)) errors.push("runtime marker guard is not installed");
  return errors;
}

fs.mkdirSync("data/diagnostics", { recursive: true });
const { html, data } = readData();
const errors = validateCore(data, html);
const warnings = [];
const targetReports = [];

for (const target of TARGETS) {
  const matches = [];
  for (const collection of ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples"]) {
    const rows = data[collection];
    if (!rows) continue;
    walk(rows, collection, (row, path) => {
      if (!likelyPersonObject(row)) return;
      if (!targetMatches(row, target)) return;
      const ll = latLng(row);
      const expected = { lat: target.expected.lat, lng: target.expected.lng };
      const coordinateOk = Number.isFinite(ll.lat) && Number.isFinite(ll.lng) && distanceScore(ll, expected) < 1.0;
      const imageOk = goodImage(row);
      const countryCode = String(row.countryFocusCode || row.countryFocus || row.countryCode || row.homeBases?.[0]?.countryCode || "").toUpperCase();
      const countryOk = target.key === "rafael_grossi" ? true : countryCode === target.expected.code;
      const rowReport = {
        path,
        id: row.id || null,
        name: row.canonicalName || row.name || null,
        lat: ll.lat,
        lng: ll.lng,
        expectedLat: target.expected.lat,
        expectedLng: target.expected.lng,
        countryCode,
        coordinateOk,
        countryOk,
        imageOk,
        imageUrl: row.imageUrl || null
      };
      matches.push(rowReport);
      if (!coordinateOk) errors.push(`${target.key} has bad coordinates at ${path}`);
      if (!countryOk) errors.push(`${target.key} has bad country code at ${path}`);
      if (target.imageRequired && !imageOk) errors.push(`${target.key} has missing face image at ${path}`);
    });
  }
  if (target.required && matches.length === 0) errors.push(`${target.key} was not found in profile collections`);
  if (!target.required && matches.length === 0) warnings.push(`${target.key} was not found in profile collections`);
  targetReports.push({ key: target.key, matches });
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? "audit_failed" : "audit_passed",
  counts: counts(data),
  guardId: GUARD_ID,
  errors,
  warnings,
  targets: targetReports
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ status: report.status, errors: errors.length, warnings: warnings.length, counts: report.counts }, null, 2));

if (errors.length) {
  for (const error of errors) console.error("AUDIT ERROR:", error);
  process.exit(1);
}
