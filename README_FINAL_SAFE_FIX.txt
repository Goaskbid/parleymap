import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/roster-current-holder-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const TARGETS = [
  ["US", "United States", "Q30"], ["MX", "Mexico", "Q96"], ["FR", "France", "Q142"], ["DE", "Germany", "Q183"],
  ["GB", "United Kingdom", "Q145"], ["ID", "Indonesia", "Q252"], ["BR", "Brazil", "Q155"], ["IN", "India", "Q668"],
  ["JP", "Japan", "Q17"], ["CA", "Canada", "Q16"], ["AU", "Australia", "Q408"], ["IT", "Italy", "Q38"],
  ["ES", "Spain", "Q29"], ["ZA", "South Africa", "Q258"], ["SA", "Saudi Arabia", "Q851"], ["AE", "United Arab Emirates", "Q878"],
  ["QA", "Qatar", "Q846"], ["TR", "Turkey", "Q43"], ["UA", "Ukraine", "Q212"]
];

function norm(v) { return String(v || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function readData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG); if (start === -1) throw new Error("demo-data opening tag not found");
  const end = html.indexOf(CLOSE_TAG, start + OPEN_TAG.length); if (end === -1) throw new Error("demo-data closing tag not found");
  return JSON.parse(html.slice(start + OPEN_TAG.length, end).trim());
}
function claimIds(entity, property) {
  return (entity?.claims?.[property] || [])
    .filter((claim) => {
      const qualifiers = claim.qualifiers || {};
      return !qualifiers.P582; // exclude ended claims
    })
    .map((claim) => claim?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}
async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { signal: controller.signal, headers: { "user-agent": "ParleyMap safe roster review" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.entities?.[qid] || null;
  } finally { clearTimeout(timer); }
}
function label(entity) { return entity?.labels?.en?.value || entity?.labels?.mul?.value || ""; }
function allRows(data) { return [ ...(data.people || []), ...(data.roster || []), ...(data.topRoster || []), ...(data.expansionRoster || []) ]; }
function rowCountry(row) { return String(row.countryFocusCode || row.countryFocus || row.countryCode || "").toUpperCase(); }
function rowName(row) { return row.canonicalName || row.name || ""; }
function isCurrentLeaderRole(row) { return /president|prime minister|chancellor|king|queen|emir|pope|head of state|head of government/i.test(row.roleTitle || ""); }
function matchesHolder(row, name, qid) {
  const rn = norm(rowName(row)); const hn = norm(name);
  return String(row.wikidataId || "") === qid || rn === hn || (rn && hn && (rn.includes(hn) || hn.includes(rn)));
}

fs.mkdirSync("data/diagnostics", { recursive: true });
const data = readData();
const rows = allRows(data);
const additions = [];
const possibleStale = [];
const checked = [];
const errors = [];

for (const [code, countryName, qid] of TARGETS) {
  try {
    const country = await fetchEntity(qid);
    const holderIds = [...new Set([...claimIds(country, "P35"), ...claimIds(country, "P6")])];
    const holders = [];
    for (const holderQid of holderIds) {
      const e = await fetchEntity(holderQid);
      holders.push({ qid: holderQid, name: label(e) });
    }
    checked.push({ countryCode: code, countryName, holderCount: holders.length, holders });
    for (const h of holders) {
      const present = rows.find((row) => rowCountry(row) === code && matchesHolder(row, h.name, h.qid));
      if (!present) additions.push({ countryCode: code, countryName, candidateName: h.name, wikidataId: h.qid, action: "review_add_or_promote_current_holder" });
    }
    const localLeaders = rows.filter((row) => rowCountry(row) === code && isCurrentLeaderRole(row));
    for (const row of localLeaders) {
      const ok = holders.some((h) => matchesHolder(row, h.name, h.qid));
      if (!ok && holders.length) possibleStale.push({ countryCode: code, countryName, id: row.id || null, name: rowName(row), roleTitle: row.roleTitle || null, currentHolders: holders, action: "review_role_change_or_deprioritize" });
    }
  } catch (e) {
    errors.push({ countryCode: code, countryName, error: String(e.message || e) });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: "safe_roster_review_complete_no_auto_mass_replacement",
  checkedCountries: checked,
  additionCandidates: additions,
  possibleStaleRosterEntries: possibleStale,
  errors,
  safetyPolicy: "Diagnostic only. No auto mass replacement, no historical chains, no changes to index.html from this script."
};
const patch = { generatedAt: report.generatedAt, status: "manual_review_required", additions, possibleStaleRosterEntries: possibleStale };
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + "\n");
console.log(JSON.stringify({ status: report.status, additions: additions.length, possibleStale: possibleStale.length, errors: errors.length }, null, 2));
