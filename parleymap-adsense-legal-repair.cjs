#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');

const INDEX_PATH='index.html';
const REPORT_PATH='data/diagnostics/adsense-legal-repair-report.json';
const AUDIT_PATH='data/diagnostics/adsense-preserve-audit-report.json';
const SUMMARY_PATH='data/diagnostics/LATEST_RUN_SUMMARY.md';

function mkdirp(p){fs.mkdirSync(p,{recursive:true});}
function read(p){return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';}
function write(p,s){mkdirp(p.split('/').slice(0,-1).join('/')||'.'); fs.writeFileSync(p,s);}
function exec(args){try{return cp.execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:50*1024*1024});}catch{return '';}}
function commits(path){return exec(['rev-list','--all','--',path]).trim().split(/\n+/).filter(Boolean).slice(0,500);}
function gitShow(sha,path){return exec(['show',`${sha}:${path}`]);}
function normalizePub(v){v=String(v||'').trim(); if(!v) return ''; v=v.replace(/^ca-/,''); if(!/^pub-[0-9]{10,25}$/.test(v)) return ''; return v;}
function normalizeClient(v){const pub=normalizePub(v); return pub?`ca-${pub}`:'';}
function unique(arr){const out=[];const seen=new Set();for(const x of arr){if(x&&!seen.has(x)){seen.add(x);out.push(x);}}return out;}
function scanText(text,source,found){
  for(const m of text.matchAll(/ca-pub-[0-9]{10,25}|pub-[0-9]{10,25}/g)){ const pub=normalizePub(m[0]); if(pub) found.publishers.push({value:pub,source}); }
  for(const m of text.matchAll(/data-ad-slot=["']([0-9]{4,30})["']/g)){ found.slots.push({value:m[1],source}); }
}
function scanRepoAndHistory(){
  const found={publishers:[],slots:[]};
  const paths=['index.html','templates/index.template.html','privacy.html','impressum.html','contact.html','about.html','src/app.js'];
  for(const p of paths){scanText(read(p),`current:${p}`,found); for(const sha of commits(p)){const txt=gitShow(sha,p); if(txt) scanText(txt,`git:${sha.slice(0,12)}:${p}`,found);} }
  return found;
}
function ensureHead(html,insert){
  if(/<\/head>/i.test(html)) return html.replace(/<\/head>/i, insert+'\n</head>');
  if(/<html[\s>]/i.test(html)) return html.replace(/<html[^>]*>/i, m=>m+'\n<head>\n'+insert+'\n</head>');
  return '<!doctype html>\n<html lang="en">\n<head>\n'+insert+'\n</head>\n<body>\n'+html+'\n</body>\n</html>\n';
}
function upsertHeadTags(html,client){
  const meta=`<meta name="google-adsense-account" content="${client}">`;
  const loader=`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`;
  let headInsert=[];
  if(!/name=["']google-adsense-account["']/i.test(html)) headInsert.push(meta);
  else html=html.replace(/<meta\s+[^>]*name=["']google-adsense-account["'][^>]*>/i,meta);
  if(!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html)) headInsert.push(loader);
  if(headInsert.length) html=ensureHead(html,headInsert.join('\n'));
  return html;
}
function installAdTemplateAndRuntime(html,client,headerSlot,sidebarSlot){
  const marker='id="parleymap-adsense-runtime"';
  if(html.includes(marker)){
    html=html.replace(/window\.__PARLEYMAP_ADSENSE_CONFIG__\s*=\s*\{[\s\S]*?\};/m,`window.__PARLEYMAP_ADSENSE_CONFIG__={client:${JSON.stringify(client)},headerSlot:${JSON.stringify(headerSlot)},sidebarSlot:${JSON.stringify(sidebarSlot)}};`);
    return html;
  }
  const block=`\n<template id="parleymap-adsense-template">\n  <ins class="adsbygoogle parleymap-adsense-unit" style="display:block" data-ad-client="${client}" data-ad-slot="${headerSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>\n  <ins class="adsbygoogle parleymap-adsense-unit" style="display:block" data-ad-client="${client}" data-ad-slot="${sidebarSlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>\n</template>\n<script ${marker}>\nwindow.__PARLEYMAP_ADSENSE_CONFIG__={client:${JSON.stringify(client)},headerSlot:${JSON.stringify(headerSlot)},sidebarSlot:${JSON.stringify(sidebarSlot)}};\n(function(){\n  function make(slot,label){var ins=document.createElement('ins');ins.className='adsbygoogle parleymap-adsense-unit';ins.style.display='block';ins.setAttribute('data-ad-client',window.__PARLEYMAP_ADSENSE_CONFIG__.client);ins.setAttribute('data-ad-slot',slot);ins.setAttribute('data-ad-format','auto');ins.setAttribute('data-full-width-responsive','true');ins.setAttribute('aria-label',label);return ins;}\n  function mount(){var cfg=window.__PARLEYMAP_ADSENSE_CONFIG__;var selectors=['[data-ad-region="header"]','.ad-header','#ad-header','.ads-header','.pm-ad-header','[data-ad-region="sidebar"]','.ad-sidebar','#ad-sidebar','.ads-sidebar','.pm-ad-sidebar'];var hosts=[];selectors.forEach(function(s){document.querySelectorAll(s).forEach(function(el){if(hosts.indexOf(el)<0) hosts.push(el);});}); if(hosts[0]&&!hosts[0].querySelector('.adsbygoogle')){hosts[0].appendChild(make(cfg.headerSlot,'ParleyMap header ad'));try{(adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}} if(hosts[1]&&!hosts[1].querySelector('.adsbygoogle')){hosts[1].appendChild(make(cfg.sidebarSlot,'ParleyMap sidebar ad'));try{(adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}}}\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount); else mount();\n})();\n</script>\n`;
  if(/<\/body>/i.test(html)) return html.replace(/<\/body>/i,block+'\n</body>');
  return html+block;
}
function legalPage(title,body,client){
  const loader = client ? `<meta name="google-adsense-account" content="${client}">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>` : '';
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${title} | ParleyMap</title>\n${loader}\n<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;max-width:880px;margin:40px auto;padding:0 20px;color:#172033}a{color:#174ea6}nav{margin-bottom:28px}nav a{margin-right:14px}</style>\n</head>\n<body>\n<nav><a href="/">ParleyMap</a><a href="/about.html">About</a><a href="/methodology.html">Methodology</a><a href="/data-sources.html">Data sources</a><a href="/privacy.html">Privacy</a><a href="/impressum.html">Impressum</a><a href="/contact.html">Contact</a></nav>\n${body}\n</body>\n</html>\n`;
}
function writeLegalPages(client){
  write('privacy.html', legalPage('Privacy',`<h1>Privacy Policy</h1><p>ParleyMap maps public-source institutional appearances and public leadership information. It does not publish private addresses, private itineraries, hotel locations, hospital locations, leaked routes, or live proximity tracking.</p><h2>Advertising and cookies</h2><p>The site may use Google AdSense. Google and its partners may use cookies or similar technologies to serve and measure ads, subject to consent requirements in your region.</p><h2>Data used by ParleyMap</h2><p>ParleyMap uses public official, institutional, and host-source information. If you believe a public record is inaccurate, contact the site operator through the contact page.</p><p>Last updated: ${new Date().toISOString().slice(0,10)}</p>`,client));
  write('impressum.html', legalPage('Impressum',`<h1>Impressum</h1><p>ParleyMap is a public-source influence and appearance mapping project.</p><p>Responsible contact: <a href="mailto:contact@parleymap.com">contact@parleymap.com</a></p><p>Editorial policy: records are limited to public appearances, official public meetings, public ceremonies, official or host-public summit records, and clearly labelled public-source leads. Private movement and inferred live routes are excluded.</p>`,client));
  write('contact.html', legalPage('Contact',`<h1>Contact</h1><p>For corrections, legal notices, privacy questions, or data-source questions, contact: <a href="mailto:contact@parleymap.com">contact@parleymap.com</a></p>`,client));
  write('about.html', legalPage('About',`<h1>About ParleyMap</h1><p>ParleyMap helps users understand where public influence is forming by mapping public appearances, official meetings, institutional events, and source-backed public records.</p>`,client));
  write('methodology.html', legalPage('Methodology',`<h1>Methodology</h1><p>ParleyMap prioritizes official sources, host-public sources, public institution pages, and audited secondary-source leads. Future events are shown only when supported by official or host-public publication. Private addresses, hotels, hospitals, leaked itineraries, and live routes are excluded.</p>`,client));
  write('data-sources.html', legalPage('Data sources',`<h1>Data sources</h1><p>ParleyMap relies on official public websites, public institutional calendars, summit host pages, government statements, international organization publications, and audited public-source records. Each publishable event should include a source pack.</p>`,client));
}
function auditAds(html,pub,client,slots,requireReady){
  const errors=[];
  if(!/<html[\s>]/i.test(html)) errors.push('index.html is not full HTML');
  if(!/name=["']google-adsense-account["']/i.test(html)) errors.push('google-adsense-account meta missing');
  if(!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html)) errors.push('AdSense loader missing');
  if(!/adsbygoogle/.test(html)) errors.push('adsbygoogle marker missing');
  for(const slot of slots) if(!html.includes(`data-ad-slot="${slot}"`)) errors.push(`data-ad-slot ${slot} missing`);
  if(!read('ads.txt').includes(`google.com, ${pub}, DIRECT, f08c47fec0942fa0`)) errors.push('ads.txt missing or wrong');
  if(requireReady && errors.length) throw new Error(errors.join('; '));
  return errors;
}
mkdirp('data/diagnostics');
const found=scanRepoAndHistory();
const inputPub=normalizePub(process.env.PARLEYMAP_ADSENSE_PUBLISHER_ID||'');
const inputHeader=String(process.env.PARLEYMAP_ADSENSE_HEADER_SLOT_ID||'').trim();
const inputSidebar=String(process.env.PARLEYMAP_ADSENSE_SIDEBAR_SLOT_ID||'').trim();
const requireReady=String(process.env.PARLEYMAP_REQUIRE_ADSENSE_READY||'true').toLowerCase() !== 'false';
const publishers=unique([inputPub,...found.publishers.map(x=>x.value)].map(normalizePub).filter(Boolean));
const slots=unique([inputHeader,inputSidebar,...found.slots.map(x=>x.value)].filter(x=>/^[0-9]{4,30}$/.test(String(x))));
const report={generatedAt:new Date().toISOString(), status:'started', foundPublishers:found.publishers.slice(0,10), foundSlots:found.slots.slice(0,20), selectedPublisher:null, selectedSlots:[], legalPagesWritten:[], adsTxtWritten:false, errors:[]};
if(!publishers[0] || slots.length<2){
  report.status='adsense_ids_not_found_no_fake_ids_injected';
  report.errors.push('Could not find one publisher ID and two ad slot IDs in current files or git history. Provide workflow inputs to install them.');
  fs.writeFileSync(REPORT_PATH,JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(AUDIT_PATH,JSON.stringify(report,null,2)+'\n');
  if(requireReady) throw new Error(report.errors[0]);
  process.exit(0);
}
const pub=publishers[0]; const client=normalizeClient(pub); const headerSlot=slots[0]; const sidebarSlot=slots.find(s=>s!==headerSlot)||slots[1];
report.selectedPublisher=pub; report.selectedSlots=[headerSlot,sidebarSlot];
let html=read(INDEX_PATH);
html=upsertHeadTags(html,client);
html=installAdTemplateAndRuntime(html,client,headerSlot,sidebarSlot);
fs.writeFileSync(INDEX_PATH,html);
fs.writeFileSync('ads.txt',`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
report.adsTxtWritten=true;
writeLegalPages(client); report.legalPagesWritten=['privacy.html','impressum.html','contact.html','about.html','methodology.html','data-sources.html'];
report.errors=auditAds(read(INDEX_PATH),pub,client,[headerSlot,sidebarSlot],requireReady);
report.status=report.errors.length?'adsense_preserved_with_warnings':'adsense_preserved_and_audited';
fs.writeFileSync(REPORT_PATH,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(AUDIT_PATH,JSON.stringify(report,null,2)+'\n');
let summary=read(SUMMARY_PATH);
summary += `\n## AdSense and legal surface\n\n- Status: ${report.status}\n- Publisher: ${client}\n- Header slot: ${headerSlot}\n- Sidebar slot: ${sidebarSlot}\n- ads.txt written: ${report.adsTxtWritten}\n- Legal pages written: ${report.legalPagesWritten.join(', ')}\n`;
fs.writeFileSync(SUMMARY_PATH,summary);
console.log(JSON.stringify(report,null,2));
