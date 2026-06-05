import fs from "node:fs";

const INDEX_PATH = "index.html";
const REVIEW_PATH = "data/diagnostics/roster-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const OPEN_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;

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
  const match = html.match(OPEN_RE);
  if (!match) throw new Error("demo-data block not found");
  return JSON.parse(match[1]);
}

function uniqueRows(data) {
  const rows = [
    ...(Array.isArray(data.people) ? data.people : []),
    ...(Array.isArray(data.roster) ? data.roster : []),
    ...(Array.isArray(data.topRoster) ? data.topRoster : []),
    ...(Array.isArray(data.expansionRoster) ? data.expansionRoster : [])
  ];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = row.id || row.slug || row.wikidataId || row.canonicalName || row.name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function hasBadBase(row) {
  const base = Array.isArray(row.homeBases) ? row.homeBases[0] : row.homeBase || row.mapAnchor;
  const lat = Number(base?.lat ?? row.lat ?? row.latitude ?? row.homeLat ?? row.mapLat);
  const lng = Number(base?.lng ?? base?.lon ?? row.lng ?? row.lon ?? row.longitude ?? row.homeLng ?? row.mapLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  if (Math.abs(lat) < 1 && Math.abs(lng) < 1) return true;
  return false;
}

function profileText(row) {
  return norm([
    row.id,
    row.slug,
    row.wikidataId,
    row.canonicalName,
    row.name,
    row.roleTitle,
    row.organization,
    row.countryName,
    row.countryFocus,
    row.countryFocusCode,
    row.officialUrl
  ].join(" "));
}

const data = readData();
const rows = uniqueRows(data);
const now = new Date().toISOString();

const review = {
  generatedAt: now,
  status: "roster_review_diagnostics_complete",
  counts: {
    people: data.people?.length ?? null,
    roster: data.roster?.length ?? null,
    topRoster: data.topRoster?.length ?? null,
    expansionRoster: data.expansionRoster?.length ?? null,
    appearances: data.appearances?.length ?? null
  },
  hygieneWarnings: [],
  possibleRoleReview: [],
  additionCandidates: [],
  note: "Diagnostics only. This file does not auto-add or auto-remove people."
};

for (const row of rows) {
  const text = profileText(row);
  const name = row.canonicalName || row.name || row.slug || row.id || "Unknown";
  if (hasBadBase(row)) {
    review.hygieneWarnings.push({ id: row.id || null, name, issue: "bad_or_missing_anchor_coordinates" });
  }
  if (/former/.test(text) && /president|prime minister|chancellor|secretary general|pope/.test(text)) {
    review.possibleRoleReview.push({ id: row.id || null, name, roleTitle: row.roleTitle || null, issue: "former_role_on_roster_review" });
  }
  if (!row.officialUrl || /wikipedia\.org/i.test(row.officialUrl)) {
    review.hygieneWarnings.push({ id: row.id || null, name, issue: "officialUrl_missing_or_wikipedia" });
  }
}

const knownReviewTargets = [
  { countryCode: "US", countryName: "United States", issue: "monthly_check_current_president_and_major_candidates" },
  { countryCode: "MX", countryName: "Mexico", issue: "monthly_check_current_president" },
  { countryCode: "ID", countryName: "Indonesia", issue: "monthly_check_current_president" },
  { countryCode: "VA", countryName: "Vatican City", issue: "monthly_check_current_pope" },
  { countryCode: "FR", countryName: "France", issue: "monthly_check_current_president" },
  { countryCode: "DE", countryName: "Germany", issue: "monthly_check_current_chancellor" },
  { countryCode: "GB", countryName: "United Kingdom", issue: "monthly_check_current_prime_minister_and_monarch" }
];

review.additionCandidates = knownReviewTargets.map((item) => ({
  ...item,
  action: "manual_source_review_required"
}));

const patch = {
  generatedAt: now,
  status: "manual_review_required",
  additions: review.additionCandidates,
  possibleRemovalsOrRoleChanges: review.possibleRoleReview,
  hygieneWarnings: review.hygieneWarnings,
  note: "Do not auto-publish this patch. Use it as a monthly review checklist."
};

fs.mkdirSync("data/diagnostics", { recursive: true });
fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2) + "\n");
fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + "\n");

console.log(JSON.stringify({
  status: review.status,
  hygieneWarnings: review.hygieneWarnings.length,
  possibleRoleReview: review.possibleRoleReview.length,
  additionCandidates: review.additionCandidates.length
}, null, 2));
