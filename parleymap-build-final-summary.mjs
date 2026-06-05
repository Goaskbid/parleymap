import fs from "node:fs";

const INDEX_PATH = "index.html";
const REPORT_PATH = "data/diagnostics/roster-current-holder-review.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = "</" + "script>";
const APPLY_SAFE = process.argv.includes("--apply-safe");

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

function slug(value) {
  return norm(value).replace(/ /g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error("demo-data opening tag not found");
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error("demo-data closing tag not found");
  const data = JSON.parse(html.slice(jsonStart, jsonEnd).trim());
  return { html, jsonStart, jsonEnd, data };
}

function writeEmbedded(payload, data) {
  const next = payload.html.slice(0, payload.jsonStart) + "\n" + JSON.stringify(data, null, 2) + "\n" + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, next);
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

function validate(data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length > 115) throw new Error("people count too high before roster review. Roll back unsafe auto update first.");
  if (data.people.length < 80) throw new Error("people count too low");
  if (data.roster.length < 180) throw new Error("roster count too low");
  if (data.expansionRoster.length < 90) throw new Error("expansionRoster count too low");
  if (data.appearances.length < 480) throw new Error("appearances count too low");
}

async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      signal: controller.signal,
      headers: { "user-agent": "ParleyMap current holder review" }
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

function hasEndTime(claim) {
  return Boolean(claim?.qualifiers?.P582?.length);
}

function currentClaimIds(entity, property) {
  const all = entity?.claims?.[property] || [];
  const valid = all.filter((claim) => claim?.mainsnak?.datavalue?.value?.id && !hasEndTime(claim));
  const preferred = valid.filter((claim) => claim.rank === "preferred");
  const source = preferred.length ? preferred : valid;
  return [...new Set(source.map((claim) => claim.mainsnak.datavalue.value.id))];
}

function rowText(row) {
  return norm([row.id, row.slug, row.name, row.canonicalName, row.roleTitle, row.organization, row.country, row.countryName, row.countryFocus, row.countryFocusCode].join(" "));
}

function rowCountry(row) {
  const code = String(row.countryFocusCode || row.countryFocus || row.countryCode || "").toUpperCase();
  return code === "UK" ? "GB" : code;
}

function roleMatches(row, property) {
  const text = rowText(row);
  if (/former|deceased|historical/.test(text)) return false;
  if (property === "P35") return /(president|king|queen|monarch|emir|head of state|pope|pontiff)/.test(text);
  return /(prime minister|chancellor|head of government|premier)/.test(text);
}

function samePerson(row, holder) {
  const qid = String(row.wikidataId || "");
  const name = norm(row.canonicalName || row.name || "");
  const holderName = norm(holder.name);
  return qid === holder.qid || name === holderName || (name && holderName && (name.includes(holderName) || holderName.includes(name)));
}

function findSlot(data, country, property) {
  for (const collection of ["roster", "topRoster", "people", "expansionRoster"]) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    const row = rows.find((candidate) => {
      const countryOk = rowCountry(candidate) === country.code || norm(candidate.countryName || candidate.country) === norm(country.name);
      return countryOk && roleMatches(candidate, property);
    });
    if (row) return { collection, row };
  }
  return null;
}

function anchorFor(country) {
  const [city, countryName, lat, lng, region] = country.base;
  return { label: `${city} institutional base`, city, countryCode: country.code, countryName, lat, lng, precision: "city", type: "institutional_base", privacy: "city-level public institutional base only", region };
}

function applyCountry(row, country) {
  const anchor = anchorFor(country);
  row.countryFocus = country.code;
  row.countryFocusCode = country.code;
  row.countryCode = country.code;
  row.countryName = country.name;
  row.country = country.name;
  row.homeRegion = anchor.region;
  row.locationStatus = "institutional_base_city_level";
  row.homeBases = [anchor];
  row.homeBase = anchor;
  row.mapAnchor = anchor;
  row.anchorLocation = anchor;
  row.lat = anchor.lat;
  row.lng = anchor.lng;
  row.lon = anchor.lng;
  row.latitude = anchor.lat;
  row.longitude = anchor.lng;
  row.flagAudit = { ...(row.flagAudit || {}), code: country.code, countryCode: country.code, countryName: country.name, label: country.name, status: "country flag" };
}

