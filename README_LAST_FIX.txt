import fs from 'node:fs';

const INDEX_PATH = 'index.html';
const REVIEW_PATH = 'data/diagnostics/roster-current-holder-review.json';
const PATCH_PATH = 'data/diagnostics/roster-patch-candidates.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const OPEN_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i;
const APPLY = process.argv.includes('--apply');
const MAX_REPLACEMENTS = 3;
const MAX_ADDITIONS = 3;
const MAX_PEOPLE = 115;

const TARGET_COUNTRIES = [
  { code: 'US', name: 'United States', qid: 'Q30', base: ['Washington', 'United States', 38.9072, -77.0369, 'North America'] },
  { code: 'MX', name: 'Mexico', qid: 'Q96', base: ['Mexico City', 'Mexico', 19.4326, -99.1332, 'North America'] },
  { code: 'ID', name: 'Indonesia', qid: 'Q252', base: ['Jakarta', 'Indonesia', -6.2088, 106.8456, 'Asia'] },
  { code: 'FR', name: 'France', qid: 'Q142', base: ['Paris', 'France', 48.8566, 2.3522, 'Europe'] },
  { code: 'DE', name: 'Germany', qid: 'Q183', base: ['Berlin', 'Germany', 52.52, 13.405, 'Europe'] },
  { code: 'GB', name: 'United Kingdom', qid: 'Q145', base: ['London', 'United Kingdom', 51.5074, -0.1278, 'Europe'] },
  { code: 'CA', name: 'Canada', qid: 'Q16', base: ['Ottawa', 'Canada', 45.4215, -75.6972, 'North America'] },
  { code: 'BR', name: 'Brazil', qid: 'Q155', base: ['Brasilia', 'Brazil', -15.7939, -47.8828, 'South America'] },
  { code: 'IN', name: 'India', qid: 'Q668', base: ['New Delhi', 'India', 28.6139, 77.209, 'South Asia'] },
  { code: 'JP', name: 'Japan', qid: 'Q17', base: ['Tokyo', 'Japan', 35.6762, 139.6503, 'Asia'] },
  { code: 'AU', name: 'Australia', qid: 'Q408', base: ['Canberra', 'Australia', -35.2809, 149.13, 'Oceania'] },
  { code: 'IT', name: 'Italy', qid: 'Q38', base: ['Rome', 'Italy', 41.9028, 12.4964, 'Europe'] },
  { code: 'ES', name: 'Spain', qid: 'Q29', base: ['Madrid', 'Spain', 40.4168, -3.7038, 'Europe'] }
];

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(value) {
  return norm(value).replace(/ /g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown';
}

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const match = html.match(OPEN_RE);
  if (!match) throw new Error('demo-data block not found');
  const data = JSON.parse(match[1]);
  return { html, match, data };
}

function writeEmbedded(payload, data) {
  const html = payload.html.replace(OPEN_RE, `<script id="demo-data" type="application/json">\n${JSON.stringify(data, null, 2)}\n</script>`);
  fs.writeFileSync(INDEX_PATH, html);
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/demo.json', JSON.stringify(data, null, 2) + '\n');
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
  for (const key of ['people', 'roster', 'expansionRoster', 'appearances', 'categories']) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length > MAX_PEOPLE) throw new Error(`people count unsafe before roster update: ${data.people.length}`);
  if (data.roster.length < 190) throw new Error('roster count too low');
  if (data.appearances.length < 500) throw new Error('appearances count too low');
}

async function fetchEntity(qid) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      signal: controller.signal,
      headers: { 'user-agent': 'ParleyMap safe roster current-holder review' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.entities?.[qid] || null;
  } finally {
    clearTimeout(timeout);
  }
}

