import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/roster-auto-update-report.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const DEMO_PATH = "data/demo.json";

const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const APPLY = process.env.PARLEYMAP_ROSTER_APPLY !== "0";

const COUNTRY_QIDS = {
  US: "Q30", MX: "Q96", ID: "Q252", FR: "Q142", DE: "Q183", GB: "Q145", UK: "Q145",
  CN: "Q148", RU: "Q159", UA: "Q212", IN: "Q668", SA: "Q851", AE: "Q878", QA: "Q846",
  IR: "Q794", TR: "Q43", CA: "Q16", BR: "Q155", JP: "Q17", IT: "Q38", ES: "Q29",
  AU: "Q408", ZA: "Q258", AR: "Q414", NG: "Q1033", KE: "Q114", EG: "Q79", ET: "Q115",
  RW: "Q1037", PL: "Q36", HU: "Q28", CO: "Q739", CL: "Q298", IL: "Q801", NZ: "Q664",
  NO: "Q20", SE: "Q34", DK: "Q35", NL: "Q55", BE: "Q31", CH: "Q39", SG: "Q334", VA: "Q237"
};

const COUNTRY_NAMES = {
  US: "United States", MX: "Mexico", ID: "Indonesia", FR: "France", DE: "Germany", GB: "United Kingdom",
  CN: "China", RU: "Russia", UA: "Ukraine", IN: "India", SA: "Saudi Arabia", AE: "United Arab Emirates",
  QA: "Qatar", IR: "Iran", TR: "Turkey", CA: "Canada", BR: "Brazil", JP: "Japan", IT: "Italy",
  ES: "Spain", AU: "Australia", ZA: "South Africa", AR: "Argentina", NG: "Nigeria", KE: "Kenya",
  EG: "Egypt", ET: "Ethiopia", RW: "Rwanda", PL: "Poland", HU: "Hungary", CO: "Colombia",
  CL: "Chile", IL: "Israel", NZ: "New Zealand", NO: "Norway", SE: "Sweden", DK: "Denmark",
  NL: "Netherlands", BE: "Belgium", CH: "Switzerland", SG: "Singapore", VA: "Vatican City"
};

const BASES = {
  US: ["Washington", "United States", 38.9072, -77.0369, "North America"],
  MX: ["Mexico City", "Mexico", 19.4326, -99.1332, "North America"],
  ID: ["Jakarta", "Indonesia", -6.2088, 106.8456, "Asia"],
  FR: ["Paris", "France", 48.8566, 2.3522, "Europe"],
  DE: ["Berlin", "Germany", 52.52, 13.405, "Europe"],
  GB: ["London", "United Kingdom", 51.5074, -0.1278, "Europe"],
  CN: ["Beijing", "China", 39.9042, 116.4074, "Asia"],
  RU: ["Moscow", "Russia", 55.7558, 37.6173, "Europe"],
  UA: ["Kyiv", "Ukraine", 50.4501, 30.5234, "Europe"],
  IN: ["New Delhi", "India", 28.6139, 77.209, "South Asia"],
  SA: ["Riyadh", "Saudi Arabia", 24.7136, 46.6753, "Middle East"],
  AE: ["Abu Dhabi", "United Arab Emirates", 24.4539, 54.3773, "Middle East"],
  QA: ["Doha", "Qatar", 25.2854, 51.531, "Middle East"],
  IR: ["Tehran", "Iran", 35.6892, 51.389, "Middle East"],
  TR: ["Ankara", "Turkey", 39.9334, 32.8597, "Middle East"],
  CA: ["Ottawa", "Canada", 45.4215, -75.6972, "North America"],
  BR: ["Brasilia", "Brazil", -15.7939, -47.8828, "South America"],
  JP: ["Tokyo", "Japan", 35.6762, 139.6503, "Asia"],
  IT: ["Rome", "Italy", 41.9028, 12.4964, "Europe"],
  ES: ["Madrid", "Spain", 40.4168, -3.7038, "Europe"],
  AU: ["Canberra", "Australia", -35.2809, 149.13, "Oceania"],
  ZA: ["Pretoria", "South Africa", -25.7479, 28.2293, "Africa"],
  AR: ["Buenos Aires", "Argentina", -34.6037, -58.3816, "South America"],
  NG: ["Abuja", "Nigeria", 9.0765, 7.3986, "Africa"],
  KE: ["Nairobi", "Kenya", -1.2921, 36.8219, "Africa"],
  EG: ["Cairo", "Egypt", 30.0444, 31.2357, "Africa"],
  ET: ["Addis Ababa", "Ethiopia", 9.03, 38.74, "Africa"],
  RW: ["Kigali", "Rwanda", -1.9441, 30.0619, "Africa"],
  PL: ["Warsaw", "Poland", 52.2297, 21.0122, "Europe"],
  HU: ["Budapest", "Hungary", 47.4979, 19.0402, "Europe"],
  CO: ["Bogota", "Colombia", 4.711, -74.0721, "South America"],
  CL: ["Santiago", "Chile", -33.4489, -70.6693, "South America"],
  IL: ["Jerusalem", "Israel", 31.7683, 35.2137, "Middle East"],
  NZ: ["Wellington", "New Zealand", -41.2865, 174.7762, "Oceania"],
  NO: ["Oslo", "Norway", 59.9139, 10.7522, "Europe"],
  SE: ["Stockholm", "Sweden", 59.3293, 18.0686, "Europe"],
  DK: ["Copenhagen", "Denmark", 55.6761, 12.5683, "Europe"],
  NL: ["Amsterdam", "Netherlands", 52.3676, 4.9041, "Europe"],
  BE: ["Brussels", "Belgium", 50.8503, 4.3517, "Europe"],
  CH: ["Bern", "Switzerland", 46.948, 7.4474, "Europe"],
  SG: ["Singapore", "Singapore", 1.3521, 103.8198, "Asia"],
  VA: ["Vatican City", "Vatican City", 41.9029, 12.4534, "Europe"]
};

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return norm(value).replace(/ /g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function readEmbeddedData() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { html, jsonStart, jsonEnd, data };
}

