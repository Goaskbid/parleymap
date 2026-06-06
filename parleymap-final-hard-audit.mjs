import fs from 'node:fs';

const INDEX_PATH = 'index.html';
const ADS_PATH = 'ads.txt';
const REPORT_PATH = 'data/diagnostics/final-hard-audit-report.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';
const OPEN_TAG = '<script id="demo-data" type="application/json">';
const CLOSE_TAG = '</' + 'script>';

const CRITICAL = [
  { key: 'claudia_sheinbaum', terms: ['claudia', 'sheinbaum'], lat: 19.4326, lng: -99.1332, maxDelta: 3 },
  { key: 'pope_leo_xiv', any: ['pope leo xiv', 'leo xiv', 'pope xiv', 'robert prevost', 'pope'], lat: 41.9029, lng: 12.4534, maxDelta: 3 },
  { key: 'prabowo_subianto', terms: ['prabowo', 'subianto'], lat: -6.2088, lng: 106.8456, maxDelta: 3 },
  { key: 'rafael_grossi', terms: ['rafael', 'grossi'], lat: 48.2345, lng: 16.4166, maxDelta: 3 }
];
const FAKE_RE = /city of london finance diplomacy watch|iaea nuclear diplomacy watch|think[-\s]?tank leadership events watch|royal diaries|royal diary|watch card|generic watch/i;
const HISTORICAL_ACTIVE_RE = /vincent auriol|rene coty|georges pompidou|valery giscard|francois mitterrand/i;

function norm(value) { return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
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
  return Object.fromEntries(['people','roster','topRoster','expansionRoster','appearances','categories'].map((k) => [k, Array.isArray(data[k]) ? data[k].length : null]));
}
function objectText(item) { return norm([item?.id, item?.slug, item?.name, item?.canonicalName, item?.roleTitle, item?.organization, item?.title, item?.summary, item?.countryName, item?.countryFocusCode].join(' ')); }
function matchTarget(item, target) {
  const text = objectText(item);
  const allOk = !target.terms || target.terms.every((t) => text.includes(norm(t)));
  const anyOk = !target.any || target.any.some((t) => text.includes(norm(t)));
  return allOk && anyOk;
}
function latLng(item) {
  const sources = [item, item?.homeBases?.[0], item?.homeBase, item?.mapAnchor, item?.anchorLocation, item?.geo, item?.coordinates];
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    const lat = Number(src.lat ?? src.latitude);
    const lng = Number(src.lng ?? src.lon ?? src.long ?? src.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}
function walk(value, cb) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((v) => walk(v, cb)); return; }
  cb(value);
  Object.values(value).forEach((v) => walk(v, cb));
}
function allObjects(data) { const rows=[]; walk(data, (o) => rows.push(o)); return rows; }
function extractAds(html) {
  return {
    clients: [...new Set([...html.matchAll(/ca-pub-[0-9]{8,24}/g)].map((m)=>m[0]))],
    slots: [...new Set([...html.matchAll(/data-ad-slot=["']([0-9A-Za-z_-]+)["']/g)].map((m)=>m[1]))],
    hasLoader: /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html),
    hasMeta: /google-adsense-account/i.test(html)
  };
}

fs.mkdirSync('data/diagnostics', { recursive: true });
const { html, data } = readEmbedded();
const errors = [];
const c = counts(data);
if (c.people < 90 || c.people > 115) errors.push(`people count unsafe: ${c.people}`);
if (c.roster < 190) errors.push(`roster count unsafe: ${c.roster}`);
if (c.expansionRoster < 100) errors.push(`expansionRoster count unsafe: ${c.expansionRoster}`);
if (c.appearances < 450) errors.push(`appearances count unsafe: ${c.appearances}`);
if (c.categories < 10) errors.push(`categories count unsafe: ${c.categories}`);
if (!html.includes('parleymap-runtime-anchor-guard')) errors.push('runtime anchor guard missing');

const serialized = JSON.stringify(data);
if (FAKE_RE.test(serialized)) errors.push('fake watch/non-event card still present in embedded data');
if (HISTORICAL_ACTIVE_RE.test(JSON.stringify({ roster: data.roster, topRoster: data.topRoster }))) errors.push('historical active leader still present in active roster/topRoster');

const rows = allObjects(data);
const targetResults = [];
for (const target of CRITICAL) {
  const matches = rows.filter((row) => matchTarget(row, target));
  const anchored = matches.filter((row) => {
    const p = latLng(row);
    return p && Math.abs(p.lat - target.lat) + Math.abs(p.lng - target.lng) <= target.maxDelta;
  });
  targetResults.push({ key: target.key, matches: matches.length, anchored: anchored.length });
  if (!anchored.length) errors.push(`${target.key} has no correctly anchored data object`);
}

const ads = extractAds(html);
const adsTxt = fs.existsSync(ADS_PATH) ? fs.readFileSync(ADS_PATH, 'utf8') : '';
if (ads.clients.length) {
  const pub = ads.clients[0].replace(/^ca-/, '');
  if (!ads.hasLoader) errors.push('AdSense client found but loader missing');
  if (ads.slots.length < 2) errors.push(`AdSense client found but fewer than 2 slots found: ${ads.slots.length}`);
  if (!adsTxt.includes(pub)) errors.push('ads.txt does not contain the publisher ID found in index.html');
}

const report = { generatedAt: new Date().toISOString(), status: errors.length ? 'audit_failed' : 'audit_passed', counts: c, targetResults, ads, errors };
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
fs.appendFileSync(SUMMARY_PATH, `\n## Final hard audit\n\nStatus: ${report.status}\n\nErrors: ${errors.length}\n\nCritical anchors: ${targetResults.map((r)=>`${r.key} ${r.anchored}/${r.matches}`).join(', ')}\n`);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