function label(entity) { return entity?.labels?.en?.value || entity?.labels?.mul?.value || ''; }
function description(entity) { return entity?.descriptions?.en?.value || ''; }
function imageUrl(entity) {
  const file = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}` : '';
}
function deathDate(entity) {
  return entity?.claims?.P570?.[0]?.mainsnak?.datavalue?.value?.time || null;
}
function claimHasEndDate(claim) {
  return Boolean(claim?.qualifiers?.P582?.length);
}
function currentClaimIds(entity, property) {
  const claims = entity?.claims?.[property] || [];
  return claims
    .filter((claim) => claim.rank !== 'deprecated')
    .filter((claim) => !claimHasEndDate(claim))
    .map((claim) => claim?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 2);
}

function rowText(row) {
  return norm([row?.id, row?.slug, row?.name, row?.canonicalName, row?.roleTitle, row?.organization, row?.countryName, row?.countryFocusCode, row?.countryFocus].join(' '));
}
function rowCountry(row) {
  return String(row?.countryFocusCode || row?.countryFocus || row?.countryCode || '').toUpperCase();
}
function isCurrentRole(row, officeType) {
  const text = rowText(row);
  if (/former|deceased|historical/.test(text)) return false;
  if (officeType === 'P6') return /prime minister|chancellor|head of government|premier/.test(text);
  return /president|king|queen|monarch|emir|pope|head of state/.test(text);
}
function nameMatches(row, holder) {
  const name = norm(row?.canonicalName || row?.name || '');
  const holderName = norm(holder.name);
  return Boolean(row?.wikidataId === holder.qid || name === holderName || (name && holderName && (name.includes(holderName) || holderName.includes(name))));
}
function allRows(data) {
  return [data.people, data.roster, data.topRoster, data.expansionRoster].flatMap((rows) => Array.isArray(rows) ? rows : []);
}
function findExistingPerson(data, holder) {
  return allRows(data).find((row) => nameMatches(row, holder)) || null;
}
function findSlot(data, country, officeType) {
  for (const collection of ['roster', 'topRoster', 'people', 'expansionRoster']) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    const row = rows.find((candidate) => {
      const countryOk = rowCountry(candidate) === country.code || norm(candidate.countryName || candidate.country) === norm(country.name);
      return countryOk && isCurrentRole(candidate, officeType);
    });
    if (row) return { collection, row };
  }
  return null;
}
function anchor(country) {
  const [city, countryName, lat, lng, region] = country.base;
  return { label: `${city} institutional base`, city, countryCode: country.code, countryName, lat, lng, precision: 'city', type: 'institutional_base', privacy: 'city-level public institutional base only', region };
}
function applyAnchor(row, country) {
  const a = anchor(country);
  row.countryFocus = country.code;
  row.countryFocusCode = country.code;
  row.countryCode = country.code;
  row.countryName = country.name;
  row.country = country.name;
  row.homeRegion = a.region;
  row.locationStatus = 'institutional_base_city_level';
  row.homeBases = [a];
  row.homeBase = a;
  row.mapAnchor = a;
  row.anchorLocation = a;
  row.lat = a.lat;
  row.lng = a.lng;
  row.lon = a.lng;
  row.latitude = a.lat;
  row.longitude = a.lng;
  row.flagAudit = { ...(row.flagAudit || {}), code: country.code, countryCode: country.code, countryName: country.name, label: country.name, status: 'country flag' };
}
function makePersonFromHolder(slotRow, holder, country, officeType) {
  const base = structuredClone(slotRow || {});
  base.id = slug(holder.name);
  base.slug = slug(holder.name);
  base.name = holder.name;
  base.canonicalName = holder.name;
  base.wikidataId = holder.qid;
  base.wikiTitle = holder.name;
  base.profileUrl = `https://www.wikidata.org/wiki/${holder.qid}`;
  base.officialUrl = base.officialUrl || `https://www.wikidata.org/wiki/${holder.qid}`;
  if (holder.imageUrl && !base.imageUrl) base.imageUrl = holder.imageUrl;
  base.imageProvider = holder.imageUrl ? 'Wikimedia Commons via Wikidata' : (base.imageProvider || 'needs review');
  base.roleTitle = officeType === 'P6' ? `Head of government of ${country.name}` : `Head of state of ${country.name}`;
  base.organization = country.name;
  base.category = base.category || 'political_leader';
  base.shortBio = holder.description || base.shortBio || `${holder.name}, current office holder for ${country.name}.`;
  base.trackingStatus = 'current_office_holder_safe_update';
  applyAnchor(base, country);
  return base;
}