function writeEmbeddedData(payload, data) {
  const next = payload.html.slice(0, payload.jsonStart) + "\n" + JSON.stringify(data, null, 2) + "\n" + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, next);
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(DEMO_PATH, JSON.stringify(data, null, 2) + "\n");
}

function counts(data) {
  return {
    people: data.people?.length ?? null,
    roster: data.roster?.length ?? null,
    topRoster: data.topRoster?.length ?? null,
    expansionRoster: data.expansionRoster?.length ?? null,
    appearances: data.appearances?.length ?? null,
    categories: data.categories?.length ?? null
  };
}

function validateCore(data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length < 90) throw new Error("people count too low");
  if (data.roster.length < 190) throw new Error("roster count too low");
  if (data.expansionRoster.length < 100) throw new Error("expansionRoster count too low");
  if (data.appearances.length < 500) throw new Error("appearances count too low");
}

function countryCode(row) {
  const candidates = [row.countryFocusCode, row.countryFocus, row.countryCode];
  for (const raw of candidates) {
    let code = String(raw || "").toUpperCase().trim();
    if (code === "UK") code = "GB";
    if (COUNTRY_QIDS[code]) return code;
  }
  const name = norm(row.countryName || row.country || row.organization);
  for (const [code, label] of Object.entries(COUNTRY_NAMES)) {
    if (norm(label) === name) return code;
  }
  if (name.includes("vatican") || name.includes("holy see")) return "VA";
  return "";
}

function roleKind(row) {
  const text = norm([row.roleTitle, row.organization, row.category, row.profileLine].join(" "));
  if (/prime minister|head of government|chancellor|premier|taoiseach/.test(text)) return "head_of_government";
  if (/president|head of state|monarch|king|queen|emir|pope|pontiff|bishop of rome|supreme leader/.test(text)) return "head_of_state";
  return "";
}

function wikidataId(row) {
  const id = String(row.wikidataId || "").trim();
  return /^Q[0-9]+$/.test(id) ? id : "";
}

function label(entity) {
  return entity?.labels?.en?.value || entity?.labels?.mul?.value || Object.values(entity?.labels || {})[0]?.value || "";
}

function description(entity) {
  return entity?.descriptions?.en?.value || "";
}

function claimValues(entity, property) {
  return entity?.claims?.[property] || [];
}

function claimTargetIds(entity, property) {
  const claims = claimValues(entity, property)
    .filter((claim) => claim.rank !== "deprecated")
    .sort((a, b) => (a.rank === "preferred" ? -1 : 0) - (b.rank === "preferred" ? -1 : 0));
  return claims.map((claim) => claim?.mainsnak?.datavalue?.value?.id).filter(Boolean);
}

function firstClaimString(entity, property) {
  const claim = claimValues(entity, property).find((item) => item.rank !== "deprecated");
  const value = claim?.mainsnak?.datavalue?.value;
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.time) return value.time.replace(/^\+/, "");
  return "";
}

function commonsImageUrl(entity) {
  const file = firstClaimString(entity, "P18");
  if (!file) return "";
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
}

