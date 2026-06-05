import fs from "node:fs";

const INDEX_PATH = "index.html";
const REVIEW_PATH = "data/diagnostics/roster-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const OPEN_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["']\s*>/i;
const CLOSE_RE = /<\/script>/i;

const COUNTRIES = [
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
  ["ZA", "South Africa", "Q258"]
];

function readData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const open = html.match(OPEN_RE);
  if (!open || open.index === undefined) throw new Error("demo-data opening tag not found");
  const start = open.index + open[0].length;
  const close = html.slice(start).match(CLOSE_RE);
  if (!close || close.index === undefined) throw new Error("demo-data closing tag not found");
  return JSON.parse(html.slice(start, start + close.index).trim());
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rows(data) {
  const all = [
    ...(Array.isArray(data.people) ? data.people : []),
    ...(Array.isArray(data.roster) ? data.roster : []),
    ...(Array.isArray(data.topRoster) ? data.topRoster : []),
    ...(Array.isArray(data.expansionRoster) ? data.expansionRoster : [])
  ];
  const out = [];
  const seen = new Set();
  for (const row of all) {
    const key = row.id || row.slug || row.wikidataId || row.name || row.canonicalName;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      signal: controller.signal,
      headers: { "user-agent": "ParleyMap monthly roster review" }
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
  return (entity?.claims?.[property] || [])
    .map((claim) => claim?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

async function qidLabel(qid, cache) {
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

function countryCode(row) {
  const code = String(row.countryFocusCode || row.countryFocus || row.countryCode || "").toUpperCase();
  return code === "UK" ? "GB" : code;
}

function rowText(row) {
  return norm([row.id, row.slug, row.name, row.canonicalName, row.roleTitle, row.organization, row.country, row.countryName, row.wikidataId].join(" "));
}

function matchHolder(allRows, code, holderName) {
  const holder = norm(holderName);
  if (!holder) return null;
  const tokens = holder.split(" ").filter((x) => x.length >= 4);
  return allRows.find((row) => {
    if (countryCode(row) !== code) return false;
    const text = rowText(row);
    if (text.includes(holder)) return true;
    return tokens.length >= 2 && tokens.every((token) => text.includes(token));
  }) || null;
}

function isLeaderRole(row) {
  return /president|prime minister|head of state|head of government|chancellor|king|queen|monarch|emir|crown prince|pope/i.test(row.roleTitle || "");
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const data = readData();
const allRows = rows(data);
const cache = new Map();

const review = {
  generatedAt: new Date().toISOString(),
  status: "monthly_roster_review_complete",
  counts: {
    people: data.people?.length ?? null,
    roster: data.roster?.length ?? null,
    expansionRoster: data.expansionRoster?.length ?? null
  },
  checkedCountries: [],
  additionCandidates: [],
  possibleStaleRosterEntries: [],
  hygieneWarnings: []
};

for (const row of allRows) {
  if (!row.officialUrl || /wikipedia\.org/i.test(row.officialUrl)) {
    review.hygieneWarnings.push({
      id: row.id || null,
      name: row.canonicalName || row.name || null,
      issue: "officialUrl missing or points to Wikipedia"
    });
  }
}

for (const [code, name, qid] of COUNTRIES) {
  try {
    const entity = await fetchEntity(qid);
    const holderIds = [...new Set([...claimTargetIds(entity, "P35"), ...claimTargetIds(entity, "P6")])];
    const holderNames = [];
    for (const holderId of holderIds) holderNames.push(await qidLabel(holderId, cache));

    review.checkedCountries.push({ countryCode: code, countryName: name, wikidataId: qid, currentHolderNames: holderNames, status: "checked" });

    for (const holderName of holderNames) {
      const match = matchHolder(allRows, code, holderName);
      if (!match) {
        review.additionCandidates.push({
          countryCode: code,
          countryName: name,
          candidateName: holderName,
          source: `Wikidata ${qid} P35/P6`,
          action: "review_add_or_promote_current_office_holder"
        });
      }
    }

    const leaders = allRows.filter((row) => countryCode(row) === code && isLeaderRole(row));
    for (const row of leaders) {
      if (!holderNames.length) continue;
      const text = rowText(row);
      const current = holderNames.some((holderName) => {
        const h = norm(holderName);
        const parts = h.split(" ").filter((x) => x.length >= 4);
        return text.includes(h) || (parts.length >= 2 && parts.every((part) => text.includes(part)));
      });
      if (!current) {
        review.possibleStaleRosterEntries.push({
          id: row.id || null,
          name: row.canonicalName || row.name || null,
          roleTitle: row.roleTitle || null,
          countryCode: code,
          countryName: name,
          currentHolderNames: holderNames,
          action: "review_role_change_or_remove_from_current_leader_slot"
        });
      }
    }
  } catch (error) {
    review.checkedCountries.push({ countryCode: code, countryName: name, wikidataId: qid, status: "fetch_failed", error: String(error.message || error) });
  }
}

const patch = {
  generatedAt: review.generatedAt,
  status: "manual_review_required",
  additions: review.additionCandidates,
  possibleRemovalsOrRoleChanges: review.possibleStaleRosterEntries,
  note: "Diagnostics only. Do not auto-publish roster membership changes without review."
};

fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2) + "\n");
fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + "\n");
console.log(JSON.stringify({
  status: review.status,
  checkedCountries: review.checkedCountries.length,
  additionCandidates: review.additionCandidates.length,
  possibleStaleRosterEntries: review.possibleStaleRosterEntries.length,
  hygieneWarnings: review.hygieneWarnings.length
}, null, 2));
