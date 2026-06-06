import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/roster-current-holder-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN = '<script id="demo-data" type="application/json">';
const CLOSE = "</" + "script>";
const APPLY = process.env.PARLEYMAP_APPLY_ROSTER === "1";
const MAX_REPLACEMENTS = 3;
const MAX_PEOPLE_ADDITIONS = 3;

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
  ["PL", "Poland", "Q36", ["Warsaw", "Poland", 52.2297, 21.0122, "Europe"]],
  ["UA", "Ukraine", "Q212", ["Kyiv", "Ukraine", 50.4501, 30.5234, "Europe"]],
  ["TR", "Turkey", "Q43", ["Ankara", "Turkey", 39.9334, 32.8597, "Middle East"]],
  ["SA", "Saudi Arabia", "Q851", ["Riyadh", "Saudi Arabia", 24.7136, 46.6753, "Middle East"]],
  ["AE", "United Arab Emirates", "Q878", ["Abu Dhabi", "United Arab Emirates", 24.4539, 54.3773, "Middle East"]],
  ["QA", "Qatar", "Q846", ["Doha", "Qatar", 25.2854, 51.531, "Middle East"]],
  ["IL", "Israel", "Q801", ["Jerusalem", "Israel", 31.7683, 35.2137, "Middle East"]],
  ["ZA", "South Africa", "Q258", ["Pretoria", "South Africa", -25.7479, 28.2293, "Africa"]],
  ["AR", "Argentina", "Q414", ["Buenos Aires", "Argentina", -34.6037, -58.3816, "South America"]]
].map(([code, name, qid, base]) => ({ code, name, qid, base }));

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

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN.length;
  const jsonEnd = html.indexOf(CLOSE, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  return { html, jsonStart, jsonEnd, data: JSON.parse(html.slice(jsonStart, jsonEnd).trim()) };
}

function writeEmbedded(payload, data) {
  const nextHtml = payload.html.slice(0, payload.jsonStart) + "\n" + JSON.stringify(data, null, 2) + "\n" + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, nextHtml);
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/demo.json", JSON.stringify(data, null, 2) + "\n");
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

function validateShape(data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length < 90 || data.people.length > 115) throw new Error(`unsafe people count ${data.people.length}; run final rescue first`);
  if (data.roster.length !== 200) throw new Error(`unsafe roster count ${data.roster.length}`);
  if (data.expansionRoster.length < 100 || data.expansionRoster.length > 130) throw new Error(`unsafe expansionRoster count ${data.expansionRoster.length}`);
  if (data.appearances.length < 500) throw new Error(`unsafe appearances count ${data.appearances.length}`);
}

async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      signal: controller.signal,
      headers: { "user-agent": "ParleyMap safe roster review" }
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

function description(entity) {
  return entity?.descriptions?.en?.value || "";
}