function deathDate(entity) {
  return firstClaimString(entity, "P570");
}

async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      signal: controller.signal,
      headers: { "user-agent": "ParleyMap roster auto updater" }
    });
    if (!response.ok) throw new Error(`Wikidata ${qid} HTTP ${response.status}`);
    const json = await response.json();
    return json.entities?.[qid] || null;
  } finally {
    clearTimeout(timer);
  }
}

function baseFor(code) {
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
    lon: lng,
    latitude: lat,
    longitude: lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only",
    region
  };
}

function applyBase(row, code) {
  const base = baseFor(code);
  if (!base) return;
  row.homeBases = [base];
  row.homeBase = base;
  row.mapAnchor = base;
  row.anchorLocation = base;
  row.locationStatus = "institutional_base_city_level";
  row.homeRegion = base.region;
  row.countryFocus = code;
  row.countryFocusCode = code;
  row.countryCode = code;
  row.countryName = base.countryName;
  row.country = base.countryName;
  row.lat = base.lat;
  row.lng = base.lng;
  row.lon = base.lng;
  row.latitude = base.lat;
  row.longitude = base.lng;
  row.flagAudit = { ...(row.flagAudit || {}), code, countryCode: code, countryName: base.countryName, label: base.countryName, status: "country flag" };
  row.flagCode = code;
  row.countryFlagCode = code;
}

function roleTitleFor(oldRow, role, countryName) {
  const old = String(oldRow.roleTitle || "");
  if (role === "head_of_government") {
    if (/chancellor/i.test(old)) return `Chancellor of ${countryName}`;
    if (/prime minister/i.test(old)) return `Prime Minister of ${countryName}`;
    return `Head of government of ${countryName}`;
  }
  if (/pope|pontiff|bishop of rome/i.test(old)) return "Pope";
  if (/king/i.test(old)) return `King of ${countryName}`;
  if (/queen/i.test(old)) return `Queen of ${countryName}`;
  return `President of ${countryName}`;
}

function buildReplacement(oldRow, holder, role, code) {
  const name = holder.name;
  const s = slug(name);
  const rankPrefix = oldRow.rank ? `r-${String(oldRow.rank).padStart(3, "0")}` : "r-auto";
  const id = `${rankPrefix}-${s}`;
  const countryName = COUNTRY_NAMES[code] || holder.countryName || "";
  const next = structuredClone(oldRow);
  next.id = id;
  next.slug = s;
  next.name = name;
  next.canonicalName = name;
  next.wikidataId = holder.qid;
  next.wikiTitle = holder.wikipediaTitle || name;
  next.profileUrl = `https://www.wikidata.org/wiki/${holder.qid}`;
  next.roleTitle = roleTitleFor(oldRow, role, countryName);
  next.organization = oldRow.organization || countryName;
  next.shortBio = holder.description || `${next.roleTitle}.`;
  next.profileLine = `${next.roleTitle}.`;
  next.trackingStatus = "active_current_office_holder";
  next.sourcePriority = "monthly_roster_auto_update";
  next.rosterAutoUpdatedAt = new Date().toISOString();
  if (holder.imageUrl) {
    next.imageUrl = holder.imageUrl;
    next.imageProvider = "Wikidata P18 via Wikimedia Commons";
    next.visualAuditStatus = next.visualAuditStatus || "needs image audit";
  }
  if (holder.birthDate) {
    next.birthDate = holder.birthDate.slice(0, 10);
    next.birthdayAuditStatus = "wikidata";
  }
  applyBase(next, code);
  return next;
}

function samePerson(row, holder) {
  const oldQid = wikidataId(row);
  if (oldQid && oldQid === holder.qid) return true;
  const oldName = norm(row.canonicalName || row.name || "");
  const newName = norm(holder.name || "");
  return oldName && newName && (oldName === newName || oldName.includes(newName) || newName.includes(oldName));
}

function rowKey(row) {
  return row.id || row.slug || row.wikidataId || `${row.rank || ""}:${row.name || row.canonicalName || ""}`;
}

function hasAppearances(data, personId) {
  return Array.isArray(data.appearances) && data.appearances.some((appearance) => appearance.personId === personId);
}

function markFormer(row, decision, reason) {
  row.trackingStatus = reason === "deceased" ? "deceased_or_retired" : "former_office_holder";
  row.formerRoleTitle = row.formerRoleTitle || row.roleTitle || null;
  if (row.roleTitle && !/^Former\b/i.test(row.roleTitle)) row.roleTitle = `Former ${row.roleTitle}`;
  row.currentReplacementId = decision.newRow.id;
  row.currentReplacementName = decision.holder.name;
  row.rosterAutoUpdateNote = reason === "deceased" ? "Marked by monthly roster auto update because Wikidata has a death date." : "Replaced by monthly roster auto update because current office holder changed.";
}

