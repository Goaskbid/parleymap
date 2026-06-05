import fs from 'node:fs';

const INDEX_PATH = 'index.html';
const REVIEW_PATH = 'data/diagnostics/roster-current-holder-review.json';
const PATCH_PATH = 'data/diagnostics/roster-patch-candidates.json';
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';
const APPLY = process.argv.includes('--apply');

const TARGET_COUNTRIES = [
  { code: 'US', name: 'United States', qid: 'Q30', base: ['Washington','United States',38.9072,-77.0369,'North America'] },
  { code: 'MX', name: 'Mexico', qid: 'Q96', base: ['Mexico City','Mexico',19.4326,-99.1332,'North America'] },
  { code: 'ID', name: 'Indonesia', qid: 'Q252', base: ['Jakarta','Indonesia',-6.2088,106.8456,'Asia'] },
  { code: 'FR', name: 'France', qid: 'Q142', base: ['Paris','France',48.8566,2.3522,'Europe'] },
  { code: 'DE', name: 'Germany', qid: 'Q183', base: ['Berlin','Germany',52.52,13.405,'Europe'] },
  { code: 'GB', name: 'United Kingdom', qid: 'Q145', base: ['London','United Kingdom',51.5074,-0.1278,'Europe'] },
  { code: 'CA', name: 'Canada', qid: 'Q16', base: ['Ottawa','Canada',45.4215,-75.6972,'North America'] },
  { code: 'BR', name: 'Brazil', qid: 'Q155', base: ['Brasilia','Brazil',-15.7939,-47.8828,'South America'] },
  { code: 'IN', name: 'India', qid: 'Q668', base: ['New Delhi','India',28.6139,77.209,'South Asia'] },
  { code: 'JP', name: 'Japan', qid: 'Q17', base: ['Tokyo','Japan',35.6762,139.6503,'Asia'] },
  { code: 'AU', name: 'Australia', qid: 'Q408', base: ['Canberra','Australia',-35.2809,149.13,'Oceania'] },
  { code: 'IT', name: 'Italy', qid: 'Q38', base: ['Rome','Italy',41.9028,12.4964,'Europe'] },
  { code: 'ES', name: 'Spain', qid: 'Q29', base: ['Madrid','Spain',40.4168,-3.7038,'Europe'] },
  { code: 'PL', name: 'Poland', qid: 'Q36', base: ['Warsaw','Poland',52.2297,21.0122,'Europe'] },
  { code: 'UA', name: 'Ukraine', qid: 'Q212', base: ['Kyiv','Ukraine',50.4501,30.5234,'Europe'] },
  { code: 'TR', name: 'Turkey', qid: 'Q43', base: ['Ankara','Turkey',39.9334,32.8597,'Middle East'] },
  { code: 'SA', name: 'Saudi Arabia', qid: 'Q851', base: ['Riyadh','Saudi Arabia',24.7136,46.6753,'Middle East'] },
  { code: 'AE', name: 'United Arab Emirates', qid: 'Q878', base: ['Abu Dhabi','United Arab Emirates',24.4539,54.3773,'Middle East'] },
  { code: 'QA', name: 'Qatar', qid: 'Q846', base: ['Doha','Qatar',25.2854,51.531,'Middle East'] },
  { code: 'IL', name: 'Israel', qid: 'Q801', base: ['Jerusalem','Israel',31.7683,35.2137,'Middle East'] }
];