function imageUrl(entity) {
  const file = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}` : "";
}

function claimHasEndDate(claim) {
  return Boolean(claim?.qualifiers?.P582?.length);
}

function currentClaimTargets(entity, property) {
  const claims = (entity?.claims?.[property] || [])
    .filter((claim) => claim?.mainsnak?.datavalue?.value?.id)
    .filter((claim) => claim.rank !== "deprecated")
    .filter((claim) => !claimHasEndDate(claim));
  const preferred = claims.filter((claim) => claim.rank === "preferred");
  const chosen = preferred.length ? preferred : claims;
  const ids = [];
  const seen = new Set();
  for (const claim of chosen) {
    const id = claim.mainsnak.datavalue.value.id;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.slice(0, 2);
}

function anchorFor(country) {
  const [city, countryName, lat, lng, region] = country.base;
  return { label: `${city} institutional base`, city, countryCode: country.code, countryName, lat, lng, precision: "city", type: "institutional_base", privacy: "city-level public institutional base only", region };
}

function applyAnchor(row, country) {
  const a = anchorFor(country);
  row.countryFocus = country.code;
  row.countryFocusCode = country.code;
  row.countryCode = country.code;
  row.countryName = country.name;
  row.country = country.name;
  row.homeRegion = a.region;
  row.locationStatus = "institutional_base_city_level";
  row.homeBases = [a];
  row.homeBase = a;
  row.mapAnchor = a;
  row.anchorLocation = a;
  row.baseLocation = a;
  row.lat = a.lat;
  row.lng = a.lng;
  row.lon = a.lng;
  row.latitude = a.lat;
  row.longitude = a.lng;
  row.homeLat = a.lat;
  row.homeLng = a.lng;
  row.mapLat = a.lat;
  row.mapLng = a.lng;
  row.coordinates = { lat: a.lat, lng: a.lng, lon: a.lng };
  row.flagAudit = { ...(row.flagAudit || {}), code: country.code, countryCode: country.code, countryName: country.name, label: country.name, status: "country flag" };
  row.flagCode = country.code;
  row.countryFlagCode = country.code;
}

function rowText(row) {
  return norm([row?.id, row?.slug, row?.name, row?.canonicalName, row?.roleTitle, row?.organization, row?.countryName, row?.countryFocus, row?.countryFocusCode].join(" "));
}

function rowCountry(row) {
  return String(row?.countryFocusCode || row?.countryFocus || row?.countryCode || "").toUpperCase();
}

function isHeadOfState(row) {
  const text = rowText(row);
  return /(president|king|queen|monarch|emir|pope|pontiff|head of state)/.test(text) && !/former|deceased|historical/.test(text);
}

function isHeadOfGovernment(row) {
  const text = rowText(row);
  return /(prime minister|chancellor|premier|head of government)/.test(text) && !/former|deceased|historical/.test(text);
}

function allRows(data) {
  return [data.people, data.roster, data.topRoster, data.expansionRoster].filter(Array.isArray).flat();
}

function findExistingPerson(data, holder) {
  const wanted = norm(holder.name);
  return data.people.find((row) => String(row.wikidataId || "") === holder.qid || norm(row.canonicalName || row.name || "") === wanted) || null;
}

function findSlot(data, country, office) {
  const check = office === "P6" ? isHeadOfGovernment : isHeadOfState;
  for (const collection of ["roster", "topRoster", "expansionRoster"]) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    const row = rows.find((item) => (rowCountry(item) === country.code || norm(item?.countryName || item?.country) === norm(country.name)) && check(item));
    if (row) return { collection, row };
  }
  return null;
}

function createPersonFromSlot(data, slotRow, holder, country, office) {
  const existing = findExistingPerson(data, holder);
  const row = existing || structuredClone(slotRow || {});
  const id = slug(holder.name);
  row.id = id;
  row.slug = id;
  row.name = holder.name;
  row.canonicalName = holder.name;
  row.wikidataId = holder.qid;
  row.wikiTitle = holder.name;
  row.profileUrl = `https://www.wikidata.org/wiki/${holder.qid}`;
  row.officialUrl = row.officialUrl || `https://www.wikidata.org/wiki/${holder.qid}`;
  row.roleTitle = office === "P6" ? `Head of government of ${country.name}` : `Head of state of ${country.name}`;
  row.organization = country.name;
  row.category = row.category || "political_leader";
  row.trackingStatus = "current_office_holder_guarded_update";
  row.sourcePriority = "monthly guarded roster update";
  row.shortBio = holder.description || row.shortBio || `${holder.name}, current office holder for ${country.name}.`;
  row.profileLine = row.profileLine || row.roleTitle;
  if (holder.imageUrl && (!row.imageUrl || /placeholder|blank|missing|transparent|data:image/i.test(String(row.imageUrl)))) {
    row.imageUrl = holder.imageUrl;
    row.imageProvider = "Wikimedia Commons via Wikidata";
  }
  row.lastRosterAutoUpdate = new Date().toISOString();
  applyAnchor(row, country);
  if (!existing) data.people.push(row);
  return row;
}

function sameHolder(row, holder) {
  const rowName = norm(row?.canonicalName || row?.name || "");
  const holderName = norm(holder.name);
  return String(row?.wikidataId || "") === holder.qid || rowName === holderName || rowName.includes(holderName) || holderName.includes(rowName);
}

function replaceSlots(data, oldRow, newPerson, country, office, operations) {
  const oldId = oldRow?.id || null;
  const oldName = oldRow?.canonicalName || oldRow?.name || null;
  const check = office === "P6" ? isHeadOfGovernment : isHeadOfState;
  for (const collection of ["roster", "topRoster", "expansionRoster"]) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const countryHit = rowCountry(row) === country.code || norm(row?.countryName || row?.country) === norm(country.name);
      const slotHit = (oldId && row?.id === oldId) || (oldName && norm(row?.canonicalName || row?.name) === norm(oldName)) || (countryHit && check(row));
      if (!slotHit) continue;
      const rank = row.rank;
      const prominenceScore = row.prominenceScore;
      rows[i] = { ...row, ...structuredClone(newPerson), rank, prominenceScore: prominenceScore ?? newPerson.prominenceScore };
      applyAnchor(rows[i], country);
      operations.push({ type: "replace_roster_slot", collection, index: i, countryCode: country.code, office, oldName, newName: rows[i].canonicalName || rows[i].name });
    }
  }
  for (const row of data.people) {
    if ((oldId && row.id === oldId) || (oldName && norm(row.canonicalName || row.name) === norm(oldName))) {
      row.roleTitle = /^former/i.test(row.roleTitle || "") ? row.roleTitle : `Former ${row.roleTitle || "office holder"}`;
      row.trackingStatus = "former_office_holder_guarded_update";
      row.currentOfficeStatus = "replaced_by_current_office_holder";
      operations.push({ type: "mark_former", collection: "people", countryCode: country.code, oldName });
    }
  }
}