function makePersonFromSlot(slotRow, holder, country, property) {
  const base = structuredClone(slotRow || {});
  const id = slug(holder.name);
  base.id = id;
  base.slug = id;
  base.name = holder.name;
  base.canonicalName = holder.name;
  base.wikidataId = holder.qid;
  base.wikiTitle = holder.name;
  base.profileUrl = `https://www.wikidata.org/wiki/${holder.qid}`;
  base.officialUrl = base.officialUrl || `https://www.wikidata.org/wiki/${holder.qid}`;
  if (holder.imageUrl) {
    base.imageUrl = holder.imageUrl;
    base.imageProvider = "Wikidata/Wikimedia Commons";
  }
  base.roleTitle = property === "P6" ? `Head of government of ${country.name}` : `Head of state of ${country.name}`;
  base.organization = country.name;
  base.shortBio = holder.description || base.shortBio || `${holder.name}, current office holder for ${country.name}.`;
  base.trackingStatus = "current_office_holder_reviewed";
  base.sourcePriority = "monthly current holder review";
  base.lastRosterCurrentHolderReview = new Date().toISOString();
  applyCountry(base, country);
  return base;
}

function replaceRows(data, oldId, oldName, newRow, country, property, operations) {
  for (const collection of ["roster", "topRoster", "expansionRoster", "priorityExpansion", "watchlistExamples"]) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== "object") continue;
      const idHit = oldId && row.id === oldId;
      const nameHit = oldName && norm(row.canonicalName || row.name) === norm(oldName);
      const countryRoleHit = rowCountry(row) === country.code && roleMatches(row, property);
      if (!idHit && !nameHit && !countryRoleHit) continue;
      const rank = row.rank;
      const prominenceScore = row.prominenceScore;
      rows[i] = { ...row, ...structuredClone(newRow), rank, prominenceScore: prominenceScore ?? newRow.prominenceScore };
      applyCountry(rows[i], country);
      operations.push({ type: "replace_roster_slot", collection, index: i, countryCode: country.code, property, oldId: row.id || null, oldName: row.canonicalName || row.name || null, newId: rows[i].id, newName: rows[i].canonicalName || rows[i].name });
    }
  }
}

function markFormer(data, oldId, oldName, reason, operations) {
  for (const collection of ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion"]) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const idHit = oldId && row.id === oldId;
      const nameHit = oldName && norm(row.canonicalName || row.name) === norm(oldName);
      if (!idHit && !nameHit) continue;
      if (!/^former/i.test(row.roleTitle || "")) row.roleTitle = `Former ${row.roleTitle || "office holder"}`;
      row.currentOfficeStatus = reason;
      row.trackingStatus = reason;
      row.lastRosterCurrentHolderReview = new Date().toISOString();
      operations.push({ type: "mark_former", collection, id: row.id || null, name: row.canonicalName || row.name || null, reason });
    }
  }
}