function findExistingByQid(data, qid) {
  for (const collection of ["people", "roster", "topRoster", "expansionRoster"]) {
    const found = (data[collection] || []).find((row) => wikidataId(row) === qid);
    if (found) return found;
  }
  return null;
}

function upsertPeople(data, oldRow, decision, applied) {
  const existing = findExistingByQid(data, decision.holder.qid);
  if (existing) {
    applyBase(existing, decision.countryCode);
    return;
  }
  const oldInPeople = data.people.find((row) => row.id === oldRow.id || wikidataId(row) === wikidataId(oldRow));
  if (oldInPeople && !hasAppearances(data, oldInPeople.id)) {
    const idx = data.people.indexOf(oldInPeople);
    data.people[idx] = structuredClone(decision.newRow);
    applied.push({ action: "replace_people_row", oldId: oldRow.id, newId: decision.newRow.id, newName: decision.holder.name });
  } else {
    const newPerson = structuredClone(decision.newRow);
    newPerson.prominenceScore = Math.max(Number(newPerson.prominenceScore || 0), 82);
    data.people.push(newPerson);
    applied.push({ action: "add_people_row", oldId: oldRow.id, newId: decision.newRow.id, newName: decision.holder.name });
    if (oldInPeople) markFormer(oldInPeople, decision, decision.reason);
  }
}

function replaceInCollection(rows, decision, collectionName, applied) {
  if (!Array.isArray(rows)) return;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;
    const sameOldId = row.id && row.id === decision.oldRow.id;
    const sameOldQid = wikidataId(row) && wikidataId(row) === decision.oldQid;
    const sameRank = collectionName !== "people" && row.rank && decision.oldRow.rank && row.rank === decision.oldRow.rank && countryCode(row) === decision.countryCode && roleKind(row) === decision.role;
    if (sameOldId || sameOldQid || sameRank) {
      rows[i] = structuredClone(decision.newRow);
      applied.push({ action: `replace_${collectionName}`, oldId: row.id || null, newId: decision.newRow.id, oldName: row.canonicalName || row.name || null, newName: decision.holder.name });
    }
  }
}

async function holderForCountry(countryCode, role) {
  const qid = COUNTRY_QIDS[countryCode];
  if (!qid) return null;
  const countryEntity = await fetchEntity(qid);
  const property = role === "head_of_government" ? "P6" : "P35";
  const ids = [...new Set(claimTargetIds(countryEntity, property))];
  if (!ids.length) return null;
  const holderQid = ids[0];
  const entity = await fetchEntity(holderQid);
  if (!entity) return null;
  const sitelink = entity.sitelinks?.enwiki?.title || "";
  return {
    qid: holderQid,
    name: label(entity) || holderQid,
    description: description(entity),
    wikipediaTitle: sitelink,
    imageUrl: commonsImageUrl(entity),
    birthDate: firstClaimString(entity, "P569"),
    deathDate: deathDate(entity),
    sourceCountryQid: qid,
    sourceProperty: property
  };
}

async function oldEntityDeath(row) {
  const qid = wikidataId(row);
  if (!qid) return "";
  try {
    const entity = await fetchEntity(qid);
    return deathDate(entity);
  } catch {
    return "";
  }
}

