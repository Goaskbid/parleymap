import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/roster-current-holder-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const SUMMARY_APPEND_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";

const TARGET_COUNTRIES = [
  { code: "US", name: "United States", qid: "Q30", base: ["Washington", "United States", 38.9072, -77.0369, "North America"] },
  { code: "MX", name: "Mexico", qid: "Q96", base: ["Mexico City", "Mexico", 19.4326, -99.1332, "North America"] },
  { code: "ID", name: "Indonesia", qid: "Q252", base: ["Jakarta", "Indonesia", -6.2088, 106.8456, "Asia"] },
  { code: "FR", name: "France", qid: "Q142", base: ["Paris", "France", 48.8566, 2.3522, "Europe"] },
  { code: "DE", name: "Germany", qid: "Q183", base: ["Berlin", "Germany", 52.52, 13.405, "Europe"] },
  { code: "GB", name: "United Kingdom", qid: "Q145", base: ["London", "United Kingdom", 51.5074, -0.1278, "Europe"] },
  { code: "CA", name: "Canada", qid: "Q16", base: ["Ottawa", "Canada", 45.4215, -75.6972, "North America"] },
  { code: "BR", name: "Brazil", qid: "Q155", base: ["Brasilia", "Brazil", -15.7939, -47.8828, "South America"] },
  { code: "IN", name: "India", qid: "Q668", base: ["New Delhi", "India", 28.6139, 77.209, "South Asia"] },
  { code: "JP", name: "Japan", qid: "Q17", base: ["Tokyo", "Japan", 35.6762, 139.6503, "Asia"] },
  { code: "AU", name: "Australia", qid: "Q408", base: ["Canberra", "Australia", -35.2809, 149.13, "Oceania"] },
  { code: "IT", name: "Italy", qid: "Q38", base: ["Rome", "Italy", 41.9028, 12.4964, "Europe"] },
  { code: "ES", name: "Spain", qid: "Q29", base: ["Madrid", "Spain", 40.4168, -3.7038, "Europe"] },
  { code: "PL", name: "Poland", qid: "Q36", base: ["Warsaw", "Poland", 52.2297, 21.0122, "Europe"] },
  { code: "UA", name: "Ukraine", qid: "Q212", base: ["Kyiv", "Ukraine", 50.4501, 30.5234, "Europe"] },
  { code: "TR", name: "Turkey", qid: "Q43", base: ["Ankara", "Turkey", 39.9334, 32.8597, "Middle East"] },
  { code: "SA", name: "Saudi Arabia", qid: "Q851", base: ["Riyadh", "Saudi Arabia", 24.7136, 46.6753, "Middle East"] },
  { code: "AE", name: "United Arab Emirates", qid: "Q878", base: ["Abu Dhabi", "United Arab Emirates", 24.4539, 54.3773, "Middle East"] },
  { code: "QA", name: "Qatar", qid: "Q846", base: ["Doha", "Qatar", 25.2854, 51.531, "Middle East"] },
  { code: "IL", name: "Israel", qid: "Q801", base: ["Jerusalem", "Israel", 31.7683, 35.2137, "Middle East"] },
  { code: "ZA", name: "South Africa", qid: "Q258", base: ["Pretoria", "South Africa", -25.7479, 28.2293, "Africa"] },
  { code: "AR", name: "Argentina", qid: "Q414", base: ["Buenos Aires", "Argentina", -34.6037, -58.3816, "South America"] }
];

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function slug(value) { return norm(value).replace(/ /g, "-").slice(0, 90); }

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  return { html, jsonStart, jsonEnd, data: JSON.parse(html.slice(jsonStart, jsonEnd).trim()) };
}

function writeEmbedded(payload, data) {
  const nextHtml = payload.html.slice(0, payload.jsonStart) + "\n" + JSON.stringify(data, null, 2) + "\n" + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  fs.writeFileSync("data/demo.json", JSON.stringify(data, null, 2) + "\n");
}

function counts(data) {
  return { people: data.people.length, roster: data.roster.length, topRoster: data.topRoster?.length ?? null, expansionRoster: data.expansionRoster.length, appearances: data.appearances.length, categories: data.categories.length };
}

function validateSafeCounts(data) {
  if (!Array.isArray(data.people) || data.people.length < 90 || data.people.length > 115) throw new Error(`unsafe people count ${data.people?.length}`);
  if (!Array.isArray(data.roster) || data.roster.length !== 200) throw new Error(`unsafe roster count ${data.roster?.length}`);
  if (!Array.isArray(data.expansionRoster) || data.expansionRoster.length < 100 || data.expansionRoster.length > 130) throw new Error(`unsafe expansionRoster count ${data.expansionRoster?.length}`);
  if (!Array.isArray(data.appearances) || data.appearances.length < 500) throw new Error("appearances count too low");
}

