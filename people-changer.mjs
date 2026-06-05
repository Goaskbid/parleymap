import fs from "node:fs";

const INDEX_PATH = "index.html";
const DEMO_PATH = "data/demo.json";
const REPORT_PATH = "data/diagnostics/people-changer-report.json";
const PATCH_PATH = "data/diagnostics/roster-patch-candidates.json";
const SUMMARY_PATH = "data/diagnostics/LATEST_RUN_SUMMARY.md";
const OPEN_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/;

const APPLY = process.argv.includes("--apply") || process.env.PARLEYMAP_APPLY_PEOPLE_CHANGES === "1";

const BASES = {
  US: ["Washington", "United States", 38.9072, -77.0369, "North America"],
  MX: ["Mexico City", "Mexico", 19.4326, -99.1332, "North America"],
  ID: ["Jakarta", "Indonesia", -6.2088, 106.8456, "Asia"],
  VA: ["Vatican City", "Vatican City", 41.9029, 12.4534, "Europe"],
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
  FI: ["Helsinki", "Finland", 60.1699, 24.9384, "Europe"]
};

const COUNTRIES = [
  ["US", "United States", "Q30"],
  ["MX", "Mexico", "Q96"],
  ["ID", "Indonesia", "Q252"],
  ["VA", "Vatican City", "Q237"],
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
  ["DK", "Denmark", "Q35"],
  ["FI", "Finland", "Q33"]
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
  return norm(value).replace(/ /g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const match = html.match(OPEN_RE);
  if (!match) throw new Error("demo-data JSON block not found in index.html");
  return { html, data: JSON.parse(match[1]) };
}

function writeEmbedded(html, data) {
  const next = html.replace(OPEN_RE, `<script id="demo-data" type="application/json">\n${JSON.stringify(data, null, 2)}\n</script>`);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const entityCache = new Map();
async function fetchEntity(qid) {
  if (entityCache.has(qid)) return entityCache.get(qid);
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "ParleyMap people changer monthly roster review" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${qid}`);
    const json = await response.json();
    const entity = json.entities?.[qid] || null;
    entityCache.set(qid, entity);
    await sleep(120);
    return entity;
  } finally {
    clearTimeout(timer);
  }
}

function entityLabel(entity, qid) {
  return entity?.labels?.en?.value || entity?.labels?.mul?.value || qid;
}

function entityDescription(entity) {
  return entity?.descriptions?.en?.value || "";
}

function entityImage(entity) {
  const file = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!file) return "";
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
}

function entityArticle(entity) {
  return entity?.sitelinks?.enwiki?.url || `https://www.wikidata.org/wiki/${entity?.id || ""}`;
}

function claimTargetIds(entity, property) {
  const claims = entity?.claims?.[property] || [];
  const live = claims.filter((claim) => {
    if (claim.rank === "deprecated") return false;
    if (claim.qualifiers?.P582) return false;
    return claim?.mainsnak?.datavalue?.value?.id;
  });
  const preferred = live.filter((claim) => claim.rank === "preferred");
  const chosen = preferred.length ? preferred : live;
  return [...new Set(chosen.map((claim) => claim.mainsnak.datavalue.value.id).filter(Boolean))];
}

function deathDate(entity) {
  const claim = entity?.claims?.P570?.find((row) => row?.mainsnak?.datavalue?.value?.time);
  return claim?.mainsnak?.datavalue?.value?.time || null;
}

function baseForCountry(code) {
  const row = BASES[code] || BASES.US;
  const [city, countryName, lat, lng, region] = row;
  return {
    label: `${city} institutional base`,
    city,
    countryCode: code,
    countryName,
    lat,
    lng,
    lon: lng,
    precision: "city",
    type: "institutional_base",
    privacy: "city-level public institutional base only",
    region
  };
}

function roleTitle(countryCode, countryName, roleKind) {
  if (countryCode === "VA") return "Pope, Bishop of Rome";
  if (roleKind === "head_of_government") {
    if (countryCode === "DE") return `Chancellor of ${countryName}`;
    return `Prime Minister of ${countryName}`;
  }
  if (["GB", "CA", "AU", "NZ", "DK", "SE", "NO"].includes(countryCode)) return `Head of State of ${countryName}`;
  return `President of ${countryName}`;
}

function makeProfile(holder, countryCode, countryName, roleKind, oldRank = null) {
  const base = baseForCountry(countryCode);
  const id = `p-${slug(holder.label)}`;
  const wikiTitle = holder.article ? decodeURIComponent(holder.article.split("/wiki/")[1] || holder.label).replace(/_/g, " ") : holder.label;
  const role = roleTitle(countryCode, countryName, roleKind);
  const row = {
    rank: oldRank ?? null,
    id,
    name: holder.label,
    canonicalName: holder.label,
    slug: slug(holder.label),
    wikiTitle,
    wikidataId: holder.qid,
    profileUrl: holder.article || `https://www.wikidata.org/wiki/${holder.qid}`,
    officialUrl: holder.article || `https://www.wikidata.org/wiki/${holder.qid}`,
    region: base.region,
    country: countryName,
    countryName,
    countryFocus: countryCode,
    countryFocusCode: countryCode,
    bucket: "monthly-current-office-holder",
    sector: "Government",
    organization: `${countryName} government`,
    prominenceScore: 92,
    imageUrl: holder.image || "",
    imageProvider: holder.image ? "Wikimedia Commons via Wikidata" : "needs portrait review",
    visualAuditStatus: holder.image ? "public identity source" : "needs portrait review",
    trackingStatus: "current_office_holder_auto_changed",
    sourcePriority: "current_office_holder",
    roleTitle: role,
    homeRegion: base.region,
    industry: "Government",
    shortBio: holder.description || `Current ${role}. Added or updated by ParleyMap monthly people changer.`,
    category: "government",
    orgIcon: "flag",
    visualStatus: holder.image ? "public_source_available" : "needs_review",
    locationStatus: "institutional_base_city_level",
    profileLine: `${role}. Current office holder detected by monthly people changer.`,
    socialLinks: {},
    profileLines: [
      `${role}.`,
      "Auto-created from current office holder review. Verify portrait and official biography before editorial promotion."
    ],
    imageAudit: { status: holder.image ? "needs attribution review" : "needs portrait review" },
    flagAudit: { code: countryCode, countryCode, countryName, label: countryName, status: "country flag" },
    homeBases: [base],
    homeBase: base,
    mapAnchor: base,
    anchorLocation: base,
    baseLocation: base,
    institutionalBase: base,
    lat: base.lat,
    lng: base.lng,
    lon: base.lng,
    latitude: base.lat,
    longitude: base.lng,
    homeLat: base.lat,
    homeLng: base.lng,
    mapLat: base.lat,
    mapLng: base.lng,
    anchorLat: base.lat,
    anchorLng: base.lng,
    coordinates: { lat: base.lat, lng: base.lng, lon: base.lng },
    geo: { lat: base.lat, lng: base.lng, lon: base.lng, city: base.city, countryCode, countryName },
    peopleChanger: {
      addedAt: new Date().toISOString(),
      roleKind,
      source: `Wikidata ${holder.countryQid} ${roleKind === "head_of_state" ? "P35" : "P6"}`
    }
  };
  return row;
}

function rowText(row) {
  return norm([row.id, row.slug, row.wikidataId, row.name, row.canonicalName, row.roleTitle, row.organization, row.countryName, row.countryFocus, row.countryFocusCode].join(" "));
}

function rowCountryCode(row) {
  return String(row.countryFocusCode || row.countryFocus || row.countryCode || "").toUpperCase();
}

function rowQid(row) {
  const qid = String(row.wikidataId || "").trim();
  return /^Q[0-9]+$/.test(qid) ? qid : "";
}

function samePerson(row, holder) {
  if (!row) return false;
  if (rowQid(row) && rowQid(row) === holder.qid) return true;
  const text = rowText(row);
  const name = norm(holder.label);
  return Boolean(name && (text.includes(name) || name.includes(norm(row.canonicalName || row.name))));
}

function roleMatches(row, roleKind, countryCode) {
  if (rowCountryCode(row) !== countryCode) return false;
  const text = rowText(row);
  if (roleKind === "head_of_government") return /prime minister|chancellor|premier|head of government/.test(text);
  if (countryCode === "VA") return /pope|pontiff|bishop of rome/.test(text);
  return /president|king|queen|monarch|emir|head of state|pope/.test(text);
}

function cloneRow(row) {
  return JSON.parse(JSON.stringify(row));
}

function markFormer(row, reason) {
  row.trackingStatus = reason;
  row.currentOfficeStatus = "former_or_inactive";
  row.roleAuditStatus = reason;
  row.lastRoleReview = new Date().toISOString();
  if (row.roleTitle && !/^Former\b/i.test(row.roleTitle)) row.roleTitle = `Former ${row.roleTitle}`;
  row.profileLine = row.profileLine ? `Former role review: ${row.profileLine}` : "Former role. Kept for historical appearance records.";
  row.mapVisibility = "historical_or_search_only";
  row.openingMap = false;
  row.visibleOnOpeningMap = false;
}

function mergeIntoExisting(existing, update) {
  const keep = cloneRow(existing);
  const merged = { ...keep, ...update };
  if (existing.rank != null && update.rank == null) merged.rank = existing.rank;
  return merged;
}

function findIndexByPerson(rows, holder) {
  return rows.findIndex((row) => samePerson(row, holder));
}

function ensureInPeople(data, profile, report, oldWasInPeople) {
  if (!Array.isArray(data.people)) data.people = [];
  const index = findIndexByPerson(data.people, { qid: profile.wikidataId, label: profile.canonicalName });
  if (index >= 0) {
    data.people[index] = mergeIntoExisting(data.people[index], profile);
    report.updatedPeople.push({ id: profile.id, name: profile.canonicalName, action: "updated_existing_people" });
    return data.people[index];
  }
  if (oldWasInPeople || profile.prominenceScore >= 90) {
    data.people.push(profile);
    report.addedPeople.push({ id: profile.id, name: profile.canonicalName, action: "added_current_holder_to_people" });
  }
  return profile;
}

function ensureInExpansion(data, row, report, reason) {
  if (!Array.isArray(data.expansionRoster)) data.expansionRoster = [];
  const qid = rowQid(row);
  const exists = data.expansionRoster.some((item) => (qid && rowQid(item) === qid) || item.id === row.id);
  if (!exists) {
    const former = cloneRow(row);
    former.rank = data.expansionRoster.length + 1000;
    markFormer(former, reason);
    data.expansionRoster.push(former);
    report.movedToExpansion.push({ id: former.id || null, name: former.canonicalName || former.name || null, reason });
  }
}

function promoteCurrentHolder(data, holder, countryCode, countryName, countryQid, roleKind, report) {
  const collections = ["people", "roster", "topRoster", "expansionRoster", "priorityExpansion"];
  const oldRows = [];
  for (const collection of collections) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    rows.forEach((row, index) => {
      if (roleMatches(row, roleKind, countryCode) && !samePerson(row, holder)) oldRows.push({ collection, index, row });
    });
  }

  const oldRosterRow = oldRows.find((item) => item.collection === "roster")?.row || null;
  const oldTopRow = oldRows.find((item) => item.collection === "topRoster")?.row || null;
  const oldWasInPeople = oldRows.some((item) => item.collection === "people");
  const oldRank = oldRosterRow?.rank ?? oldTopRow?.rank ?? null;
  const profile = makeProfile({ ...holder, countryQid }, countryCode, countryName, roleKind, oldRank);

  for (const item of oldRows) {
    markFormer(item.row, "former_role_replaced_by_monthly_people_changer");
    if (["roster", "topRoster"].includes(item.collection)) ensureInExpansion(data, item.row, report, "former_role_replaced_by_monthly_people_changer");
    report.markedFormer.push({ collection: item.collection, id: item.row.id || null, name: item.row.canonicalName || item.row.name || null, replacedBy: profile.canonicalName, roleKind, countryCode });
  }

  ensureInPeople(data, profile, report, oldWasInPeople);

  for (const collection of ["roster", "topRoster"]) {
    if (!Array.isArray(data[collection])) data[collection] = [];
    const rows = data[collection];
    const currentIndex = findIndexByPerson(rows, holder);
    const staleIndex = rows.findIndex((row) => roleMatches(row, roleKind, countryCode) && !samePerson(row, holder));

    if (currentIndex >= 0) {
      rows[currentIndex] = mergeIntoExisting(rows[currentIndex], profile);
      report.promotedCurrent.push({ collection, id: profile.id, name: profile.canonicalName, action: "updated_existing_current_holder" });
      continue;
    }

    if (staleIndex >= 0) {
      const rank = rows[staleIndex]?.rank ?? profile.rank;
      rows[staleIndex] = { ...profile, rank };
      report.replacedRosterSlots.push({ collection, rank, countryCode, roleKind, oldName: oldRows.find((item) => item.collection === collection)?.row?.canonicalName || null, newName: profile.canonicalName });
      continue;
    }

    if (collection === "roster") {
      const nextRank = rows.reduce((max, row) => Math.max(max, Number(row.rank || 0)), 0) + 1;
      rows.push({ ...profile, rank: nextRank });
      report.promotedCurrent.push({ collection, id: profile.id, name: profile.canonicalName, action: "appended_current_holder_to_roster" });
    }
  }

  if (Array.isArray(data.expansionRoster)) {
    data.expansionRoster = data.expansionRoster.filter((row) => !samePerson(row, holder));
  }
}

async function currentHoldersForCountry(countryCode, countryName, countryQid, report) {
  const countryEntity = await fetchEntity(countryQid);
  const roles = [];
  const p35 = claimTargetIds(countryEntity, "P35");
  const p6 = claimTargetIds(countryEntity, "P6");
  for (const qid of p35) roles.push({ roleKind: "head_of_state", qid });
  for (const qid of p6) roles.push({ roleKind: "head_of_government", qid });

  const out = [];
  for (const role of roles) {
    try {
      const entity = await fetchEntity(role.qid);
      out.push({
        ...role,
        countryCode,
        countryName,
        countryQid,
        label: entityLabel(entity, role.qid),
        description: entityDescription(entity),
        image: entityImage(entity),
        article: entityArticle(entity)
      });
    } catch (error) {
      report.errors.push({ countryCode, countryName, qid: role.qid, error: String(error.message || error) });
    }
  }
  return out;
}

async function auditDeaths(data, report) {
  const rows = [
    ...(Array.isArray(data.people) ? data.people : []),
    ...(Array.isArray(data.roster) ? data.roster : []),
    ...(Array.isArray(data.topRoster) ? data.topRoster : [])
  ];
  const seen = new Set();
  for (const row of rows) {
    const qid = rowQid(row);
    if (!qid || seen.has(qid)) continue;
    seen.add(qid);
    try {
      const entity = await fetchEntity(qid);
      const died = deathDate(entity);
      if (!died) continue;
      for (const collection of ["people", "roster", "topRoster", "expansionRoster"]) {
        const coll = Array.isArray(data[collection]) ? data[collection] : [];
        for (const item of coll) {
          if (rowQid(item) !== qid) continue;
          markFormer(item, "deceased_removed_from_active_review");
          item.lifeStatus = "deceased";
          item.deathDate = died;
          report.deceasedMarked.push({ collection, id: item.id || null, name: item.canonicalName || item.name || null, wikidataId: qid, deathDate: died });
        }
      }
    } catch (error) {
      report.errors.push({ qid, phase: "death_audit", error: String(error.message || error) });
    }
  }
}

function validate(data) {
  for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length < 90) throw new Error("people count too low after people changer");
  if (data.roster.length < 190) throw new Error("roster count too low after people changer");
  if (data.expansionRoster.length < 100) throw new Error("expansionRoster count too low after people changer");
  if (data.appearances.length < 500) throw new Error("appearances count too low after people changer");
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const { html, data } = readEmbedded();
validate(data);
const before = counts(data);
const report = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? "apply" : "diagnostic",
  status: "people_changer_complete",
  before,
  after: null,
  checkedCountries: [],
  currentHolders: [],
  addedPeople: [],
  updatedPeople: [],
  markedFormer: [],
  movedToExpansion: [],
  replacedRosterSlots: [],
  promotedCurrent: [],
  deceasedMarked: [],
  errors: [],
  note: "Old people are not deleted from people when they may have historical appearances. They are removed or replaced in active roster/topRoster slots and marked former/deceased."
};