function norm(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function slug(value) { return norm(value).replace(/ /g, '-').slice(0, 80); }
function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error('demo-data opening tag not found');
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error('demo-data closing tag not found');
  return { html, jsonStart, jsonEnd, data: JSON.parse(html.slice(jsonStart, jsonEnd).trim()) };
}
function writeEmbedded(payload, data) {
  const next = payload.html.slice(0, payload.jsonStart) + '\n' + JSON.stringify(data, null, 2) + '\n' + payload.html.slice(payload.jsonEnd);
  fs.writeFileSync(INDEX_PATH, next);
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/demo.json', JSON.stringify(data, null, 2) + '\n');
}
function counts(data) {
  return { people: data.people?.length ?? null, roster: data.roster?.length ?? null, topRoster: data.topRoster?.length ?? null, expansionRoster: data.expansionRoster?.length ?? null, appearances: data.appearances?.length ?? null, categories: data.categories?.length ?? null };
}
function validate(data, label) {
  for (const key of ['people','roster','expansionRoster','appearances','categories']) if (!Array.isArray(data[key])) throw new Error(`${label}: ${key} must be an array`);
  const c = counts(data);
  if (c.people < 90 || c.people > 115) throw new Error(`${label}: unsafe people count ${c.people}`);
  if (c.roster < 190 || c.roster > 205) throw new Error(`${label}: unsafe roster count ${c.roster}`);
  if (c.expansionRoster < 100 || c.expansionRoster > 130) throw new Error(`${label}: unsafe expansionRoster count ${c.expansionRoster}`);
  if (c.appearances < 500) throw new Error(`${label}: appearances too low ${c.appearances}`);
}
async function fetchEntity(qid) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { signal: controller.signal, headers: { 'user-agent': 'ParleyMap current-holder review' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.entities?.[qid] || null;
  } finally { clearTimeout(timer); }
}
function label(entity) { return entity?.labels?.en?.value || entity?.labels?.mul?.value || ''; }
function description(entity) { return entity?.descriptions?.en?.value || ''; }
function imageUrl(entity) {
  const file = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}` : '';
}
function claimHasEndDate(claim) { return Boolean(claim?.qualifiers?.P582 || claim?.qualifiers?.P576 || claim?.qualifiers?.P2669); }
function currentClaimIds(entity, property) {
  const claims = (entity?.claims?.[property] || []).filter((claim) => claim?.rank !== 'deprecated' && !claimHasEndDate(claim));
  const preferred = claims.filter((claim) => claim.rank === 'preferred');
  const selected = preferred.length ? preferred : claims;
  return [...new Set(selected.map((claim) => claim?.mainsnak?.datavalue?.value?.id).filter(Boolean))];
}
function rowText(row) { return norm([row.id,row.slug,row.name,row.canonicalName,row.roleTitle,row.organization,row.country,row.countryName,row.countryFocus,row.countryFocusCode].join(' ')); }
function rowCountry(row) { return String(row.countryFocusCode || row.countryFocus || row.countryCode || '').toUpperCase(); }
function roleMatches(row, officeType) {
  const text = rowText(row);
  if (/former|deceased|historical/.test(text)) return false;
  if (officeType === 'P6') return /(prime minister|chancellor|head of government|premier)/.test(text);
  return /(president|king|queen|monarch|emir|head of state)/.test(text);
}
function findActiveSlot(data, country, officeType) {
  for (const collection of ['roster','topRoster','people','expansionRoster']) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    const index = rows.findIndex((row) => (rowCountry(row) === country.code || norm(row.countryName || row.country) === norm(country.name)) && roleMatches(row, officeType));
    if (index >= 0) return { collection, rows, index, row: rows[index] };
  }
  return null;
}
function personPresent(rows, holder) {
  const holderName = norm(holder.name);
  return rows.find((row) => String(row.wikidataId || '') === holder.qid || norm(row.canonicalName || row.name) === holderName || holderName.includes(norm(row.canonicalName || row.name)) || norm(row.canonicalName || row.name).includes(holderName)) || null;
}
function makeAnchor(country) {
  const [city, countryName, lat, lng, region] = country.base;
  return { label: `${city} institutional base`, city, countryCode: country.code, countryName, lat, lng, lon: lng, precision: 'city', type: 'institutional_base', privacy: 'city-level public institutional base only', region };
}
function applyAnchor(row, country) {
  const a = makeAnchor(country);
  row.countryFocus = country.code; row.countryFocusCode = country.code; row.countryCode = country.code; row.countryName = country.name; row.country = country.name;
  row.homeRegion = a.region; row.locationStatus = 'institutional_base_city_level';
  row.homeBases = [a]; row.homeBase = a; row.mapAnchor = a; row.anchorLocation = a; row.baseLocation = a; row.institutionalBase = a;
  row.lat = a.lat; row.lng = a.lng; row.lon = a.lng; row.latitude = a.lat; row.longitude = a.lng; row.mapLat = a.lat; row.mapLng = a.lng; row.homeLat = a.lat; row.homeLng = a.lng;
  row.flagAudit = { ...(row.flagAudit || {}), code: country.code, countryCode: country.code, countryName: country.name, label: country.name, status: 'country flag' };
}
function buildPersonFromSlot(slotRow, holder, country, officeType) {
  const row = structuredClone(slotRow || {});
  const id = slug(holder.name);
  row.id = id; row.slug = id; row.name = holder.name; row.canonicalName = holder.name; row.wikidataId = holder.qid; row.wikiTitle = holder.name;
  row.profileUrl = `https://www.wikidata.org/wiki/${holder.qid}`; row.officialUrl = row.officialUrl || `https://www.wikidata.org/wiki/${holder.qid}`;
  if (holder.imageUrl) { row.imageUrl = holder.imageUrl; row.imageProvider = 'Wikimedia Commons via Wikidata'; }
  row.roleTitle = officeType === 'P6' ? `Head of government of ${country.name}` : `Head of state of ${country.name}`;
  row.organization = country.name; row.category = row.category || 'political_leader'; row.trackingStatus = 'current_office_holder_auto_updated'; row.sourcePriority = 'current-holder monthly review';
  row.shortBio = holder.description || row.shortBio || `${holder.name}, current office holder for ${country.name}.`;
  row.lastRosterAutoUpdate = new Date().toISOString();
  applyAnchor(row, country);
  return row;
}
function markFormer(row) {
  if (row && !/^former/i.test(row.roleTitle || '')) row.roleTitle = `Former ${row.roleTitle || 'office holder'}`;
  if (row) { row.trackingStatus = 'former_office_holder'; row.currentOfficeStatus = 'former'; row.lastRosterAutoUpdate = new Date().toISOString(); }
}