async function main() {
  fs.mkdirSync("data/diagnostics", { recursive: true });
  const payload = readEmbedded();
  const data = payload.data;
  validateShape(data);
  const before = counts(data);
  const proposals = [];
  const operations = [];
  const errors = [];
  for (const country of COUNTRIES) {
    let entity;
    try {
      entity = await fetchEntity(country.qid);
    } catch (error) {
      errors.push({ countryCode: country.code, stage: "country_fetch", error: String(error.message || error) });
      continue;
    }
    for (const office of ["P35", "P6"]) {
      const holderIds = currentClaimTargets(entity, office);
      if (holderIds.length > 1) {
        proposals.push({ countryCode: country.code, office, action: "manual_review_multiple_current_claims", holderIds });
        continue;
      }
      for (const holderId of holderIds) {
        let holderEntity;
        try {
          holderEntity = await fetchEntity(holderId);
        } catch (error) {
          errors.push({ countryCode: country.code, holderId, stage: "holder_fetch", error: String(error.message || error) });
          continue;
        }
        const holder = { qid: holderId, name: label(holderEntity), description: description(holderEntity), imageUrl: imageUrl(holderEntity) };
        if (!holder.name) continue;
        const slot = findSlot(data, country, office);
        proposals.push({ countryCode: country.code, countryName: country.name, office, holderName: holder.name, holderQid: holder.qid, slotFound: Boolean(slot), slotName: slot?.row?.canonicalName || slot?.row?.name || null, sameHolder: slot ? sameHolder(slot.row, holder) : false });
        if (!slot) continue;
        if (sameHolder(slot.row, holder)) {
          applyAnchor(slot.row, country);
          slot.row.wikidataId = holder.qid;
          slot.row.canonicalName = holder.name;
          slot.row.name = holder.name;
          operations.push({ type: "confirm_current_holder", collection: slot.collection, countryCode: country.code, office, name: holder.name });
          continue;
        }
        const newPerson = createPersonFromSlot(data, slot.row, holder, country, office);
        replaceSlots(data, slot.row, newPerson, country, office, operations);
      }
    }
  }
  const replacementCount = operations.filter((op) => op.type === "replace_roster_slot").length;
  const peopleAdded = data.people.length - before.people;
  let applied = APPLY;
  let safetyStatus = "safe_review_only";
  if (replacementCount > MAX_REPLACEMENTS || peopleAdded > MAX_PEOPLE_ADDITIONS || data.people.length > 115) {
    applied = false;
    safetyStatus = "not_applied_safety_limit";
  }
  if (!applied) {
    // Re-read clean payload to avoid accidental writes when review-only or unsafe.
    const clean = readEmbedded();
    writeEmbedded(clean, clean.data);
  } else {
    data.meta = { ...(data.meta || {}), lastRosterSafeUpdate: new Date().toISOString(), rosterSafeUpdateStatus: `applied ${operations.length} guarded operations` };
    validateShape(data);
    const after = counts(data);
    if (after.roster !== before.roster) throw new Error(`roster count changed from ${before.roster} to ${after.roster}`);
    if (after.expansionRoster !== before.expansionRoster) throw new Error(`expansionRoster count changed from ${before.expansionRoster} to ${after.expansionRoster}`);
    if (after.appearances !== before.appearances) throw new Error(`appearances count changed from ${before.appearances} to ${after.appearances}`);
    if (after.categories !== before.categories) throw new Error(`categories count changed from ${before.categories} to ${after.categories}`);
    writeEmbedded(payload, data);
    safetyStatus = "applied_guarded_small_change";
  }
  const finalPayload = readEmbedded();
  const report = { generatedAt: new Date().toISOString(), status: safetyStatus, applyRequested: APPLY, applied, before, after: counts(finalPayload.data), replacementCount, peopleAdded, operationCount: operations.length, proposals, operations: applied ? operations : [], errors };
  const patch = { generatedAt: report.generatedAt, status: report.status, note: "Current-holder claims are filtered to claims without an end date. Historical chains are not applied. Large changes are rejected.", proposals, operations: report.operations, errors };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + "\n");
  const lines = ["# ParleyMap roster safe review", "", `Generated: ${report.generatedAt}`, `Status: ${report.status}`, `Applied: ${report.applied}`, `Replacement count: ${replacementCount}`, `People added: ${peopleAdded}`, `Errors: ${errors.length}`, "", "## Counts", "", "| Dataset | Before | After |", "|---|---:|---:|", `| people | ${before.people} | ${report.after.people} |`, `| roster | ${before.roster} | ${report.after.roster} |`, `| expansionRoster | ${before.expansionRoster} | ${report.after.expansionRoster} |`, `| appearances | ${before.appearances} | ${report.after.appearances} |`];
  fs.writeFileSync(SUMMARY_PATH, lines.join("\n") + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