async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { signal: controller.signal, headers: { "user-agent": "ParleyMap safe current-holder review" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.entities?.[qid] || null;
  } finally {
    clearTimeout(timer);
  }
}

function label(entity) { return entity?.labels?.en?.value || entity?.labels?.mul?.value || ""; }
function description(entity) { return entity?.descriptions?.en?.value || ""; }
function claimEndTime(claim) { return claim?.qualifiers?.P582?.[0]?.datavalue?.value?.time || null; }
function targetId(claim) { return claim?.mainsnak?.datavalue?.value?.id || null; }

function currentClaimIds(entity, property) {
  const claims = (entity?.claims?.[property] || []).filter(claim => claim.rank !== "deprecated" && targetId(claim));
  const noEnd = claims.filter(claim => !claimEndTime(claim));
  const preferred = noEnd.filter(claim => claim.rank === "preferred");
  const use = preferred.length ? preferred : noEnd;
  return [...new Set(use.map(targetId))];
}

function rowCountry(row) { return String(row.countryFocusCode || row.countryFocus || row.countryCode || "").toUpperCase(); }
function rowName(row) { return row.canonicalName || row.name || ""; }
function rowText(row) { return norm([row.id, row.slug, row.name, row.canonicalName, row.roleTitle, row.organization, row.countryName, row.countryFocusCode, row.countryFocus].join(" ")); }
function isCurrentRole(row, office) {
  const text = rowText(row);
  if (/former|deceased|historical/.test(text)) return false;
  if (office === "P6") return /prime minister|chancellor|head of government|premier/.test(text);
  return /president|king|queen|monarch|emir|head of state/.test(text) && !/former/.test(text);
}
function sameName(a, b) { const aa = norm(a), bb = norm(b); return Boolean(aa && bb && (aa === bb || aa.includes(bb) || bb.includes(aa))); }
function holderPresent(rows, holder) {
  return rows.find(row => String(row.wikidataId || "") === holder.qid || sameName(rowName(row), holder.name)) || null;
}
function anchorFor(country) {
  const [city, countryName, lat, lng, region] = country.base;
  return { label: `${city} institutional base`, city, countryCode: country.code, countryName, lat, lng, precision: "city", type: "institutional_base", privacy: "city-level public institutional base only", region };
}
function applyAnchor(row, country) {
  const a = anchorFor(country);
  row.countryFocus = country.code; row.countryFocusCode = country.code; row.countryCode = country.code; row.countryName = country.name; row.country = country.name;
  row.homeRegion = a.region; row.locationStatus = "institutional_base_city_level";
  row.homeBases = [a]; row.homeBase = a; row.mapAnchor = a; row.anchorLocation = a;
  row.lat = a.lat; row.lng = a.lng; row.latitude = a.lat; row.longitude = a.lng; row.mapLat = a.lat; row.mapLng = a.lng; row.homeLat = a.lat; row.homeLng = a.lng;
}
function allRows(data) { return [...data.people, ...data.roster, ...(data.topRoster || []), ...data.expansionRoster]; }
function slotsFor(data, country, office) {
  const out = [];
  for (const collection of ["roster", "topRoster"]) {
    const rows = data[collection] || [];
    rows.forEach((row, index) => { if (row && rowCountry(row) === country.code && isCurrentRole(row, office)) out.push({ collection, index, row }); });
  }
  return out;
}
function createPersonFromSlot(slotRow, holder, country, office) {
  const row = structuredClone(slotRow || {});
  row.id = slug(holder.name); row.slug = row.id; row.name = holder.name; row.canonicalName = holder.name; row.wikidataId = holder.qid;
  row.roleTitle = office === "P6" ? `Head of government of ${country.name}` : `Head of state of ${country.name}`;
  row.organization = country.name; row.category = row.category || "political_leader"; row.profileLine = row.roleTitle; row.shortBio = holder.description || row.shortBio || row.roleTitle;
  row.trackingStatus = "current_office_holder_safe_update"; row.sourcePriority = "monthly_safe_current_holder_review"; row.lastRosterSafeUpdate = new Date().toISOString();
  applyAnchor(row, country);
  return row;
}