fs.mkdirSync('data/diagnostics', { recursive: true });
const payload = readEmbedded();
const data = payload.data;
validate(data, 'before');
const before = counts(data);
const allRows = () => [...(data.people || []), ...(data.roster || []), ...(data.topRoster || []), ...(data.expansionRoster || [])];
const review = { generatedAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'diagnostic', checkedCountries: [], candidates: [], operations: [], errors: [] };

for (const country of TARGET_COUNTRIES) {
  let countryEntity;
  try { countryEntity = await fetchEntity(country.qid); }
  catch (error) { review.errors.push({ countryCode: country.code, stage: 'fetch_country', error: String(error.message || error) }); continue; }
  for (const office of [{ type: 'P35', label: 'head of state' }, { type: 'P6', label: 'head of government' }]) {
    const ids = currentClaimIds(countryEntity, office.type);
    review.checkedCountries.push({ countryCode: country.code, officeType: office.type, currentClaimIds: ids });
    if (ids.length !== 1) { review.errors.push({ countryCode: country.code, officeType: office.type, reason: 'not_exactly_one_current_claim', ids }); continue; }
    let holderEntity;
    try { holderEntity = await fetchEntity(ids[0]); } catch (error) { review.errors.push({ countryCode: country.code, stage: 'fetch_holder', holderQid: ids[0], error: String(error.message || error) }); continue; }
    const holder = { qid: ids[0], name: label(holderEntity), description: description(holderEntity), imageUrl: imageUrl(holderEntity) };
    if (!holder.name) continue;
    const slot = findActiveSlot(data, country, office.type);
    review.candidates.push({ countryCode: country.code, countryName: country.name, officeType: office.type, holderName: holder.name, holderQid: holder.qid, slotFound: Boolean(slot), slotName: slot?.row?.canonicalName || slot?.row?.name || null, slotQid: slot?.row?.wikidataId || null });
    if (!slot) continue;
    const same = String(slot.row.wikidataId || '') === holder.qid || norm(slot.row.canonicalName || slot.row.name) === norm(holder.name) || norm(slot.row.canonicalName || slot.row.name).includes(norm(holder.name)) || norm(holder.name).includes(norm(slot.row.canonicalName || slot.row.name));
    if (same) { applyAnchor(slot.row, country); review.operations.push({ type: 'confirm_current_holder', countryCode: country.code, officeType: office.type, name: holder.name }); continue; }
    if (!APPLY) continue;
    const oldId = slot.row.id || null; const oldName = slot.row.canonicalName || slot.row.name || null;
    let newPerson = personPresent(data.people, holder);
    if (!newPerson) { newPerson = buildPersonFromSlot(slot.row, holder, country, office.type); data.people.push(newPerson); review.operations.push({ type: 'add_person', countryCode: country.code, officeType: office.type, name: holder.name }); }
    else { Object.assign(newPerson, buildPersonFromSlot(newPerson, holder, country, office.type)); }
    for (const collection of ['roster','topRoster','expansionRoster']) {
      const rows = data[collection] || [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const hit = (oldId && row.id === oldId) || (oldName && norm(row.canonicalName || row.name) === norm(oldName)) || (rowCountry(row) === country.code && roleMatches(row, office.type));
        if (!hit) continue;
        const keepRank = row.rank; const keepScore = row.prominenceScore;
        rows[i] = { ...row, ...structuredClone(newPerson), rank: keepRank, prominenceScore: keepScore ?? newPerson.prominenceScore };
        applyAnchor(rows[i], country);
        review.operations.push({ type: 'replace_roster_slot', collection, index: i, countryCode: country.code, officeType: office.type, oldName, newName: holder.name });
      }
    }
    for (const row of data.people) {
      if ((oldId && row.id === oldId) || (oldName && norm(row.canonicalName || row.name) === norm(oldName))) {
        markFormer(row);
        review.operations.push({ type: 'mark_former', countryCode: country.code, oldName });
      }
    }
  }
}