async function buildDecisions(data) {
  const decisions = [];
  const seen = new Set();
  const rosterRows = Array.isArray(data.roster) ? data.roster : [];
  for (const oldRow of rosterRows) {
    const code = countryCode(oldRow);
    const role = roleKind(oldRow);
    if (!code || !role || !COUNTRY_QIDS[code]) continue;
    const key = `${code}:${role}:${rowKey(oldRow)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let holder = null;
    try {
      holder = await holderForCountry(code, role);
    } catch (error) {
      decisions.push({ type: "lookup_failed", oldRow: { id: oldRow.id, name: oldRow.canonicalName || oldRow.name, countryCode: code, role }, error: String(error.message || error) });
      continue;
    }
    if (!holder) continue;
    const oldQid = wikidataId(oldRow);
    const deceasedDate = await oldEntityDeath(oldRow);
    if (samePerson(oldRow, holder) && !deceasedDate) continue;
    const reason = deceasedDate ? "deceased" : "office_holder_changed";
    const newRow = buildReplacement(oldRow, holder, role, code);
    decisions.push({
      type: "replace_current_office_holder",
      reason,
      countryCode: code,
      countryName: COUNTRY_NAMES[code],
      role,
      oldQid,
      oldRow: structuredClone(oldRow),
      holder,
      newRow,
      deathDate: deceasedDate || null,
      source: `Wikidata ${COUNTRY_QIDS[code]} ${holder.sourceProperty}`
    });
  }
  return decisions;
}

function applyDecisions(data, decisions) {
  const applied = [];
  for (const decision of decisions.filter((d) => d.type === "replace_current_office_holder")) {
    if (!decision.newRow || !decision.holder?.qid) continue;
    replaceInCollection(data.roster, decision, "roster", applied);
    replaceInCollection(data.topRoster, decision, "topRoster", applied);
    upsertPeople(data, decision.oldRow, decision, applied);
    const oldExpansion = (data.expansionRoster || []).find((row) => row.id === decision.oldRow.id || wikidataId(row) === decision.oldQid);
    if (oldExpansion) markFormer(oldExpansion, decision, decision.reason);
  }
  return applied;
}

fs.mkdirSync("data/diagnostics", { recursive: true });
const payload = readEmbeddedData();
const data = payload.data;
validateCore(data);
const before = counts(data);
const topLevelKeysBefore = Object.keys(data).sort();

const decisions = await buildDecisions(data);
const actionable = decisions.filter((d) => d.type === "replace_current_office_holder");
const lookupFailures = decisions.filter((d) => d.type === "lookup_failed");
let applied = [];

if (APPLY) {
  applied = applyDecisions(data, decisions);
  data.meta = {
    ...(data.meta || {}),
    lastRosterAutoUpdate: new Date().toISOString(),
    rosterAutoUpdateStatus: actionable.length ? `applied ${applied.length} roster update operations for ${actionable.length} office-holder changes` : "no office-holder changes found"
  };
}

validateCore(data);
const after = counts(data);
const topLevelKeysAfter = Object.keys(data).sort();
if (JSON.stringify(topLevelKeysBefore) !== JSON.stringify(topLevelKeysAfter)) throw new Error("top-level keys changed unexpectedly");
if (before.roster !== after.roster) throw new Error("roster count changed unexpectedly");
if (before.expansionRoster !== after.expansionRoster) throw new Error("expansionRoster count changed unexpectedly");
if (before.appearances !== after.appearances) throw new Error("appearances count changed unexpectedly");
if (before.categories !== after.categories) throw new Error("categories count changed unexpectedly");

if (APPLY) writeEmbeddedData(payload, data);

const report = {
  generatedAt: new Date().toISOString(),
  status: APPLY ? "roster_auto_update_applied" : "roster_auto_update_dry_run",
  apply: APPLY,
  before,
  after,
  actionableChangeCount: actionable.length,
  appliedOperationCount: applied.length,
  changes: actionable.map((d) => ({
    reason: d.reason,
    countryCode: d.countryCode,
    countryName: d.countryName,
    role: d.role,
    oldId: d.oldRow.id || null,
    oldName: d.oldRow.canonicalName || d.oldRow.name || null,
    oldQid: d.oldQid || null,
    newId: d.newRow.id,
    newName: d.holder.name,
    newQid: d.holder.qid,
    source: d.source,
    deathDate: d.deathDate
  })),
  applied,
  lookupFailures
};

const patchCandidates = {
  generatedAt: report.generatedAt,
  status: APPLY ? "already_applied_by_roster_auto_update" : "manual_review_required",
  additionsOrReplacements: report.changes,
  lookupFailures
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(PATCH_PATH, JSON.stringify(patchCandidates, null, 2) + "\n");

const summary = [
  "# ParleyMap roster auto update",
  "",
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Apply mode: ${report.apply}`,
  "",
  "## Counts",
  "",
  "| Item | Before | After |",
  "|---|---:|---:|",
  ...Object.keys(before).map((key) => `| ${key} | ${before[key]} | ${after[key]} |`),
  "",
  "## Office-holder changes",
  "",
  report.changes.length ? report.changes.map((c) => `- ${c.countryCode} ${c.role}: ${c.oldName} -> ${c.newName} (${c.reason})`).join("\n") : "No office-holder changes found.",
  "",
  "## Applied operations",
  "",
  applied.length ? applied.map((a) => `- ${a.action}: ${a.oldId || "n/a"} -> ${a.newId || "n/a"}`).join("\n") : "No operations applied.",
  ""
].join("\n");

fs.writeFileSync(SUMMARY_PATH, summary);
console.log(JSON.stringify({ status: report.status, actionableChangeCount: report.actionableChangeCount, appliedOperationCount: report.appliedOperationCount, before, after }, null, 2));