async function main() {
  fs.mkdirSync('data/diagnostics', { recursive: true });
  const payload = readEmbedded();
  const data = payload.data;
  validate(data);
  const before = counts(data);
  const candidates = [];
  const replacements = [];
  const additions = [];
  const errors = [];
  const deathWarnings = [];

  for (const country of TARGET_COUNTRIES) {
    let countryEntity;
    try { countryEntity = await fetchEntity(country.qid); } catch (error) { errors.push({ countryCode: country.code, stage: 'country_fetch', error: String(error.message || error) }); continue; }
    for (const [property, officeLabel] of [['P35', 'head of state'], ['P6', 'head of government']]) {
      const holderIds = currentClaimIds(countryEntity, property);
      for (const qid of holderIds) {
        let entity;
        try { entity = await fetchEntity(qid); } catch (error) { errors.push({ countryCode: country.code, holderQid: qid, stage: 'holder_fetch', error: String(error.message || error) }); continue; }
        const holder = { qid, name: label(entity), description: description(entity), imageUrl: imageUrl(entity), deathDate: deathDate(entity) };
        if (!holder.name || holder.deathDate) continue;
        const slot = findSlot(data, country, property);
        const existing = findExistingPerson(data, holder);
        const candidate = { countryCode: country.code, countryName: country.name, property, officeLabel, holderName: holder.name, holderQid: qid, slotFound: Boolean(slot), slotName: slot?.row?.canonicalName || slot?.row?.name || null, alreadyPresent: Boolean(existing), action: 'none' };
        if (!slot) { candidate.action = 'review_no_matching_slot'; candidates.push(candidate); continue; }
        if (nameMatches(slot.row, holder)) {
          candidate.action = 'confirm_and_repair_anchor';
          applyAnchor(slot.row, country);
          slot.row.wikidataId = qid;
          candidates.push(candidate);
          continue;
        }
        candidate.action = existing ? 'replace_with_existing_person' : 'add_and_replace_person';
        candidates.push(candidate);
        replacements.push({ slot, holder, country, property, existing });
        if (!existing) additions.push({ holder, country, property, slot });
      }
    }
  }

  // Death check: mark deceased, never remove.
  for (const row of allRows(data)) {
    const qid = String(row?.wikidataId || '');
    if (!/^Q[0-9]+$/.test(qid)) continue;
    try {
      const entity = await fetchEntity(qid);
      const died = deathDate(entity);
      if (died) deathWarnings.push({ id: row.id || null, name: row.canonicalName || row.name || null, wikidataId: qid, deathDate: died, action: 'mark_deceased_only' });
    } catch {}
  }

  const safeToApply = APPLY && replacements.length <= MAX_REPLACEMENTS && additions.length <= MAX_ADDITIONS && before.people <= MAX_PEOPLE;
  const operations = [];

  if (safeToApply) {
    for (const item of replacements) {
      const { slot, holder, country, property, existing } = item;
      const previous = structuredClone(slot.row);
      let newPerson = existing;
      if (!newPerson) {
        newPerson = makePersonFromHolder(slot.row, holder, country, property);
        data.people.push(newPerson);
        operations.push({ type: 'add_person', countryCode: country.code, name: holder.name, wikidataId: holder.qid });
      }
      const rank = slot.row.rank;
      const prominenceScore = slot.row.prominenceScore;
      Object.assign(slot.row, structuredClone(newPerson));
      slot.row.rank = rank;
      slot.row.prominenceScore = prominenceScore ?? slot.row.prominenceScore;
      applyAnchor(slot.row, country);
      operations.push({ type: 'replace_roster_slot', collection: slot.collection, countryCode: country.code, oldName: previous.canonicalName || previous.name || null, newName: slot.row.canonicalName || slot.row.name || null, officeType: property });
      // Mark previous person former, keep historical appearances safe.
      for (const row of allRows(data)) {
        if (nameMatches(row, { name: previous.canonicalName || previous.name || '', qid: previous.wikidataId || '' })) {
          row.currentOfficeStatus = 'former_or_replaced';
          if (row.roleTitle && !/^former/i.test(row.roleTitle)) row.roleTitle = `Former ${row.roleTitle}`;
          row.trackingStatus = 'former_office_holder_preserved_for_history';
        }
      }
    }
    for (const warning of deathWarnings) {
      for (const row of allRows(data)) {
        if (row.wikidataId === warning.wikidataId || row.id === warning.id) {
          row.currentOfficeStatus = 'deceased';
          row.trackingStatus = 'deceased_historical_profile_preserved';
          if (row.roleTitle && !/^former/i.test(row.roleTitle)) row.roleTitle = `Former ${row.roleTitle}`;
        }
      }
      operations.push({ type: 'mark_deceased', ...warning });
    }
  }

  data.meta = { ...(data.meta || {}), lastCurrentHolderReview: new Date().toISOString(), currentHolderReviewStatus: safeToApply ? `applied ${operations.length} guarded operations` : 'diagnostic only or refused by safety cap' };
  const after = counts(data);

  const safetyFailures = [];
  if (after.people > MAX_PEOPLE) safetyFailures.push(`people count above ${MAX_PEOPLE}: ${after.people}`);
  if (after.roster !== before.roster) safetyFailures.push(`roster count changed ${before.roster} -> ${after.roster}`);
  if (after.expansionRoster !== before.expansionRoster) safetyFailures.push(`expansionRoster count changed ${before.expansionRoster} -> ${after.expansionRoster}`);
  if (after.appearances !== before.appearances) safetyFailures.push(`appearances count changed ${before.appearances} -> ${after.appearances}`);
  if (after.categories !== before.categories) safetyFailures.push(`categories count changed ${before.categories} -> ${after.categories}`);

  if (safetyFailures.length) throw new Error(`Unsafe roster update refused: ${safetyFailures.join('; ')}`);
  if (safeToApply) writeEmbedded(payload, data);

  const report = {
    generatedAt: new Date().toISOString(),
    status: safeToApply ? 'current_holder_update_applied' : 'current_holder_review_only_or_refused',
    applyRequested: APPLY,
    safeToApply,
    before,
    after,
    replacementCandidateCount: replacements.length,
    additionCandidateCount: additions.length,
    safetyCaps: { maxReplacements: MAX_REPLACEMENTS, maxAdditions: MAX_ADDITIONS, maxPeople: MAX_PEOPLE },
    operations,
    candidates,
    deathWarnings,
    errors
  };
  fs.writeFileSync(REVIEW_PATH, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(PATCH_PATH, JSON.stringify({ generatedAt: report.generatedAt, replacements: candidates.filter((c) => c.action.includes('replace')), deathWarnings, safetyCaps: report.safetyCaps, safeToApply }, null, 2) + '\n');

  const summary = [
    '# ParleyMap guarded current-holder review', '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Replacement candidates: ${report.replacementCandidateCount}`,
    `Addition candidates: ${report.additionCandidateCount}`,
    `Operations applied: ${operations.length}`,
    `Death warnings: ${deathWarnings.length}`,
    `Errors: ${errors.length}`,
    '',
    'If safety caps are exceeded, this writes diagnostics only and does not change index.html.'
  ].join('\n') + '\n';
  fs.writeFileSync(SUMMARY_PATH, summary);
  console.log(JSON.stringify({ status: report.status, safeToApply, replacements: replacements.length, additions: additions.length, operations: operations.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
