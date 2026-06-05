import fs from "node:fs";

const INDEX_PATH = "index.html";
const REVIEW_PATH = "data/diagnostics/roster-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

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
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  return JSON.parse(html.slice(jsonStart, jsonEnd).trim());
}

function rows(data) {
  const all = [];
  for (const key of ["people", "roster", "topRoster", "expansionRoster"]) {
    if (Array.isArray(data[key])) all.push(...data[key].map((row) => ({ ...row, sourceCollection: key })));
  }
  const seen = new Set();
  return all.filter((row) => {
    const key = row.wikidataId || row.id || row.slug || row.name || row.canonicalName;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function issueForRow(row) {
  const issues = [];
  const text = norm([row.name, row.canonicalName, row.slug, row.roleTitle, row.organization, row.countryName, row.countryFocusCode, row.countryFocus].join(" "));
  const hasAnchor = Boolean(row.homeBases?.[0]?.lat || row.mapAnchor?.lat || row.lat || row.mapLat || row.anchorLat);
  if (!hasAnchor) issues.push("missing_explicit_anchor");
  if (!row.officialUrl || /wikipedia\.org/i.test(row.officialUrl)) issues.push("officialUrl_missing_or_wikipedia_only");
  if (text.includes("former") && /president|prime minister|head of state|head of government/i.test(row.roleTitle || "")) issues.push("possibly_stale_current_leader_role");
  if (row.flagAudit?.code && row.countryFocusCode && String(row.flagAudit.code).toUpperCase() !== String(row.countryFocusCode).toUpperCase()) {
    if (!row.flagAudit.status || !/institution/i.test(row.flagAudit.status)) issues.push("flag_code_country_focus_mismatch");
  }
  return issues;
}

fs.mkdirSync("data/diagnostics", { recursive: true });
const data = readEmbedded();
const rosterRows = rows(data);
const warnings = [];
for (const row of rosterRows) {
  const issues = issueForRow(row);
  if (!issues.length) continue;
  warnings.push({
    id: row.id || null,
    slug: row.slug || null,
    name: row.canonicalName || row.name || null,
    wikidataId: row.wikidataId || null,
    roleTitle: row.roleTitle || null,
    countryFocusCode: row.countryFocusCode || row.countryFocus || null,
    sourceCollection: row.sourceCollection,
    issues
  });
}

const review = {
  generatedAt: new Date().toISOString(),
  status: "roster_review_diagnostics_complete",
  counts: {
    people: data.people?.length ?? null,
    roster: data.roster?.length ?? null,
    topRoster: data.topRoster?.length ?? null,
    expansionRoster: data.expansionRoster?.length ?? null
  },
  warningCount: warnings.length,
  warnings,
  note: "Diagnostics only. This file does not add or remove people from index.html. Review patch candidates before publishing roster membership changes."
};

const patchCandidates = {
  generatedAt: review.generatedAt,
  status: "manual_review_required",
  possibleRoleOrProfileFixes: warnings,
  additions: [],
  removals: [],
  note: "Automatic people add/remove is intentionally blocked. Use this file as a manual review queue."
};

fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2) + "\n");
fs.writeFileSync(PATCH_PATH, JSON.stringify(patchCandidates, null, 2) + "\n");
console.log(JSON.stringify({ status: review.status, warnings: warnings.length }, null, 2));
