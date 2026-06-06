import fs from "node:fs";

const INDEX_PATH = "index.html";
const REVIEW_PATH = "data/diagnostics/roster-current-holder-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const APPLY = process.env.AUTO_APPLY_SAFE_ROSTER === "1";

const COUNTRIES = [
  ["US", "United States", "Q30", ["Washington", "United States", 38.9072, -77.0369, "North America"]],
  ["MX", "Mexico", "Q96", ["Mexico City", "Mexico", 19.4326, -99.1332, "North America"]],
  ["ID", "Indonesia", "Q252", ["Jakarta", "Indonesia", -6.2088, 106.8456, "Asia"]],
  ["FR", "France", "Q142", ["Paris", "France", 48.8566, 2.3522, "Europe"]],
  ["DE", "Germany", "Q183", ["Berlin", "Germany", 52.52, 13.405, "Europe"]],
  ["GB", "United Kingdom", "Q145", ["London", "United Kingdom", 51.5074, -0.1278, "Europe"]],
  ["CA", "Canada", "Q16", ["Ottawa", "Canada", 45.4215, -75.6972, "North America"]],
  ["BR", "Brazil", "Q155", ["Brasilia", "Brazil", -15.7939, -47.8828, "South America"]],
  ["IN", "India", "Q668", ["New Delhi", "India", 28.6139, 77.209, "South Asia"]],
  ["JP", "Japan", "Q17", ["Tokyo", "Japan", 35.6762, 139.6503, "Asia"]],
  ["AU", "Australia", "Q408", ["Canberra", "Australia", -35.2809, 149.13, "Oceania"]],
  ["IT", "Italy", "Q38", ["Rome", "Italy", 41.9028, 12.4964, "Europe"]],
  ["ES", "Spain", "Q29", ["Madrid", "Spain", 40.4168, -3.7038, "Europe"]],
  ["UA", "Ukraine", "Q212", ["Kyiv", "Ukraine", 50.4501, 30.5234, "Europe"]],
  ["SA", "Saudi Arabia", "Q851", ["Riyadh", "Saudi Arabia", 24.7136, 46.6753, "Middle East"]]
];