for (const [countryCode, countryName, countryQid] of COUNTRIES) {
  try {
    const holders = await currentHoldersForCountry(countryCode, countryName, countryQid, report);
    report.checkedCountries.push({ countryCode, countryName, countryQid, status: "checked", holders: holders.map((h) => ({ roleKind: h.roleKind, qid: h.qid, label: h.label })) });
    for (const holder of holders) {
      report.currentHolders.push({ countryCode, countryName, roleKind: holder.roleKind, qid: holder.qid, label: holder.label });
      if (APPLY) promoteCurrentHolder(data, holder, countryCode, countryName, countryQid, holder.roleKind, report);
    }
  } catch (error) {
    report.checkedCountries.push({ countryCode, countryName, countryQid, status: "failed", error: String(error.message || error) });
    report.errors.push({ countryCode, countryName, phase: "current_holder", error: String(error.message || error) });
  }
}

if (APPLY) {
  await auditDeaths(data, report);
  data.meta = {
    ...(data.meta || {}),
    lastDataUpdate: new Date().toISOString(),
    lastPeopleChangerRun: new Date().toISOString(),
    peopleChangerStatus: `checked ${report.checkedCountries.length} countries; added ${report.addedPeople.length}; replaced ${report.replacedRosterSlots.length}; marked former ${report.markedFormer.length}; deceased ${report.deceasedMarked.length}`
  };
  validate(data);
  writeEmbedded(html, data);
}

