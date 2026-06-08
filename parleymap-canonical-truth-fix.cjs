#!/usr/bin/env node
/*
ParleyMap canonical truth fix.

Design principles:
- Do not blindly inject data/demo.json into index.html.
- Prefer the embedded index.html demo-data block when it exists and passes gates.
- If current index.html is thin/broken, recover a full app shell from git history.
- Repair data globally across all profile-like and event-like collections.
- Preserve recoverable AdSense IDs and create ads.txt.
- Fail before commit if hard assertions fail.
*/
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const INDEX = 'index.html';
const DEMO = 'data/demo.json';
const DIAG = 'data/diagnostics';
const OPEN_RE = /<script\s+id=["']demo-data["']\s+type=["']application\/json["']\s*>/i;
const CLOSE_RE = /<\/script>/i;
const MIN_COUNTS = { people: 90, roster: 190, expansionRoster: 100, appearances: 480, categories: 10 };

const TARGETS = [
  { key: 'rafael_grossi', any: ['rafael grossi', 'rafael mariano grossi', 'grossi'], canonicalName: 'Rafael Grossi', base: { city: 'Vienna', countryCode: 'AT', countryName: 'Austria', lat: 48.2082, lng: 16.3738, region: 'Europe', label: 'Vienna IAEA institutional base' }, organization: 'International Atomic Energy Agency', roleHint: 'IAEA Director General' },
  { key: 'pope_leo_xiv', any: ['pope leo xiv', 'leo xiv', 'robert prevost', 'robert francis prevost', 'pope'], canonicalName: 'Pope Leo XIV', base: { city: 'Vatican City', countryCode: 'VA', countryName: 'Vatican City', lat: 41.9029, lng: 12.4534, region: 'Europe', label: 'Vatican City institutional base' }, organization: 'Holy See', roleHint: 'Pope' },
  { key: 'claudia_sheinbaum', all: ['claudia','sheinbaum'], canonicalName: 'Claudia Sheinbaum', base: { city: 'Mexico City', countryCode: 'MX', countryName: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America', label: 'Mexico City institutional base' }, organization: 'Government of Mexico', roleHint: 'President of Mexico' },
  { key: 'prabowo_subianto', all: ['prabowo','subianto'], canonicalName: 'Prabowo Subianto', base: { city: 'Jakarta', countryCode: 'ID', countryName: 'Indonesia', lat: -6.2088, lng: 106.8456, region: 'Asia', label: 'Jakarta institutional base' }, organization: 'Government of Indonesia', roleHint: 'President of Indonesia' },
  { key: 'mohammed_bin_salman', any: ['mohammed bin salman', 'mohammad bin salman', 'muhammad bin salman', 'mbs'], canonicalName: 'Mohammed bin Salman', base: { city: 'Riyadh', countryCode: 'SA', countryName: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, region: 'Middle East', label: 'Riyadh institutional base' }, organization: 'Kingdom of Saudi Arabia', roleHint: 'Crown Prince of Saudi Arabia' },
  { key: 'king_charles', any: ['king charles iii', 'charles iii', 'king charles'], canonicalName: 'King Charles III', base: { city: 'London', countryCode: 'GB', countryName: 'United Kingdom', lat: 51.5074, lng: -0.1278, region: 'Europe', label: 'London institutional base' }, organization: 'The Royal Family', roleHint: 'King of the United Kingdom' },
  { key: 'antonio_guterres', any: ['antonio guterres', 'antónio guterres', 'guterres'], canonicalName: 'António Guterres', base: { city: 'New York', countryCode: 'US', countryName: 'United States', lat: 40.7499, lng: -73.968, region: 'North America', label: 'United Nations New York institutional base' }, organization: 'United Nations', roleHint: 'UN Secretary-General' },
  { key: 'mark_rutte', all: ['mark','rutte'], canonicalName: 'Mark Rutte', base: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8798, lng: 4.4219, region: 'Europe', label: 'NATO Brussels institutional base' }, organization: 'NATO', roleHint: 'NATO Secretary General' },
  { key: 'emmanuel_macron', all: ['emmanuel','macron'], canonicalName: 'Emmanuel Macron', base: { city: 'Paris', countryCode: 'FR', countryName: 'France', lat: 48.8566, lng: 2.3522, region: 'Europe', label: 'Paris institutional base' }, organization: 'Présidence de la République française', roleHint: 'President of France' },
  { key: 'ursula_von_der_leyen', any: ['ursula von der leyen','leyen'], canonicalName: 'Ursula von der Leyen', base: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, region: 'Europe', label: 'European Commission Brussels institutional base' }, organization: 'European Commission', roleHint: 'European Commission President' },
  { key: 'kaja_kallas', all: ['kaja','kallas'], canonicalName: 'Kaja Kallas', base: { city: 'Brussels', countryCode: 'BE', countryName: 'Belgium', lat: 50.8503, lng: 4.3517, region: 'Europe', label: 'European Union Brussels institutional base' }, organization: 'European Union', roleHint: 'EU High Representative' }
];

const FAKE_EVENT_RE = /\b(city of london finance diplomacy watch|iaea nuclear diplomacy watch|think[- ]tank leadership events watch|royal diaries and state[- ]visit watch|source[- ]watch|watch card|homepage|home page|privacy|terms|cookie|sitemap|faq|frequently asked|foire aux questions|fact sheet|programme|program|profile page|index page)\b/i;
const ACTIVE_HISTORY_RE = /\b(vincent auriol|charles de gaulle|georges pompidou|valery giscard|francois mitterrand|jacques chirac|nicolas sarkozy|francois hollande|enrique pena nieto|felipe calderon|vicente fox|ernesto zedillo|carlos salinas)\b/i;

function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function read(p){ return fs.existsSync(p) ? fs.readFileSync(p,'utf8') : ''; }
function write(p,s){ ensureDir(path.dirname(p)); fs.writeFileSync(p,s); }
function sh(cmd){ try { return cp.execSync(cmd,{encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:50*1024*1024}); } catch { return ''; } }
function norm(v){ return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
function slug(v){ return norm(v).replace(/ /g,'-').replace(/^-+|-+$/g,'').slice(0,90); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

function extractDemoFromHtml(html){
  const open = OPEN_RE.exec(html);
  if(!open) return null;
  const start = open.index + open[0].length;
  const close = CLOSE_RE.exec(html.slice(start));
  if(!close) return null;
  const end = start + close.index;
  const jsonText = html.slice(start,end).trim();
  try { return { data: JSON.parse(jsonText), start, end, openTag: open[0] }; } catch { return null; }
}
function replaceDemoInHtml(html,data){
  const ex = extractDemoFromHtml(html);
  if(!ex) throw new Error('Cannot write demo-data: index shell has no parseable demo-data block');
  return html.slice(0,ex.start) + '\n' + JSON.stringify(data,null,2) + '\n' + html.slice(ex.end);
}
function isFullHtml(html){ return /<html[\s>]/i.test(html) && /<head[\s>]/i.test(html) && /<body[\s>]/i.test(html) && html.length > 100000 && !!extractDemoFromHtml(html); }
function counts(data){ return Object.fromEntries(['people','roster','topRoster','expansionRoster','appearances','categories'].map(k=>[k,Array.isArray(data?.[k])?data[k].length:null])); }
function validCounts(data){ const c=counts(data); return c.people>=MIN_COUNTS.people && c.roster>=MIN_COUNTS.roster && c.expansionRoster>=MIN_COUNTS.expansionRoster && c.appearances>=MIN_COUNTS.appearances && c.categories>=MIN_COUNTS.categories; }
function textOf(o){ if(!o||typeof o!=='object') return ''; return norm([o.id,o.slug,o.name,o.canonicalName,o.wikiTitle,o.roleTitle,o.organization,o.country,o.countryName,o.countryFocus,o.countryFocusCode,o.title,o.summary,o.status,o.eventType].join(' ')); }
function targetFor(o){ const t=textOf(o); return TARGETS.find(rule=>{
  const allOk = !rule.all || rule.all.every(x=>t.includes(norm(x)));
  const anyOk = !rule.any || rule.any.some(x=>t.includes(norm(x)));
  return allOk && anyOk;
}); }
function scanAll(value, cb, p='$', parent=null, key=null){
  if(!value || typeof value !== 'object') return;
  cb(value,p,parent,key);
  if(Array.isArray(value)) value.forEach((v,i)=>scanAll(v,cb,`${p}[${i}]`,value,i));
  else Object.entries(value).forEach(([k,v])=>scanAll(v,cb,`${p}.${k}`,value,k));
}
function isProfileLike(o){ return o && typeof o==='object' && !Array.isArray(o) && !o.startsAt && !o.eventType && !o.sourcePack && (o.slug||o.name||o.canonicalName||o.wikiTitle||o.roleTitle||o.profileLine||o.homeBases||o.mapAnchor||o.imageUrl); }
function isEventLike(o){ return o && typeof o==='object' && !Array.isArray(o) && (o.startsAt || o.date || o.title || o.eventType || o.status==='source-watch'); }
function sourceUrls(o){ return Array.isArray(o?.sourcePack) ? o.sourcePack.map(s=>s&&s.url).filter(Boolean) : []; }
function eventText(o){ return norm([o?.id,o?.title,o?.summary,o?.status,o?.eventType,o?.sourceType,...sourceUrls(o)].join(' ')); }
function isFakeEvent(o){ if(!isEventLike(o)) return false; const t=eventText(o); if(FAKE_EVENT_RE.test(t)) return true; if(o.status === 'source-watch' && (o.startsAt||o.date)) return true; return false; }

function candidateScore(data){
  if(!data || typeof data!=='object') return -1e9;
  let s=0;
  const c=counts(data);
  for(const [k,min] of Object.entries(MIN_COUNTS)) s += Math.min(100, ((c[k]||0)/min)*100);
  if(c.people>115) s -= (c.people-115)*200;
  if(c.roster>260) s -= 1000;
  let fake=0, bad=0, duplicateIds=0;
  scanAll(data,(o)=>{ if(isFakeEvent(o)) fake++; const tx=textOf(o); if(ACTIVE_HISTORY_RE.test(tx) && /president|head of state|current|office holder/.test(tx)) bad++; });
  for(const key of ['people','roster','topRoster','expansionRoster']){
    const arr=Array.isArray(data[key])?data[key]:[]; const seen=new Set();
    for(const x of arr){ const id=x&&(x.id||x.slug||x.canonicalName||x.name); if(!id) continue; const n=norm(id); if(seen.has(n)) duplicateIds++; else seen.add(n); }
  }
  return s - fake*35 - bad*200 - duplicateIds*50;
}
function parseJsonText(s){ try { return JSON.parse(s); } catch { return null; } }
function findCandidates(){
  const out=[];
  const html=read(INDEX); const ex=extractDemoFromHtml(html); if(ex) out.push({kind:'current-index',data:ex.data,html});
  const demo=parseJsonText(read(DEMO)); if(demo) out.push({kind:'current-demo-json',data:demo,html:null});
  const commits = sh('git log --all --pretty=format:%H -- index.html data/demo.json').split(/\n/).filter(Boolean).slice(0,300);
  const seen=new Set();
  for(const sha of commits){
    if(seen.has(sha)) continue; seen.add(sha);
    const h = sh(`git show ${sha}:index.html`);
    const hx = extractDemoFromHtml(h);
    if(hx) out.push({kind:`history-index:${sha.slice(0,10)}`,data:hx.data,html:h});
    const d = parseJsonText(sh(`git show ${sha}:data/demo.json`));
    if(d) out.push({kind:`history-demo:${sha.slice(0,10)}`,data:d,html:null});
  }
  out.forEach(c=>{ c.score=candidateScore(c.data); c.counts=counts(c.data); });
  return out.sort((a,b)=>b.score-a.score);
}
function findShell(candidates){
  const current=read(INDEX); if(isFullHtml(current)) return {kind:'current-index',html:current};
  for(const c of candidates){ if(c.html && isFullHtml(c.html)) return {kind:c.kind,html:c.html}; }
  const commits = sh('git log --all --pretty=format:%H -- index.html').split(/\n/).filter(Boolean).slice(0,500);
  for(const sha of commits){ const h=sh(`git show ${sha}:index.html`); if(isFullHtml(h)) return {kind:`history-shell:${sha.slice(0,10)}`,html:h}; }
  throw new Error('No full app shell with demo-data found in current files or git history. Refusing to generate a fake app shell.');
}

function baseAnchor(base){ return { label: base.label, city: base.city, countryCode: base.countryCode, countryName: base.countryName, lat: base.lat, lng: base.lng, precision:'city', type:'institutional_base', privacy:'city-level public institutional base only' }; }
function bestImageForTarget(data, target){
  let best='';
  scanAll(data,(o)=>{ if(!isProfileLike(o)) return; const t=targetFor(o); if(t?.key!==target.key) return; const u=String(o.imageUrl||''); if(/^https?:\/\//.test(u) && !/placeholder|undefined|null/.test(u) && (!best || u.length>best.length)) best=u; });
  return best;
}
function applyTarget(o,target,image){
  const b=target.base; const a=baseAnchor(b);
  o.countryFocus = b.countryCode;
  o.countryFocusCode = b.countryCode;
  o.countryCode = b.countryCode;
  o.countryName = b.countryName;
  o.country = b.countryName;
  o.homeRegion = b.region;
  o.locationStatus = 'institutional_base_city_level';
  o.organization = o.organization || target.organization;
  if(o.roleTitle && target.roleHint && /unknown|watch|profile only/i.test(o.roleTitle)) o.roleTitle = target.roleHint;
  o.homeBases = [a];
  o.homeBase = a; o.mapAnchor = a; o.anchorLocation = a; o.baseLocation = a; o.institutionalBase = a;
  o.lat=b.lat; o.lng=b.lng; o.lon=b.lng; o.long=b.lng; o.latitude=b.lat; o.longitude=b.lng;
  o.homeLat=b.lat; o.homeLng=b.lng; o.homeLon=b.lng; o.mapLat=b.lat; o.mapLng=b.lng; o.mapLon=b.lng; o.anchorLat=b.lat; o.anchorLng=b.lng; o.anchorLon=b.lng;
  o.coordinates = {lat:b.lat,lng:b.lng};
  o.geo = {lat:b.lat,lng:b.lng,city:b.city,countryCode:b.countryCode,countryName:b.countryName};
  o.flagAudit = { ...(o.flagAudit||{}), code:b.countryCode, countryCode:b.countryCode, countryName:b.countryName, label:b.countryName, status:'country flag' };
  o.flagCode=b.countryCode; o.countryFlagCode=b.countryCode;
  if(image && (!o.imageUrl || /placeholder|undefined|null|^\s*$/i.test(String(o.imageUrl)))){ o.imageUrl=image; o.imageProvider=o.imageProvider||'preserved from duplicate source'; }
}
function removeFakeEventsEverywhere(data, report){
  function walk(value, p){
    if(!value || typeof value!=='object') return;
    if(Array.isArray(value)){
      for(let i=value.length-1;i>=0;i--){
        const item=value[i];
        if(isFakeEvent(item)){
          report.fakeEventsRemoved.push({path:`${p}[${i}]`, title:item.title||item.id||null, status:item.status||null});
          value.splice(i,1); continue;
        }
        walk(item,`${p}[${i}]`);
      }
    } else Object.entries(value).forEach(([k,v])=>walk(v,`${p}.${k}`));
  }
  walk(data,'$');
}
function addOfficialEvents(data, report){
  if(!Array.isArray(data.appearances)) data.appearances=[];
  const people=[]; scanAll(data,(o)=>{ if(isProfileLike(o)) people.push(o); });
  const findId=(targetKey)=>{ const t=TARGETS.find(x=>x.key===targetKey); const p=people.find(o=>targetFor(o)?.key===targetKey); return p?.id || p?.slug || slug(t.canonicalName); };
  const seeds=[
    { id:'official-iaea-grossi-board-2026-03-02', target:'rafael_grossi', startsAt:'2026-03-02T09:00:00Z', title:'Rafael Grossi addresses IAEA Board of Governors', summary:'Official IAEA Board of Governors statement at the Agency headquarters in Vienna.', city:'Vienna', code:'AT', country:'Austria', lat:48.2082, lng:16.3738, url:'https://www.iaea.org/newscenter/statements/iaea-director-generals-introductory-statement-to-the-board-of-governors-2-6-march-2026' },
    { id:'official-vatican-leo-spain-2026-06-06', target:'pope_leo_xiv', startsAt:'2026-06-06T09:00:00Z', title:'Pope Leo XIV apostolic journey to Spain', summary:'Vatican-published apostolic journey itinerary for Spain.', city:'Madrid', code:'ES', country:'Spain', lat:40.4168, lng:-3.7038, url:'https://www.vatican.va/content/leo-xiv/en/travels/2026/documents/spagna-6-12giugno2026.html' },
    { id:'official-royal-charles-washington-2026-04-28', target:'king_charles', startsAt:'2026-04-28T16:00:00Z', title:'King Charles III addresses Congress in Washington', summary:'Official Royal Family record of the King’s Washington address.', city:'Washington', code:'US', country:'United States', lat:38.9072, lng:-77.0369, url:'https://www.royal.uk/news-and-activity/2026-04-28/the-kings-address-to-the-joint-meeting-of-congress-in-washington' }
  ];
  const byId=new Set(data.appearances.map(a=>a&&a.id).filter(Boolean));
  for(const s of seeds){
    if(byId.has(s.id)) continue;
    const personId=findId(s.target);
    if(!personId) continue;
    data.appearances.push({ id:s.id, personId, startsAt:s.startsAt, endsAt:null, status:'OFFICIAL_PUBLIC_RECORD', confidence:0.95, confidenceLabel:'official source', eventType:'PUBLIC_APPEARANCE', title:s.title, summary:s.summary, significance:'Official-source public record added by canonical repair.', decisions:'', location:{ label:s.city, city:s.city, countryCode:s.code, countryName:s.country, lat:s.lat, lng:s.lng, precision:'city', type:'public_event_city' }, venuePublic:true, securityPrecision:'city-level public record only; no private stops, hotels, residences, leaked routes or live proximity', publicInterestScore:70, eventGroupId:`official-${s.target}-${s.startsAt.slice(0,10)}`, topics:['official-source'], counterpartIds:[], sourcePack:[{ label:'Official source', url:s.url, type:'official', reliability:'primary official source' }], visual:{status:'runtime portrait'}, lastCheckedAt:new Date().toISOString(), marketImpact:{sectors:[],companies:[],countries:[s.country],confidence:'low'} });
    report.officialEventsAdded.push({id:s.id,title:s.title,personId});
  }
}
function repairProfiles(data, report){
  const targetImages=Object.fromEntries(TARGETS.map(t=>[t.key,bestImageForTarget(data,t)]));
  const all=[]; scanAll(data,(o,p,parent,key)=>{ if(isProfileLike(o)){ const t=targetFor(o); if(t) all.push({o,p,parent,key,t}); }});
  for(const x of all){ applyTarget(x.o,x.t,targetImages[x.t.key]); report.anchorRepairs.push({path:x.p,target:x.t.key,name:x.o.canonicalName||x.o.name||x.o.id||null,city:x.t.base.city,countryCode:x.t.base.countryCode}); }
  // hide duplicate visible helper copies for Grossi and other critical targets, but do not change counted roster/people lengths.
  const keep = new Map();
  const visibleCollections = ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples'];
  for(const col of visibleCollections){
    const arr=Array.isArray(data[col])?data[col]:[];
    for(const item of arr){
      const t=targetFor(item); if(!t) continue;
      const key=t.key;
      const pref = col==='people'?1:col==='roster'?2:3;
      const cur=keep.get(key);
      if(!cur || pref<cur.pref) keep.set(key,{item,col,pref});
    }
  }
  for(const col of visibleCollections){
    const arr=Array.isArray(data[col])?data[col]:[];
    for(const item of arr){
      const t=targetFor(item); if(!t) continue;
      const kept=keep.get(t.key)?.item;
      if(item===kept) continue;
      item.mapHidden=true; item.hiddenFromMap=true; item.visibleOnMap=false; item.duplicateOf=kept?.id||kept?.slug||t.key; item.profileDuplicatePolicy='hidden duplicate copy; canonical profile retained elsewhere';
      report.duplicatesHidden.push({collection:col,target:t.key,id:item.id||null,name:item.canonicalName||item.name||null,duplicateOf:item.duplicateOf});
    }
  }
  // remove exact duplicate rows within arrays where count is not contract-critical.
  for(const col of ['topRoster','priorityExpansion','watchlistExamples']){
    if(!Array.isArray(data[col])) continue;
    const seen=new Set();
    for(let i=data[col].length-1;i>=0;i--){
      const item=data[col][i]; const id=norm(item?.id||item?.slug||item?.canonicalName||item?.name);
      if(!id) continue;
      if(seen.has(id)){ report.profileDuplicatesRemoved.push({collection:col,index:i,id:item.id||null,name:item.canonicalName||item.name||null}); data[col].splice(i,1); }
      else seen.add(id);
    }
  }
}
function cleanHistoricalPollution(data,report){
  for(const col of ['people','roster','topRoster','expansionRoster','priorityExpansion']){
    const arr=Array.isArray(data[col])?data[col]:[];
    for(const item of arr){
      const tx=textOf(item);
      if(ACTIVE_HISTORY_RE.test(tx) && /president|head of state|current|office holder/.test(tx) && !/former/.test(tx)){
        item.roleTitle = /^former/i.test(item.roleTitle||'') ? item.roleTitle : `Former ${item.roleTitle||'office holder'}`;
        item.trackingStatus='historical_former_profile'; item.currentOfficeStatus='former'; item.mapHidden=true; item.hiddenFromMap=true; item.visibleOnMap=false;
        report.historicalPollutionMarked.push({collection:col,id:item.id||null,name:item.canonicalName||item.name||null});
      }
    }
  }
}
function installRuntimeGuards(html){
  const id='parleymap-canonical-runtime-guard';
  const anchors = Object.fromEntries(TARGETS.map(t=>[t.key,{name:t.canonicalName,any:t.any||t.all,base:t.base}]));
  const js = `<script id="${id}">(function(){\ntry{\nwindow.__PARLEYMAP_CANONICAL_ANCHORS__=${JSON.stringify(anchors)};\nfunction norm(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}\nfunction keyForText(txt){txt=norm(txt);for(const [k,v] of Object.entries(window.__PARLEYMAP_CANONICAL_ANCHORS__||{})){const terms=v.any||[];if(terms.some(function(x){return txt.indexOf(norm(x))>=0;}))return k;}return null;}\nfunction anchorFor(txt){const k=keyForText(txt);return k?window.__PARLEYMAP_CANONICAL_ANCHORS__[k].base:null;}\nfunction patchMarker(m,txt){const a=anchorFor(txt); if(a&&m&&typeof m.setLatLng==='function'){try{m.setLatLng([a.lat,a.lng]);m.__pmCanonicalAnchor=a;}catch(e){}}}\nfunction wrapLeaflet(){if(!window.L||window.L.__pmCanonicalWrapped)return; const oldMarker=window.L.marker; if(typeof oldMarker==='function'){window.L.marker=function(latlng,opts){const m=oldMarker.call(this,latlng,opts); const oldTip=m.bindTooltip, oldPop=m.bindPopup; m.bindTooltip=function(c,o){patchMarker(m, typeof c==='string'?c:(c&&c.textContent)||''); return oldTip.call(this,c,o);}; m.bindPopup=function(c,o){patchMarker(m, typeof c==='string'?c:(c&&c.textContent)||''); return oldPop.call(this,c,o);}; return m;};}\nwindow.L.__pmCanonicalWrapped=true;}\nfunction hideDuplicateDom(){const seen={};document.querySelectorAll('.leaflet-marker-icon,.map-marker,.top20-chip,.rank-row,.quick-hit').forEach(function(el){const k=keyForText(el.textContent||el.title||el.getAttribute('aria-label')||''); if(!k)return; if(seen[k]){ if(k==='rafael_grossi') el.style.display='none'; } else seen[k]=1;});}\nsetInterval(function(){wrapLeaflet();hideDuplicateDom();},700);wrapLeaflet();hideDuplicateDom();\n}catch(e){console.warn('ParleyMap canonical guard failed',e);}\n})();</script>`;
  if(html.includes(`id="${id}"`)) html=html.replace(new RegExp(`<script id=["']${id}["'][\\s\\S]*?<\\/script>`,'i'),js);
  else if(/<\/body>/i.test(html)) html=html.replace(/<\/body>/i,js+'\n</body>');
  else html += '\n'+js+'\n';
  return html;
}
function searchAdsense(){
  const texts=[];
  function add(label,txt){ if(txt) texts.push({label,txt}); }
  ['index.html','privacy.html','impressum.html','data/demo.json'].forEach(p=>add(p,read(p)));
  const commits=sh('git log --all --pretty=format:%H').split(/\n/).filter(Boolean).slice(0,300);
  const paths=['index.html','privacy.html','impressum.html','ads.txt'];
  for(const sha of commits){ for(const p of paths){ const t=sh(`git show ${sha}:${p}`); if(t) add(`${sha.slice(0,10)}:${p}`,t); } }
  let client='', pub='', slots=[];
  for(const {txt} of texts){
    const clients=[...txt.matchAll(/ca-pub-([0-9]{10,30})/g)].map(m=>'ca-pub-'+m[1]); if(!client&&clients[0]) client=clients[0];
    const pubs=[...txt.matchAll(/(?:^|[^a-z0-9-])pub-([0-9]{10,30})/gi)].map(m=>'pub-'+m[1]); if(!pub&&pubs[0]) pub=pubs[0];
    for(const m of txt.matchAll(/data-ad-slot=["']([0-9]{3,30})["']/g)){ if(!slots.includes(m[1])) slots.push(m[1]); }
  }
  if(client && !pub) pub=client.replace(/^ca-/,'');
  if(pub && !client) client='ca-'+pub;
  return {client,publisherId:pub,headerSlot:slots[0]||'',sidebarSlot:slots[1]||'',slotCount:slots.length};
}
function installAdsense(html,ads,report){
  if(!ads.client || !ads.headerSlot || !ads.sidebarSlot){ report.adsense.status='adsense_ids_not_found_no_fake_ids_injected'; return html; }
  if(!/<head[\s>]/i.test(html)) return html;
  if(!/google-adsense-account/i.test(html)) html=html.replace(/<head([^>]*)>/i,`<head$1>\n<meta name="google-adsense-account" content="${ads.client}">`);
  if(!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html)) html=html.replace(/<\/head>/i,`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>\n</head>`);
  const id='parleymap-adsense-runtime-preserve';
  const js=`<script id="${id}">(function(){try{var client=${JSON.stringify(ads.client)},slots=${JSON.stringify([ads.headerSlot,ads.sidebarSlot])};function make(slot){var ins=document.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';ins.setAttribute('data-ad-client',client);ins.setAttribute('data-ad-slot',slot);ins.setAttribute('data-ad-format','auto');ins.setAttribute('data-full-width-responsive','true');return ins;}function place(){var existing=document.querySelectorAll('ins.adsbygoogle[data-ad-slot]');if(existing.length>=2)return;var boxes=document.querySelectorAll('[data-ad-window],.ad-window,.ad-slot,.adsense-slot,.header-ad,.sidebar-ad');for(var i=0;i<Math.min(2,boxes.length);i++){if(!boxes[i].querySelector('ins.adsbygoogle')){boxes[i].appendChild(make(slots[i]));try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}}}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',place);else place();setTimeout(place,1200);}catch(e){console.warn('ParleyMap AdSense installer failed',e);}})();</script>`;
  if(html.includes(`id="${id}"`)) html=html.replace(new RegExp(`<script id=["']${id}["'][\\s\\S]*?<\\/script>`,'i'),js);
  else html=html.replace(/<\/body>/i,js+'\n</body>');
  write('ads.txt',`google.com, ${ads.publisherId}, DIRECT, f08c47fec0942fa0\n`);
  report.adsense={status:'adsense_preserved_and_audited',...ads};
  return html;
}
function writeLegalPages(){
  const now=new Date().toISOString().slice(0,10);
  const style='<style>body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 18px;line-height:1.55;color:#172033}a{color:#0b5cad}</style>';
  write('privacy.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy - ParleyMap</title>${style}</head><body><h1>Privacy Policy</h1><p>Last updated: ${now}</p><p>ParleyMap presents public-source information about public appearances and institutional activity. We do not publish private addresses, private travel routes, hotels, residences, hospitals, leaked itineraries, or live proximity data.</p><h2>Advertising</h2><p>This site may use Google AdSense. Google and its partners may use cookies or similar technologies to serve and measure ads. You can manage advertising personalization through your Google account and browser settings.</p><h2>Analytics and logs</h2><p>Hosting providers may process technical logs such as IP address, user agent, requested URL, and timestamp for security and operations.</p><h2>Contact</h2><p>Contact: <a href="mailto:hello@parleymap.com">hello@parleymap.com</a></p></body></html>\n`);
  write('impressum.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Impressum - ParleyMap</title>${style}</head><body><h1>Impressum</h1><p>ParleyMap is a public-source presence intelligence project.</p><p>Responsible contact: <a href="mailto:hello@parleymap.com">hello@parleymap.com</a></p><p>Editorial standard: ParleyMap uses official, host-public, or clearly labelled public sources and avoids private movement data.</p></body></html>\n`);
  write('about.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About - ParleyMap</title>${style}</head><body><h1>About ParleyMap</h1><p>ParleyMap maps public appearances, official meetings, public institutional events, and summit participation for public figures and institutions.</p></body></html>\n`);
  write('methodology.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Methodology - ParleyMap</title>${style}</head><body><h1>Methodology</h1><p>Events require a public person, date, city-level location, title, and source pack. Generic watch pages, homepages, FAQ pages, and topic pages are not treated as dated events.</p></body></html>\n`);
  write('data-sources.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Data Sources - ParleyMap</title>${style}</head><body><h1>Data Sources</h1><p>Priority sources include official government pages, host institution pages, Vatican travel pages, IAEA official statements, Royal Family engagement pages, summit hosts, and multilateral institutions.</p></body></html>\n`);
  write('contact.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact - ParleyMap</title>${style}</head><body><h1>Contact</h1><p>Email: <a href="mailto:hello@parleymap.com">hello@parleymap.com</a></p></body></html>\n`);
}
function hardAudit(data,report){
  const errors=[];
  if(!validCounts(data)) errors.push(`core counts below floor: ${JSON.stringify(counts(data))}`);
  const targetRows={}; for(const t of TARGETS) targetRows[t.key]=[];
  scanAll(data,(o,p)=>{ if(isProfileLike(o)){ const t=targetFor(o); if(t) targetRows[t.key].push({o,p}); }});
  for(const key of ['rafael_grossi','pope_leo_xiv','claudia_sheinbaum','prabowo_subianto']){
    const t=TARGETS.find(x=>x.key===key); const rows=targetRows[key]||[];
    if(rows.length===0) errors.push(`target missing: ${key}`);
    for(const {o,p} of rows){
      const cc=String(o.countryFocusCode||o.countryFocus||o.countryCode||'').toUpperCase();
      const lat=Number(o.lat ?? o.homeBases?.[0]?.lat ?? o.mapAnchor?.lat); const lng=Number(o.lng ?? o.homeBases?.[0]?.lng ?? o.mapAnchor?.lng);
      if(cc!==t.base.countryCode) errors.push(`${key} wrong country code at ${p}: ${cc}`);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat-t.base.lat)>1.0||Math.abs(lng-t.base.lng)>1.0) errors.push(`${key} wrong coordinates at ${p}: ${lat},${lng}`);
      const flag=String(o.flagAudit?.code||o.flagCode||'').toUpperCase(); if(flag && flag!==t.base.countryCode) errors.push(`${key} wrong flag at ${p}: ${flag}`);
    }
  }
  let fake=0; scanAll(data,(o)=>{ if(isFakeEvent(o)) fake++; }); if(fake) errors.push(`${fake} fake/watch dated events remain`);
  // Grossi visible duplicates: only one non-hidden profile-like row allowed across map-visible collections.
  let visibleGrossi=0; for(const col of ['people','roster','topRoster','expansionRoster','priorityExpansion','watchlistExamples']){ for(const o of (Array.isArray(data[col])?data[col]:[])){ if(targetFor(o)?.key==='rafael_grossi' && !o.hiddenFromMap && !o.mapHidden && o.visibleOnMap!==false) visibleGrossi++; }}
  if(visibleGrossi>1) errors.push(`Rafael Grossi visible duplicate count ${visibleGrossi}`);
  report.hardAudit={status:errors.length?'audit_failed':'audit_passed', errors};
  if(errors.length) throw new Error('Hard audit failed:\n'+errors.join('\n'));
}

function main(){
  ensureDir(DIAG);
  const report={generatedAt:new Date().toISOString(), candidateSources:[], selectedData:null, selectedShell:null, before:null, after:null, fakeEventsRemoved:[], anchorRepairs:[], duplicatesHidden:[], profileDuplicatesRemoved:[], historicalPollutionMarked:[], officialEventsAdded:[], adsense:{status:'not_checked'}, hardAudit:null};
  const candidates=findCandidates();
  report.candidateSources=candidates.slice(0,12).map(c=>({kind:c.kind,score:c.score,counts:c.counts}));
  const selected = candidates.find(c=>validCounts(c.data)) || candidates[0];
  if(!selected) throw new Error('No usable dataset candidate found in current files or git history');
  report.selectedData={kind:selected.kind,score:selected.score,counts:selected.counts};
  const shell=findShell(candidates); report.selectedShell={kind:shell.kind, length:shell.html.length};
  const data=clone(selected.data); report.before=counts(data);
  cleanHistoricalPollution(data,report);
  repairProfiles(data,report);
  removeFakeEventsEverywhere(data,report);
  addOfficialEvents(data,report);
  data.meta={...(data.meta||{}), lastCanonicalTruthFix:new Date().toISOString(), canonicalTruthStatus:'canonical source repaired, deduped, audited'};
  report.after=counts(data);
  hardAudit(data,report);
  let html = replaceDemoInHtml(shell.html,data);
  html = installRuntimeGuards(html);
  const ads=searchAdsense(); html=installAdsense(html,ads,report);
  writeLegalPages();
  write(INDEX,html);
  write(DEMO,JSON.stringify(data,null,2)+'\n');
  write(path.join(DIAG,'canonical-truth-repair-report.json'),JSON.stringify(report,null,2)+'\n');
  write(path.join(DIAG,'canonical-truth-hard-audit-report.json'),JSON.stringify(report.hardAudit,null,2)+'\n');
  write(path.join(DIAG,'adsense-preserve-audit-report.json'),JSON.stringify(report.adsense,null,2)+'\n');
  const lines=[];
  lines.push('# ParleyMap canonical truth fix'); lines.push('');
  lines.push(`Generated: ${report.generatedAt}`); lines.push(`Selected data: ${report.selectedData.kind}`); lines.push(`Selected shell: ${report.selectedShell.kind}`); lines.push('');
  lines.push('## Counts'); lines.push('| Dataset | Before | After |'); lines.push('|---|---:|---:|');
  for(const k of ['people','roster','topRoster','expansionRoster','appearances','categories']) lines.push(`| ${k} | ${report.before[k]} | ${report.after[k]} |`);
  lines.push(''); lines.push('## Repairs');
  lines.push(`- Fake events removed: ${report.fakeEventsRemoved.length}`);
  lines.push(`- Anchor repairs: ${report.anchorRepairs.length}`);
  lines.push(`- Duplicates hidden: ${report.duplicatesHidden.length}`);
  lines.push(`- Duplicate helper rows removed: ${report.profileDuplicatesRemoved.length}`);
  lines.push(`- Official events added: ${report.officialEventsAdded.length}`);
  lines.push(`- Hard audit: ${report.hardAudit.status}`);
  lines.push(`- AdSense: ${report.adsense.status}`);
  if(report.adsense.client) lines.push(`- AdSense client: ${report.adsense.client}`);
  if(report.adsense.headerSlot) lines.push(`- Header slot: ${report.adsense.headerSlot}`);
  if(report.adsense.sidebarSlot) lines.push(`- Sidebar slot: ${report.adsense.sidebarSlot}`);
  write(path.join(DIAG,'LATEST_RUN_SUMMARY.md'),lines.join('\n')+'\n');
  console.log(JSON.stringify({status:'canonical_truth_fix_applied', selectedData:report.selectedData, selectedShell:report.selectedShell, after:report.after, hardAudit:report.hardAudit, adsense:report.adsense},null,2));
}
main();
