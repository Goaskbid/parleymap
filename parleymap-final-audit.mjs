import fs from "node:fs";

const INDEX_PATH = "index.html";
const ANCHORS_PATH = "data/curated-anchors.json";
const REPORT_PATH = "data/diagnostics/final-audit-report.json";
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = "</" + "script>";
const GUARD_ID = "parleymap-final-anchor-guard";

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN.length;
  const jsonEnd = html.indexOf(CLOSE, jsonStart);
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

function validateMinimumShape(data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length < 90 || data.people.length > 115) throw new Error(`people count unsafe: ${data.people.length}`);
  if (data.roster.length !== 200) throw new Error(`roster count unsafe: ${data.roster.length}`);
  if (data.expansionRoster.length < 100 || data.expansionRoster.length > 130) throw new Error(`expansionRoster count unsafe: ${data.expansionRoster.length}`);
  if (data.appearances.length < 500) throw new Error(`appearances count unsafe: ${data.appearances.length}`);
  if (data.categories.length < 10) throw new Error(`categories count unsafe: ${data.categories.length}`);
}

function textOfRow(row) {
  return norm([
    row?.id,
    row?.slug,
    row?.name,
    row?.canonicalName,
    row?.roleTitle,
    row?.organization,
    row?.category,
    row?.country,
    row?.countryName,
    row?.countryFocus,
    row?.countryFocusCode,
    row?.profileLine,
    row?.title,
    row?.summary
  ].join(" "));
}

function matches(row, target) {
  const text = textOfRow(row);
  const allOk = !target.matchAll || target.matchAll.every((term) => text.includes(norm(term)));
  const anyOk = !target.matchAny || target.matchAny.some((term) => text.includes(norm(term)));
  const roleOk = !target.roleAny || target.roleAny.some((term) => text.includes(norm(term)));
  return allOk && anyOk && roleOk;
}

function latLng(row) {
  const loc = row?.location || row?.homeBases?.[0] || row?.homeBase || row?.mapAnchor || row?.anchorLocation || row?.geo || row?.coordinates || row;
  const lat = Number(loc?.lat ?? loc?.latitude ?? row?.lat ?? row?.latitude ?? row?.mapLat ?? row?.homeLat);
  const lng = Number(loc?.lng ?? loc?.lon ?? loc?.longitude ?? row?.lng ?? row?.lon ?? row?.longitude ?? row?.mapLng ?? row?.homeLng);
  return { lat, lng };
}

function closeEnough(row, target) {
  const got = latLng(row);
  if (!Number.isFinite(got.lat) || !Number.isFinite(got.lng)) return false;
  return Math.abs(got.lat - target.anchor.lat) <= 0.5 && Math.abs(got.lng - target.anchor.lng) <= 0.5;
}

function walk(value, callback) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((child) => walk(child, callback));
    return;
  }
  callback(value);
  for (const child of Object.values(value)) if (child && typeof child === "object") walk(child, callback);
}

function rowsForTarget(data, target) {
  const rows = [];
  for (const collection of ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples", "organizationProfiles"]) {
    const value = data[collection];
    if (!value) continue;
    walk(value, (row) => {
      if (matches(row, target)) rows.push({ collection, row });
    });
  }
  return rows;
}

function activeHistoricalFailures(data, config) {
  const failures = [];
  const badNames = (config.historicalActiveBlocklist || []).map(norm);
  for (const collection of ["roster", "topRoster", "expansionRoster", "priorityExpansion"]) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    rows.forEach((row, index) => {
      const text = textOfRow(row);
      const inactive = /former|deceased|historical|hidden/.test(norm([row.roleTitle, row.trackingStatus, row.currentOfficeStatus, row.mapVisibility].join(" ")));
      const hit = badNames.find((name) => text.includes(name));
      if (hit && !inactive) failures.push({ collection, index, name: row.canonicalName || row.name || null, hit });
    });
  }
  return failures;
}

fs.mkdirSync("data/diagnostics", { recursive: true });
const config = JSON.parse(fs.readFileSync(ANCHORS_PATH, "utf8"));
const { html, data } = readEmbedded();
validateMinimumShape(data);
const requiredTargets = ["claudia_sheinbaum", "pope_leo_xiv", "prabowo_subianto", "rafael_grossi"];
const targetResults = [];
const failures = [];
for (const key of requiredTargets) {
  const target = (config.targets || []).find((item) => item.key === key);
  if (!target) {
    failures.push({ target: key, reason: "target_missing_from_config" });
    continue;
  }
  const rows = rowsForTarget(data, target);
  const good = rows.filter(({ row }) => closeEnough(row, target));
  targetResults.push({ target: key, totalRows: rows.length, anchoredRows: good.length, expected: target.anchor });
  if (rows.length === 0) failures.push({ target: key, reason: "no_matching_rows" });
  if (good.length === 0) failures.push({ target: key, reason: "no_rows_at_expected_anchor" });
}
const historicalFailures = activeHistoricalFailures(data, config);
for (const failure of historicalFailures) failures.push({ target: "historical_pollution", ...failure });
if (!html.includes(`id="${GUARD_ID}"`)) failures.push({ target: "runtime_guard", reason: "missing_runtime_guard" });
const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? "audit_failed" : "audit_passed",
  counts: counts(data),
  targetResults,
  failures
};
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