async function main() {
  fs.mkdirSync("data/diagnostics", { recursive: true });
  const payload = readEmbedded();
  const data = payload.data;
  validate(data);
  const before = counts(data);
  const operations = [];
  const candidates = [];
  const errors = [];

  for (const country of TARGET_COUNTRIES) {
    let entity;
    try {
      entity = await fetchEntity(country.qid);
    } catch (error) {
      errors.push({ countryCode: country.code, stage: "fetch_country", error: String(error.message || error) });
      continue;
    }

    for (const property of ["P35", "P6"]) {
      const ids = currentClaimIds(entity, property);
      if (ids.length !== 1) {
        candidates.push({ countryCode: country.code, countryName: country.name, property, status: "not_auto_applied", reason: `expected exactly one current claim, got ${ids.length}`, holderIds: ids });
        continue;
      }

      const holderQid = ids[0];
      let holderEntity;
      try {
        holderEntity = await fetchEntity(holderQid);
      } catch (error) {
        errors.push({ countryCode: country.code, property, holderQid, stage: "fetch_holder", error: String(error.message || error) });
        continue;
      }

      const holder = { qid: holderQid, name: label(holderEntity), description: description(holderEntity), imageUrl: imageUrl(holderEntity) };
      if (!holder.name) continue;
      const slot = findSlot(data, country, property);
      if (!slot) {
        candidates.push({ countryCode: country.code, countryName: country.name, property, holderName: holder.name, holderQid, status: "needs_manual_slot_creation" });
        continue;
      }

      const slotName = slot.row.canonicalName || slot.row.name || "";
      const same = samePerson(slot.row, holder);
      candidates.push({ countryCode: country.code, countryName: country.name, property, holderName: holder.name, holderQid, slotCollection: slot.collection, slotName, slotId: slot.row.id || null, same, status: same ? "current_holder_confirmed" : "replacement_candidate" });

      if (same) {
        applyCountry(slot.row, country);
        slot.row.wikidataId = holder.qid;
        slot.row.canonicalName = holder.name;
        slot.row.name = holder.name;
        if (!slot.row.imageUrl && holder.imageUrl) slot.row.imageUrl = holder.imageUrl;
        operations.push({ type: "confirm_current_holder", collection: slot.collection, countryCode: country.code, property, name: holder.name });
        continue;
      }

      if (!APPLY_SAFE) continue;

      const oldId = slot.row.id || null;
      const oldName = slot.row.canonicalName || slot.row.name || null;
      const newRow = makePersonFromSlot(slot.row, holder, country, property);
      const exists = data.people.find((row) => samePerson(row, holder));
      if (exists) Object.assign(exists, newRow);
      else data.people.push(newRow);
      replaceRows(data, oldId, oldName, newRow, country, property, operations);
      markFormer(data, oldId, oldName, "replaced_by_current_office_holder", operations);
    }
  }

  const replacements = operations.filter((op) => op.type === "replace_roster_slot");
  const after = counts(data);

  const safeToWrite = !APPLY_SAFE || (
    replacements.length <= 8 &&
    after.people <= before.people + 8 &&
    after.roster === before.roster &&
    after.expansionRoster === before.expansionRoster &&
    after.appearances === before.appearances &&
    after.categories === before.categories
  );

  if (!safeToWrite) {
    throw new Error(`Roster update safety gate blocked write. replacements=${replacements.length}, people ${before.people}->${after.people}`);
  }

  data.meta = { ...(data.meta || {}), lastRosterCurrentHolderReview: new Date().toISOString(), rosterCurrentHolderReviewStatus: APPLY_SAFE ? `safe apply mode, ${operations.length} operations` : `review mode, ${candidates.length} candidates` };

  if (APPLY_SAFE) {
    validate(data);
    writeEmbedded(payload, data);
  }

  const finalCounts = APPLY_SAFE ? counts(data) : before;
  const report = { generatedAt: new Date().toISOString(), status: APPLY_SAFE ? "roster_current_holder_safe_apply_complete" : "roster_current_holder_review_only", applySafe: APPLY_SAFE, before, after: finalCounts, targetCountryCount: TARGET_COUNTRIES.length, candidateCount: candidates.length, replacementCount: replacements.length, operationCount: operations.length, candidates, operations, errors };
  const patch = { generatedAt: report.generatedAt, status: APPLY_SAFE ? "safe_changes_applied_or_confirmed" : "manual_review_candidates", replacements, candidates, errors };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(PATCH_PATH, JSON.stringify(patch, null, 2) + "\n");
  const summary = [
    "# ParleyMap current-holder roster review",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Safe apply: ${report.applySafe}`,
    `Candidates: ${report.candidateCount}`,
    `Replacements: ${report.replacementCount}`,
    `Operations: ${report.operationCount}`,
    `Errors: ${errors.length}`,
    "",
    "## Counts",
    "",
    "| Dataset | Before | After |",
    "|---|---:|---:|",
    `| people | ${before.people} | ${finalCounts.people} |`,
    `| roster | ${before.roster} | ${finalCounts.roster} |`,
    `| expansionRoster | ${before.expansionRoster} | ${finalCounts.expansionRoster} |`,
    `| appearances | ${before.appearances} | ${finalCounts.appearances} |`
  ];
  fs.writeFileSync(SUMMARY_PATH, summary.join("\n") + "\n");
  console.log(JSON.stringify({ status: report.status, replacements: report.replacementCount, operations: report.operationCount, errors: errors.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
