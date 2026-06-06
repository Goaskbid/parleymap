import fs from 'node:fs';
import { execSync } from 'node:child_process';

const INDEX_PATH = 'index.html';
const ADS_PATH = 'ads.txt';
const REPORT_PATH = 'data/diagnostics/adsense-preserve-audit-report.json';
const SUMMARY_PATH = 'data/diagnostics/LATEST_RUN_SUMMARY.md';

function ensureDir(path) { fs.mkdirSync(path, { recursive: true }); }
function read(path) { return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : ''; }
function write(path, text) { fs.writeFileSync(path, text); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function extract(html) {
  const clients = unique([...html.matchAll(/ca-pub-[0-9]{8,24}/g)].map((m) => m[0]));
  const pubIds = unique(clients.map((c) => c.replace(/^ca-/, '')).concat([...html.matchAll(/pub-[0-9]{8,24}/g)].map((m) => m[0])));
  const slots = unique([...html.matchAll(/data-ad-slot=["']([0-9A-Za-z_-]+)["']/g)].map((m) => m[1]));
  const hasLoader = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html);
  const hasMeta = /google-adsense-account/i.test(html);
  const units = [...html.matchAll(/<ins\b[\s\S]*?class=["'][^"']*adsbygoogle[^"']*["'][\s\S]*?<\/ins>/gi)].map((m) => m[0]);
  return { clients, pubIds, slots, hasLoader, hasMeta, units };
}
function adBlocksFrom(html) {
  const blocks = [];
  const meta = html.match(/<meta[^>]+name=["']google-adsense-account["'][^>]*>/i)?.[0];
  const loader = html.match(/<script[^>]+pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/i)?.[0] || html.match(/<script[^>]+pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*>/i)?.[0];
  if (meta) blocks.push({ type: 'meta', html: meta });
  if (loader) blocks.push({ type: 'loader', html: loader });
  const unitRe = /<ins\b[\s\S]*?class=["'][^"']*adsbygoogle[^"']*["'][\s\S]*?<\/ins>\s*<script>[\s\S]*?adsbygoogle[\s\S]*?push\s*\(\s*\{\s*\}\s*\)[\s\S]*?<\/script>/gi;
  let m;
  while ((m = unitRe.exec(html))) blocks.push({ type: 'unit', html: m[0] });
  return blocks;
}
function findAdSenseInHistory() {
  let commits = [];
  try { commits = execSync('git log --format=%H -- index.html', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean); } catch { commits = []; }
  for (const commit of commits) {
    let html = '';
    try { html = execSync(`git show ${commit}:index.html`, { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 }); } catch { continue; }
    const info = extract(html);
    if (info.clients.length && info.slots.length >= 2 && info.hasLoader) return { commit, html, info, blocks: adBlocksFrom(html) };
  }
  return null;
}
function insertAfterHead(html, block) { return html.replace(/<head[^>]*>/i, (h) => `${h}\n${block}`); }
function insertBeforeHeadEnd(html, block) { return html.replace(/<\/head>/i, `${block}\n</head>`); }
function ensureMeta(html, client) {
  if (/google-adsense-account/i.test(html)) return html;
  return insertAfterHead(html, `<meta name="google-adsense-account" content="${client}">`);
}
function ensureLoader(html, client) {
  if (/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html)) return html;
  return insertBeforeHeadEnd(html, `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`);
}
function buildUnit(client, slot, label) {
  return `<!-- ParleyMap ${label} preserved AdSense unit -->\n<ins class="adsbygoogle" style="display:block;min-height:90px" data-ad-client="${client}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`;
}
function mountUnitsRuntime(html, client, slots) {
  if (html.includes('id="parleymap-adsense-safe-mount"')) return html;
  const script = `<script id="parleymap-adsense-safe-mount">
(function(){
  const client = ${JSON.stringify(client)};
  const slots = ${JSON.stringify(slots.slice(0,2))};
  function mount(){
    const candidates = Array.from(document.querySelectorAll('[id*=ad i], [class*=ad i], aside, header'));
    const headerHost = document.querySelector('[data-parleymap-ad="header"], #header-ad, .header-ad, .ad-header') || candidates.find(el => /header|leader|top|ad slot/i.test(el.textContent||''));
    const sideHost = document.querySelector('[data-parleymap-ad="sidebar"], #sidebar-ad, .sidebar-ad, .ad-sidebar') || candidates.find(el => /sidebar|side|ad slot/i.test(el.textContent||''));
    [[headerHost, slots[0], 'header'], [sideHost, slots[1], 'sidebar']].forEach(([host, slot, name]) => {
      if(!host || !slot || host.querySelector('ins.adsbygoogle')) return;
      const ins=document.createElement('ins');
      ins.className='adsbygoogle';
      ins.style.display='block';
      ins.style.minHeight=name==='header'?'90px':'250px';
      ins.setAttribute('data-ad-client', client);
      ins.setAttribute('data-ad-slot', slot);
      ins.setAttribute('data-ad-format','auto');
      ins.setAttribute('data-full-width-responsive','true');
      host.innerHTML=''; host.appendChild(ins);
      try{ (window.adsbygoogle=window.adsbygoogle||[]).push({}); }catch(e){}
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
</script>`;
  return html.replace(/<\/body>/i, `${script}\n</body>`);
}
function transplantFromHistory(html, historical) {
  let out = html;
  const info = extract(out);
  const hinfo = historical.info;
  const client = info.clients[0] || hinfo.clients[0];
  const slots = info.slots.length >= 2 ? info.slots : hinfo.slots;
  out = ensureMeta(out, client);
  out = ensureLoader(out, client);
  if (extract(out).slots.length < 2 && hinfo.slots.length >= 2) {
    out = out.replace(/<\/body>/i, `${buildUnit(client, hinfo.slots[0], 'Header')}\n${buildUnit(client, hinfo.slots[1], 'Sidebar')}\n</body>`);
  }
  out = mountUnitsRuntime(out, client, slots);
  return out;
}

ensureDir('data/diagnostics');
let html = read(INDEX_PATH);
let info = extract(html);
let restoredFromHistory = null;
if (!(info.clients.length && info.slots.length >= 2 && info.hasLoader)) {
  const historical = findAdSenseInHistory();
  if (historical) {
    html = transplantFromHistory(html, historical);
    restoredFromHistory = historical.commit;
    info = extract(html);
  }
}

const errors = [];
if (!info.clients.length) errors.push('No ca-pub publisher client found in index.html or history. Ad code was not invented.');
if (info.slots.length < 2) errors.push(`Expected at least two data-ad-slot values, found ${info.slots.length}.`);
if (!info.hasLoader) errors.push('AdSense loader script missing.');

if (info.clients.length) {
  const client = info.clients[0];
  const pub = client.replace(/^ca-/, '');
  const line = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
  const currentAds = read(ADS_PATH);
  if (!currentAds.includes(pub)) write(ADS_PATH, line); else if (currentAds.trim() !== line.trim()) write(ADS_PATH, currentAds.trim() + '\n');
  html = ensureMeta(html, client);
  html = ensureLoader(html, client);
  if (info.slots.length >= 2) html = mountUnitsRuntime(html, client, info.slots);
  write(INDEX_PATH, html);
}

const finalInfo = extract(read(INDEX_PATH));
const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'adsense_audit_needs_attention_no_slot_overwrite' : 'adsense_preserved_and_audited',
  restoredAdsenseFromHistory: restoredFromHistory,
  clients: finalInfo.clients,
  slots: finalInfo.slots,
  hasLoader: finalInfo.hasLoader,
  hasMeta: finalInfo.hasMeta,
  adsTxtExists: fs.existsSync(ADS_PATH),
  errors,
  guarantee: 'This script preserves existing publisher and slot IDs. It does not replace data-ad-slot values with invented values.'
};
write(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
fs.appendFileSync(SUMMARY_PATH, `\n## AdSense preserve audit\n\nStatus: ${report.status}\n\nPublisher clients found: ${report.clients.join(', ') || 'none'}\n\nSlots found: ${report.slots.join(', ') || 'none'}\n\nRestored AdSense from history: ${restoredFromHistory || 'no'}\n\nErrors: ${errors.length}\n`);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