function norm(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function slug(value) { return norm(value).replace(/ /g, "-").replace(/^-+|-+$/g, "").slice(0, 90); }
function readHtml() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  return { html, jsonStart, jsonEnd, data: JSON.parse(html.slice(jsonStart, jsonEnd).trim()) };
}
function writeHtml(payload, data) {
  const next = payload.html.slice(0, payload.jsonStart) + "\n" + JSON.stringify(data, null, 2) + "\n" + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, next);
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/demo.json", JSON.stringify(data, null, 2) + "\n");
}
function counts(data) {
  return { people: data.people?.length ?? null, roster: data.roster?.length ?? null, topRoster: data.topRoster?.length ?? null, expansionRoster: data.expansionRoster?.length ?? null, appearances: data.appearances?.length ?? null, categories: data.categories?.length ?? null };
}
function validate(data) {
  for (const key of ["people", "roster", "topRoster", "expansionRoster", "appearances", "categories"]) if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  if (data.people.length < 90 || data.people.length > 115) throw new Error(`unsafe people count ${data.people.length}`);
  if (data.roster.length < 190 || data.roster.length > 210) throw new Error(`unsafe roster count ${data.roster.length}`);
  if (data.expansionRoster.length < 100 || data.expansionRoster.length > 130) throw new Error(`unsafe expansionRoster count ${data.expansionRoster.length}`);
  if (data.appearances.length < 500) throw new Error("appearances count too low");
}
async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { signal: controller.signal, headers: { "user-agent": "ParleyMap current holder review" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.entities?.[qid] || null;
  } finally {
    clearTimeout(timer);
  }
}
function label(entity) { return entity?.labels?.en?.value || entity?.labels?.mul?.value || ""; }
function description(entity) { return entity?.descriptions?.en?.value || ""; }
function imageUrl(entity) {
  const file = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}` : null;
}
function hasEndDate(claim) { return Boolean(claim?.qualifiers?.P582?.length); }
function currentClaimIds(entity, property) {
  const claims = entity?.claims?.[property] || [];
  let selected = claims.filter((claim) => claim.rank === "preferred" && !hasEndDate(claim));
  if (!selected.length) selected = claims.filter((claim) => !hasEndDate(claim));
  const ids = selected.map((claim) => claim?.mainsnak?.datavalue?.value?.id).filter(Boolean);
  return [...new Set(ids)];
}
function rowCountry(row) { return String(row.countryFocusCode || row.countryFocus || row.countryCode || "").toUpperCase(); }
function rowText(row) { return norm([row.id, row.slug, row.name, row.canonicalName, row.roleTitle, row.organization, row.countryName, row.countryFocus, row.countryFocusCode].join(" ")); }
function isOfficeRole(row, office) {
  const text = rowText(row);
  if (/former|deceased|historical/.test(text)) return false;
  if (office === "P6") return /(prime minister|chancellor|head of government|premier)/.test(text);
  return /(president|king|queen|monarch|emir|pope|head of state)/.test(text);
}
function anchor(country) {
  const [city, countryName, lat, lng, region] = country.base;
  return { label: `${city} institutional base`, city, countryCode: country.code, countryName, lat, lng, lon: lng, longitude: lng, region, precision: "city", type: "institutional_base", privacy: "city-level public institutional base only" };
}
function applyAnchor(row, country) {
  const a = anchor(country);
  row.countryFocus = country.code; row.countryFocusCode = country.code; row.countryCode = country.code; row.countryName = country.name; row.country = country.name; row.homeRegion = a.region; row.locationStatus = "institutional_base_city_level";
  row.homeBases = [a]; row.homeBase = a; row.mapAnchor = a; row.anchorLocation = a; row.baseLocation = a; row.institutionalBase = a; row.location = a;
  row.lat = a.lat; row.lng = a.lng; row.lon = a.lng; row.latitude = a.lat; row.longitude = a.lng; row.mapLat = a.lat; row.mapLng = a.lng; row.homeLat = a.lat; row.homeLng = a.lng;
  row.flagAudit = { ...(row.flagAudit || {}), code: country.code, countryCode: country.code, countryName: country.name, label: country.name, status: "country flag" };
}
function allRows(data) { return [...data.people, ...data.roster, ...data.topRoster, ...data.expansionRoster]; }
function holderPresent(rows, holder) {
  const hn = norm(holder.name);
  return rows.find((row) => String(row.wikidataId || "") === holder.qid || norm(row.canonicalName || row.name || "") === hn || norm(row.canonicalName || row.name || "").includes(hn) || hn.includes(norm(row.canonicalName || row.name || ""))) || null;
}
function findSlot(data, country, office) {
  for (const collection of ["roster", "topRoster"]) {
    const rows = data[collection];
    const index = rows.findIndex((row) => (rowCountry(row) === country.code || norm(row.countryName || row.country) === norm(country.name)) && isOfficeRole(row, office));
    if (index >= 0) return { collection, index, row: rows[index] };
  }
  return null;
}
function createPersonFromSlot(slotRow, holder, country, office) {
  const out = structuredClone(slotRow || {});
  out.id = slug(holder.name); out.slug = out.id; out.name = holder.name; out.canonicalName = holder.name; out.wikidataId = holder.qid; out.wikiTitle = holder.name;
  out.profileUrl = `https://www.wikidata.org/wiki/${holder.qid}`; out.officialUrl = out.officialUrl || out.profileUrl; out.shortBio = holder.description || `${holder.name}, current office holder for ${country.name}.`;
  out.roleTitle = office === "P6" ? `Head of government of ${country.name}` : `Head of state of ${country.name}`; out.organization = country.name; out.category = out.category || "political_leader";
  if (holder.imageUrl) { out.imageUrl = holder.imageUrl; out.imageProvider = "Wikidata P18 / Wikimedia Commons"; }
  out.trackingStatus = "current_office_holder_reviewed"; out.lastRosterReview = new Date().toISOString(); applyAnchor(out, country); return out;
}
function markFormer(row) { if (!/^former/i.test(row.roleTitle || "")) row.roleTitle = `Former ${row.roleTitle || "office holder"}`; row.trackingStatus = "former_office_holder"; row.currentOfficeStatus = "replaced_by_current_office_holder"; }
async function main() {
  fs.mkdirSync("data/diagnostics", { recursive: true });
  const payload = readHtml(); const data = payload.data; validate(data); const before = counts(data);
  const candidates = []; const operations = []; const errors = [];
  for (const row of allRows(data)) {
    if (!row.wikidataId || !/^Q[0-9]+$/.test(String(row.wikidataId))) continue;
  }
  for (const [code, name, qid, base] of COUNTRIES) {
    const country = { code, name, qid, base };
    let entity; try { entity = await fetchEntity(qid); } catch (e) { errors.push({ countryCode: code, error: String(e.message || e) }); continue; }
    for (const office of ["P35", "P6"]) {
      const ids = currentClaimIds(entity, office);
      if (ids.length !== 1) { candidates.push({ countryCode: code, office, action: "skip_ambiguous_current_claims", holderIds: ids }); continue; }
      let holderEntity; try { holderEntity = await fetchEntity(ids[0]); } catch (e) { errors.push({ countryCode: code, office, holderQid: ids[0], error: String(e.message || e) }); continue; }
      const holder = { qid: ids[0], name: label(holderEntity), description: description(holderEntity), imageUrl: imageUrl(holderEntity) };
      if (!holder.name) continue;
      const slot = findSlot(data, country, office);
      const present = holderPresent(allRows(data), holder);
      candidates.push({ countryCode: code, countryName: name, office, currentHolder: holder.name, holderQid: holder.qid, present: Boolean(present), slot: slot ? { collection: slot.collection, name: slot.row.canonicalName || slot.row.name || null, id: slot.row.id || null } : null });
      if (!slot) continue;
      const slotName = slot.row.canonicalName || slot.row.name || "";
      const same = String(slot.row.wikidataId || "") === holder.qid || norm(slotName) === norm(holder.name) || norm(slotName).includes(norm(holder.name)) || norm(holder.name).includes(norm(slotName));
      if (same) { applyAnchor(slot.row, country); operations.push({ type: "confirm_and_anchor", collection: slot.collection, countryCode: code, office, name: holder.name }); continue; }
      if (!APPLY) continue;
      const newPerson = present || createPersonFromSlot(slot.row, holder, country, office);
      if (!present) data.people.push(newPerson);
      const oldId = slot.row.id; const oldName = slot.row.canonicalName || slot.row.name;
      for (const collection of ["roster", "topRoster"]) {
        const rows = data[collection];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if ((row.id && row.id === oldId) || norm(row.canonicalName || row.name) === norm(oldName)) {
            const rank = row.rank; const score = row.prominenceScore; rows[i] = { ...row, ...structuredClone(newPerson), rank, prominenceScore: score ?? newPerson.prominenceScore }; applyAnchor(rows[i], country);
            operations.push({ type: "replace_roster_slot", collection, countryCode: code, office, oldName, newName: holder.name });
          }
        }
      }
      for (const row of data.people) if ((oldId && row.id === oldId) || norm(row.canonicalName || row.name) === norm(oldName)) { markFormer(row); operations.push({ type: "mark_former", countryCode: code, oldName }); }
    }
  }
  const replacements = operations.filter((op) => op.type === "replace_roster_slot").length;
  const additions = Math.max(0, data.people.length - before.people);
  if (replacements > 8 || additions > 5 || data.people.length > 115) {
    const report = { generatedAt: new Date().toISOString(), status: "safety_gate_no_commit", apply: APPLY, before, after: counts(data), replacements, additions, operations, candidates, errors, reason: "too many roster changes for automatic publish" };
    fs.writeFileSync(REVIEW_PATH, JSON.stringify(report, null, 2) + "\n"); fs.writeFileSync(PATCH_PATH, JSON.stringify({ generatedAt: report.generatedAt, status: "manual_review_required", candidates, operations }, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2)); return;
  }
  data.meta = { ...(data.meta || {}), lastRosterCurrentHolderReview: new Date().toISOString(), rosterCurrentHolderReviewStatus: APPLY ? `applied ${operations.length} operations` : `reviewed ${candidates.length} holder candidates` };
  validate(data); const after = counts(data);
  if (after.roster !== before.roster || after.topRoster !== before.topRoster || after.expansionRoster !== before.expansionRoster || after.appearances !== before.appearances || after.categories !== before.categories) throw new Error("protected dataset count changed");
  if (APPLY) writeHtml(payload, data);
  const report = { generatedAt: new Date().toISOString(), status: APPLY ? "roster_current_holder_update_applied" : "roster_current_holder_review_only", apply: APPLY, before, after, replacements, additions, operations, candidates, errors };
  fs.writeFileSync(REVIEW_PATH, JSON.stringify(report, null, 2) + "\n"); fs.writeFileSync(PATCH_PATH, JSON.stringify({ generatedAt: report.generatedAt, status: APPLY ? "applied" : "review_only", candidates, operations }, null, 2) + "\n");
  fs.writeFileSync(SUMMARY_PATH, [`# ParleyMap roster current-holder review`, ``, `Status: ${report.status}`, `Apply mode: ${APPLY}`, `Candidates: ${candidates.length}`, `Operations: ${operations.length}`, `Replacements: ${replacements}`, `Additions: ${additions}`, `Errors: ${errors.length}`].join("\n") + "\n");
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