const replacementCount = review.operations.filter((op) => op.type === 'replace_roster_slot').length;
const addCount = review.operations.filter((op) => op.type === 'add_person').length;
const after = counts(data);

if (APPLY) {
  if (replacementCount > 8) throw new Error(`too many roster replacements: ${replacementCount}`);
  if (addCount > 5) throw new Error(`too many people additions: ${addCount}`);
  if (after.roster !== before.roster) throw new Error(`roster count changed ${before.roster} -> ${after.roster}`);
  if (after.expansionRoster !== before.expansionRoster) throw new Error(`expansionRoster count changed ${before.expansionRoster} -> ${after.expansionRoster}`);
  if (after.appearances !== before.appearances) throw new Error(`appearances count changed ${before.appearances} -> ${after.appearances}`);
  if (after.categories !== before.categories) throw new Error(`categories count changed ${before.categories} -> ${after.categories}`);
  if (after.people > 115) throw new Error(`people count above safety cap after update: ${after.people}`);
  data.meta = { ...(data.meta || {}), lastCurrentHolderReview: new Date().toISOString(), currentHolderReviewStatus: `operations=${review.operations.length}; replacements=${replacementCount}; added=${addCount}` };
  writeEmbedded(payload, data);
}

review.status = APPLY ? 'current_holder_update_applied' : 'current_holder_review_complete';
review.before = before;
review.after = APPLY ? counts(data) : before;
review.replacementCount = replacementCount;
review.addedPeopleCount = addCount;
fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2) + '\n');
fs.writeFileSync(PATCH_PATH, JSON.stringify({ generatedAt: review.generatedAt, status: APPLY ? 'applied_with_guardrails' : 'manual_review_candidates', replacements: review.operations.filter((op) => op.type === 'replace_roster_slot'), candidates: review.candidates, errors: review.errors }, null, 2) + '\n');
console.log(JSON.stringify({ status: review.status, replacementCount, addedPeopleCount: addCount, errors: review.errors.length }, null, 2));
