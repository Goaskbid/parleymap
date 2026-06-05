import fs from 'node:fs';

const INDEX_PATH = 'index.html';
const REPORT_PATH = 'data/diagnostics/final-audit-report.json';
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';

const TARGETS = [
  { key: 'claudia_sheinbaum', displayName: 'Claudia Sheinbaum', must: ['claudia','sheinbaum'], anchor: { city: 'Mexico City', countryCode: 'MX', lat: 19.4326, lng: -99.1332 } },
  { key: 'pope_leo_xiv', displayName: 'Pope Leo XIV', any: ['pope leo xiv','leo xiv','robert prevost','pope'], anchor: { city: 'Vatican City', countryCode: 'VA', lat: 41.9029, lng: 12.4534 } },
  { key: 'prabowo_subianto', displayName: 'Prabowo Subianto', must: ['prabowo','subianto'], anchor: { city: 'Jakarta', countryCode: 'ID', lat: -6.2088, lng: 106.8456 } },
  { key: 'rafael_grossi', displayName: 'Rafael Grossi', must: ['rafael','grossi'], anchor: { city: 'Vienna', countryCode: 'AT', lat: 48.2345, lng: 16.4166 } }
];

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function readEmbedded() {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const start = html.indexOf(OPEN_TAG);
  if (start === -1) throw new Error('demo-data opening tag not found');
  const jsonStart = start + OPEN_TAG.length;
  const jsonEnd = html.indexOf(CLOSE_TAG, jsonStart);
  if (jsonEnd === -1) throw new Error('demo-data closing tag not found');
  return { html, data: JSON.parse(html.slice(jsonStart, jsonEnd).trim()) };
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
  for (const key of ['people','roster','expansionRoster','appearances','categories']) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.people.length < 90 || data.people.length > 115) throw new Error(`people count unsafe: ${data.people.length}`);
  if (data.roster.length < 190 || data.roster.length > 205) throw new Error(`roster count unsafe: ${data.roster.length}`);
  if (data.expansionRoster.length < 100 || data.expansionRoster.length > 130) throw new Error(`expansionRoster count unsafe: ${data.expansionRoster.length}`);
  if (data.appearances.length < 500) throw new Error(`appearances count too low: ${data.appearances.length}`);
  if (data.categories.length < 10) throw new Error(`categories count too low: ${data.categories.length}`);
}

function textOf(obj) {
  return norm([
    obj?.id,
    obj?.slug,
    obj?.personId,
    obj?.name,
    obj?.canonicalName,
    obj?.personName,
    obj?.roleTitle,
    obj?.organization,
    obj?.country,
    obj?.countryName,
    obj?.countryFocus,
    obj?.countryFocusCode,
    obj?.title,
    obj?.summary
  ].join(' '));
}

function matches(obj, target, idSet) {
  const text = textOf(obj);
  const id = String(obj?.id || obj?.slug || obj?.personId || '').toLowerCase();
  const idHit = [...idSet].some((candidate) => candidate && (id === candidate.toLowerCase() || id.includes(candidate.toLowerCase())));
  const mustOk = !target.must || target.must.every((part) => text.includes(norm(part)));
  const anyOk = !target.any || target.any.some((part) => text.includes(norm(part)));
  return idHit || (mustOk && anyOk);
}

function walk(value, path, callback, seen = new Set()) {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${path}[${index}]`, callback, seen));
    return;
  }
  callback(value, path);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') walk(child, `${path}.${key}`, callback, seen);
  }
}

function latLngOf(obj) {
  const lat = Number(obj?.lat ?? obj?.latitude ?? obj?.mapLat ?? obj?.homeLat ?? obj?.anchorLat ?? obj?.baseLat ?? obj?.location?.lat ?? obj?.homeBase?.lat ?? obj?.homeBases?.[0]?.lat ?? obj?.mapAnchor?.lat ?? obj?.coordinates?.lat ?? obj?.geo?.lat);
  const lng = Number(obj?.lng ?? obj?.lon ?? obj?.longitude ?? obj?.mapLng ?? obj?.mapLon ?? obj?.homeLng ?? obj?.homeLon ?? obj?.anchorLng ?? obj?.anchorLon ?? obj?.baseLng ?? obj?.baseLon ?? obj?.location?.lng ?? obj?.location?.lon ?? obj?.homeBase?.lng ?? obj?.homeBase?.lon ?? obj?.homeBases?.[0]?.lng ?? obj?.homeBases?.[0]?.lon ?? obj?.mapAnchor?.lng ?? obj?.mapAnchor?.lon ?? obj?.coordinates?.lng ?? obj?.coordinates?.lon ?? obj?.geo?.lng ?? obj?.geo?.lon);
  return { lat, lng };
}

function closeEnough(actual, expected) {
  if (!Number.isFinite(actual.lat) || !Number.isFinite(actual.lng)) return false;
  return Math.abs(actual.lat - expected.lat) < 0.5 && Math.abs(actual.lng - expected.lng) < 0.5;
}

const { html, data } = readEmbedded();
validateCore(data);

if (!html.includes('PARLEYMAP_ANCHOR_RUNTIME_GUARD_START')) {
  throw new Error('runtime anchor guard missing from index.html');
}

const pollution = JSON.stringify(data).slice(0, 7000000);
if (/miguel-de-la-madrid|lazaro-cardenas|pascual-ortiz-rubio|gustavo-diaz-ordaz/i.test(pollution)) {
  throw new Error('historical Mexico president pollution still present');
}

const idSets = new Map(TARGETS.map((target) => [target.key, new Set()]));
for (const collection of ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples']) {
  const rows = data[collection];
  if (!rows) continue;
  walk(rows, collection, (obj) => {
    for (const target of TARGETS) {
      const text = textOf(obj);
      const mustOk = !target.must || target.must.every((part) => text.includes(norm(part)));
      const anyOk = !target.any || target.any.some((part) => text.includes(norm(part)));
      if (mustOk && anyOk) {
        for (const key of ['id','slug','personId','wikidataId']) if (obj[key]) idSets.get(target.key).add(String(obj[key]));
      }
    }
  });
}

const findings = Object.fromEntries(TARGETS.map((target) => [target.key, { checked: 0, bad: [], good: [] }]));
walk(data, 'data', (obj, path) => {
  const profileish = obj.id || obj.slug || obj.personId || obj.name || obj.canonicalName || obj.personName || obj.roleTitle || obj.title;
  if (!profileish) return;
  for (const target of TARGETS) {
    if (!matches(obj, target, idSets.get(target.key))) continue;
    const actual = latLngOf(obj);
    findings[target.key].checked += 1;
    const item = { path, name: obj.canonicalName || obj.name || obj.personName || obj.title || null, actual, expected: target.anchor };
    if (closeEnough(actual, target.anchor)) findings[target.key].good.push(item);
    else findings[target.key].bad.push(item);
    break;
  }
});

for (const target of TARGETS) {
  const result = findings[target.key];
  if (result.checked < 1) throw new Error(`no matching objects found for ${target.key}`);
  if (result.good.length < 1) throw new Error(`no correctly anchored objects found for ${target.key}`);
  if (result.bad.length > 0) {
    throw new Error(`${target.key} has ${result.bad.length} bad anchored matching objects; first=${JSON.stringify(result.bad[0])}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: 'audit_passed',
  counts: counts(data),
  runtimeGuardInstalled: true,
  findings: Object.fromEntries(Object.entries(findings).map(([key, value]) => [key, { checked: value.checked, good: value.good.length, bad: value.bad.length, sample: value.good.slice(0, 5) }]))
};
fs.mkdirSync('data/diagnostics', { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