report.after = counts(data);
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(PATCH_PATH, JSON.stringify({
  generatedAt: report.generatedAt,
  status: APPLY ? "applied" : "diagnostic_only",
  addedPeople: report.addedPeople,
  updatedPeople: report.updatedPeople,
  replacedRosterSlots: report.replacedRosterSlots,
  markedFormer: report.markedFormer,
  deceasedMarked: report.deceasedMarked,
  errors: report.errors
}, null, 2) + "\n");
fs.writeFileSync(SUMMARY_PATH, [
  "# ParleyMap people changer",
  "",
  `Generated: ${report.generatedAt}`,
  `Mode: ${report.mode}`,
  "",
  "## Result",
  "",
  `Checked countries: ${report.checkedCountries.length}`,
  `Current holders found: ${report.currentHolders.length}`,
  `Added people: ${report.addedPeople.length}`,
  `Updated people: ${report.updatedPeople.length}`,
  `Roster slots replaced: ${report.replacedRosterSlots.length}`,
  `Marked former: ${report.markedFormer.length}`,
  `Marked deceased: ${report.deceasedMarked.length}`,
  `Errors: ${report.errors.length}`,
  "",
  "## Counts",
  "",
  `People: ${report.before.people} -> ${report.after.people}`,
  `Roster: ${report.before.roster} -> ${report.after.roster}`,
  `Top roster: ${report.before.topRoster} -> ${report.after.topRoster}`,
  `Expansion roster: ${report.before.expansionRoster} -> ${report.after.expansionRoster}`,
  `Appearances: ${report.before.appearances} -> ${report.after.appearances}`
].join("\n") + "\n");

console.log(JSON.stringify({
  status: report.status,
  mode: report.mode,
  checkedCountries: report.checkedCountries.length,
  currentHolders: report.currentHolders.length,
  addedPeople: report.addedPeople.length,
  updatedPeople: report.updatedPeople.length,
  replacedRosterSlots: report.replacedRosterSlots.length,
  markedFormer: report.markedFormer.length,
  deceasedMarked: report.deceasedMarked.length,
  errors: report.errors.length,
  before: report.before,
  after: report.after
}, null, 2));
