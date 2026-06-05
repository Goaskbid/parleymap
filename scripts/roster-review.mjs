import fs from "node:fs";

const INDEX_PATH = "index.html";
const REVIEW_PATH = "data/diagnostics/roster-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const TARGETS = [
  ["US", "United States", "Q30"],
  ["MX", "Mexico", "Q96"],
  ["ID", "Indonesia", "Q252"],
  ["FR", "France", "Q142"],
  ["DE", "Germany", "Q183"],
  ["GB", "United Kingdom", "Q145"],
  ["CN", "China", "Q148"],
  ["RU", "Russia", "Q159"],
  ["UA", "Ukraine", "Q212"],
  ["IN", "India", "Q668"],
  ["SA", "Saudi Arabia", "Q851"],
  ["AE", "United Arab Emirates", "Q878"],
  ["QA", "Qatar", "Q846"],
  ["IR", "Iran", "Q794"],
  ["TR", "Turkey", "Q43"],
  ["CA", "Canada", "Q16"],
  ["BR", "Brazil", "Q155"],
  ["JP", "Japan", "Q17"],
  ["IT", "Italy", "Q38"],
  ["ES", "Spain", "Q29"],
  ["AU", "Australia", "Q408"],
  ["ZA", "South Africa", "Q258"],
  ["AR", "Argentina", "Q414"],
  ["NG", "Nigeria", "Q1033"],
  ["KE", "Kenya", "Q114"],
  ["EG", "Egypt", "Q79"],
  ["ET", "Ethiopia", "Q115"],
  ["RW", "Rwanda", "Q1037"],
  ["PL", "Poland", "Q36"],
  ["HU", "Hungary", "Q28"],
  ["CO", "Colombia", "Q739"],
  ["CL", "Chile", "Q298"],
  ["IL", "Israel", "Q801"],
  ["NZ", "New Zealand", "Q664"],
  ["NO", "Norway", "Q20"],
  ["SE", "Sweden", "Q34"],
  ["DK", "Denmark", "Q35"]
];

function readData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");

  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");

  return JSON.parse(html.slice(jsonStart, jsonEnd).trim());
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function allRosterRows(data) {
  return [
    ...(Array.isArray(data.people) ? data.people : []),
    ...(Array.isArray(data.roster) ? data.roster : []),
    ...(Array.isArray(data.topRoster) ? data.topRoster : []),
    ...(Array.isArray(data.expansionRoster) ? data.expansionRoster : [])
  ];
}

function uniqueById(rows) {
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const id = row.id || row.slug || row.wikidataId || row.name || row.canonicalName;
    if (!id || seen.has(id)) continue;

    seen.add(id);
    out.push(row);
  }

  return out;
}

function wikidataId(row) {
  const id = String(row.wikidataId || "").trim();
  return /^Q[0-9]+$/.test(id) ? id : "";
}

async function fetchEntity(qid) {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "ParleyMap roster review diagnostics"
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    return json.entities?.[qid] || null;
  } finally {
    clearTimeout(timer);
  }
}

function label(entity) {
  return entity?.labels?.en?.value || entity?.labels?.mul?.value || "";
}