async function main() {
  fs.mkdirSync("data/diagnostics", { recursive: true });
  const payload = readEmbedded();
  const data = payload.data;
  validateSafeCounts(data);
  const before = counts(data);
  const candidates = [];
  const planned = [];
  const errors = [];

  for (const country of TARGET_COUNTRIES) {
    let countryEntity;
    try { countryEntity = await fetchEntity(country.qid); } catch (error) { errors.push({ countryCode: country.code, stage: "country", error: String(error.message || error) }); continue; }
    for (const office of ["P35", "P6"]) {
      const holderIds = currentClaimIds(countryEntity, office);
      for (const qid of holderIds) {
        let holderEntity;
        try { holderEntity = await fetchEntity(qid); } catch (error) { errors.push({ countryCode: country.code, office, qid, stage: "holder", error: String(error.message || error) }); continue; }
        const holder = { qid, name: label(holderEntity), description: description(holderEntity) };
        if (!holder.name) continue;
        const slots = slotsFor(data, country, office);
        const present = holderPresent(allRows(data), holder);
        candidates.push({ countryCode: country.code, countryName: country.name, office, holderName: holder.name, holderQid: qid, slotCount: slots.length, alreadyPresent: Boolean(present), slotNames: slots.map(s => rowName(s.row)) });
        for (const slot of slots) {
          if (String(slot.row.wikidataId || "") === qid || sameName(rowName(slot.row), holder.name)) {
            planned.push({ type: "repair_current_holder_anchor", country, office, holder, slot });
          } else {
            planned.push({ type: "replace_current_holder", country, office, holder, slot });
          }
        }
      }
    }
  }

  const replacements = planned.filter(p => p.type === "replace_current_holder");
  const additionsNeeded = replacements.filter(p => !holderPresent(data.people, p.holder));
  const safeToApply = replacements.length <= 3 && additionsNeeded.length <= 3 && before.people + additionsNeeded.length <= 115;
  const operations = [];

  if (safeToApply) {
    for (const plan of planned) {
      if (plan.type === "repair_current_holder_anchor") {
        applyAnchor(plan.slot.row, plan.country);
        plan.slot.row.wikidataId = plan.holder.qid;
        plan.slot.row.canonicalName = plan.holder.name;
        plan.slot.row.name = plan.holder.name;
        operations.push({ type: plan.type, collection: plan.slot.collection, index: plan.slot.index, countryCode: plan.country.code, name: plan.holder.name });
        continue;
      }
      let person = holderPresent(data.people, plan.holder);
      if (!person) { person = createPersonFromSlot(plan.slot.row, plan.holder, plan.country, plan.office); data.people.push(person); }
      const rank = plan.slot.row.rank; const prominenceScore = plan.slot.row.prominenceScore;
      const old = { id: plan.slot.row.id || null, name: rowName(plan.slot.row) };
      Object.assign(plan.slot.row, structuredClone(person));
      if (rank !== undefined) plan.slot.row.rank = rank;
      if (prominenceScore !== undefined) plan.slot.row.prominenceScore = prominenceScore;
      applyAnchor(plan.slot.row, plan.country);
      operations.push({ type: plan.type, collection: plan.slot.collection, index: plan.slot.index, countryCode: plan.country.code, office: plan.office, old, new: { id: plan.slot.row.id, name: rowName(plan.slot.row), qid: plan.holder.qid } });
    }
  }

  data.meta = { ...(data.meta || {}), lastRosterSafeReview: new Date().toISOString(), rosterSafeReviewStatus: safeToApply ? `applied ${operations.length} safe operations` : `review only; replacements=${replacements.length}; additions=${additionsNeeded.length}` };
  validateSafeCounts(data);
  const after = counts(data);
  if (after.roster !== before.roster || after.expansionRoster !== before.expansionRoster || after.appearances !== before.appearances || after.categories !== before.categories) throw new Error("safe roster review changed structural counts");
  if (after.people > 115) throw new Error("safe roster review would exceed people cap");

  if (safeToApply) writeEmbedded(payload, data);

  const report = { generatedAt: new Date().toISOString(), status: safeToApply ? "safe_current_holder_update_applied" : "review_only_no_write", before, after: safeToApply ? after : before, safeToApply, replacementsPlanned: replacements.length, additionsNeeded: additionsNeeded.length, operations, candidates, errors };
  const patch = { generatedAt: report.generatedAt, status: report.status, replacements: replacements.map(p => ({ countryCode: p.country.code, office: p.office, oldName: rowName(p.slot.row), newName: p.holder.name, holderQid: p.holder.qid })), candidates };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + "\n");
  fs.appendFileSync(SUMMARY_APPEND_PATH, `\n## Safe current-holder review\n\n- Status: ${report.status}\n- Replacements planned: ${replacements.length}\n- Additions needed: ${additionsNeeded.length}\n- Operations applied: ${operations.length}\n`);
  console.log(JSON.stringify({ status: report.status, replacementsPlanned: replacements.length, additionsNeeded: additionsNeeded.length, operations: operations.length }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