function claimTargetIds(entity, property) {
  const claims = entity?.claims?.[property] || [];
  return claims
    .map((claim) => claim?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

async function labelForQid(qid, cache) {
  if (cache.has(qid)) return cache.get(qid);

  try {
    const entity = await fetchEntity(qid);
    const value = label(entity) || qid;
    cache.set(qid, value);
    return value;
  } catch {
    cache.set(qid, qid);
    return qid;
  }
}

function rosterMatch(rows, countryCode, holderName) {
  const holder = norm(holderName);
  if (!holder) return null;

  return rows.find((row) => {
    const country = String(row.countryFocusCode || row.countryFocus || "").toUpperCase();
    const name = norm(row.canonicalName || row.name || "");
    const text = norm([
      row.canonicalName,
      row.name,
      row.slug,
      row.roleTitle,
      row.organization,
      row.countryName,
      row.country
    ].join(" "));

    return country === countryCode && (name === holder || text.includes(holder));
  }) || null;
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const data = readData();
const rows = uniqueById(allRosterRows(data));
const labelCache = new Map();

const review = {
  generatedAt: new Date().toISOString(),
  status: "roster_review_complete",
  counts: {
    people: data.people?.length ?? null,
    roster: data.roster?.length ?? null,
    topRoster: data.topRoster?.length ?? null,
    expansionRoster: data.expansionRoster?.length ?? null
  },
  checkedCountries: [],
  additionCandidates: [],
  possibleStaleRosterEntries: [],
  staleRoleWarnings: [],
  dataHygieneWarnings: []
};

for (const row of rows) {
  if (!row.officialUrl || /wikipedia\.org/i.test(row.officialUrl)) {
    review.dataHygieneWarnings.push({
      id: row.id || null,
      name: row.canonicalName || row.name || null,
      issue: "officialUrl missing or points to Wikipedia"
    });
  }

  if (!Array.isArray(row.homeBases) && !row.mapAnchor && !Number.isFinite(Number(row.lat))) {
    review.dataHygieneWarnings.push({
      id: row.id || null,
      name: row.canonicalName || row.name || null,
      issue: "no explicit map anchor fields"
    });
  }
}

for (const [countryCode, countryName, countryQid] of TARGETS) {
  let countryEntity = null;

  try {
    countryEntity = await fetchEntity(countryQid);
  } catch (error) {
    review.checkedCountries.push({
      countryCode,
      countryName,
      status: "wikidata_fetch_failed",
      error: String(error.message || error)
    });
    continue;
  }

  const currentHolderIds = [
    ...claimTargetIds(countryEntity, "P35"),
    ...claimTargetIds(countryEntity, "P6")
  ];

  const currentNames = [];

  for (const holderId of [...new Set(currentHolderIds)]) {
    currentNames.push(await labelForQid(holderId, labelCache));
  }

  review.checkedCountries.push({
    countryCode,
    countryName,
    wikidataId: countryQid,
    currentHolderNames: currentNames,
    status: "checked"
  });

  for (const name of currentNames) {
    const match = rosterMatch(rows, countryCode, name);

    if (!match) {
      review.additionCandidates.push({
        countryCode,
        countryName,
        candidateName: name,
        source: `Wikidata ${countryQid} P35/P6`,
        action: "review_add_or_promote_current_office_holder"
      });
    }
  }

  const localLeaders = rows.filter((row) => {
    const code = String(row.countryFocusCode || row.countryFocus || "").toUpperCase();
    const role = norm(row.roleTitle || "");
    return code === countryCode && /president|prime minister|head of state|head of government|chancellor|monarch|king|queen/.test(role);
  });

  for (const row of localLeaders) {
    const name = norm(row.canonicalName || row.name || "");
    const currentHit = currentNames.some((current) => {
      const currentNorm = norm(current);
      return currentNorm && (name.includes(currentNorm) || currentNorm.includes(name));
    });

    if (!currentHit && currentNames.length) {
      review.possibleStaleRosterEntries.push({
        id: row.id || null,
        name: row.canonicalName || row.name || null,
        roleTitle: row.roleTitle || null,
        countryCode,
        countryName,
        currentHolderNames: currentNames,
        action: "review_role_or_remove_from_current_leader_slot"
      });
    }
  }
}

const patch = {
  generatedAt: review.generatedAt,
  status: "manual_review_required",
  additions: review.additionCandidates,
  possibleRemovalsOrRoleChanges: review.possibleStaleRosterEntries,
  note: "This file is diagnostic only. It must not be auto-published into index.html without human review."
};

fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2) + "\n");
fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + "\n");

console.log(JSON.stringify({
  status: review.status,
  checkedCountries: review.checkedCountries.length,
  additionCandidates: review.additionCandidates.length,
  possibleStaleRosterEntries: review.possibleStaleRosterEntries.length,
  dataHygieneWarnings: review.dataHygieneWarnings.length
}, null, 2));
