from pathlib import Path
import re, json, shutil, os
root = Path('/mnt/data/parleymap-v4.9-work')
app_path = root/'src/app.js'
css_path = root/'src/styles.css'
pkg_path = root/'package.json'
app = app_path.read_text()

def replace_between(text, start_pat, end_pat, replacement, occurrence='first'):
    starts = [m.start() for m in re.finditer(re.escape(start_pat), text)]
    if not starts:
        raise SystemExit(f'start not found: {start_pat}')
    start = starts[-1] if occurrence == 'last' else starts[0]
    end = text.find(end_pat, start)
    if end == -1:
        raise SystemExit(f'end not found after {start}: {end_pat}')
    return text[:start] + replacement + text[end:]

render_event_overlap = r'''  function renderEventOverlapMatrix() {
    if (!els.eventOverlapMatrix) return;
    const families = eventFamilies().filter((f)=>!/^Federal Reserve FOMC/i.test(f.name)).slice(0, 16);
    const familyPeople = families.map((f) => {
      const hit = familyHits(f);
      return { family: f, hit, peopleSet: new Set(hit.people.map((p)=>p.id)) };
    });
    const pairs = [];
    for (let i = 0; i < familyPeople.length; i++) for (let j = i + 1; j < familyPeople.length; j++) {
      const a = familyPeople[i], b = familyPeople[j];
      const shared = [...a.peopleSet].filter((id) => b.peopleSet.has(id));
      const denom = Math.max(1, Math.min(a.peopleSet.size || 1, b.peopleSet.size || 1));
      const pct = Math.round(shared.length / denom * 100);
      if (pct > 0) pairs.push({ a, b, shared, pct });
    }
    const clusters = pairs.sort((x,y)=>y.pct-x.pct || y.shared.length-x.shared.length).slice(0, 8).map((p)=>{
      const names = p.shared.slice(0,5).map((id)=>peopleById.get(id)?.canonicalName).filter(Boolean).join(', ');
      return `<button type="button" class="matrix-cluster-v50 ${p.pct >= 70 ? 'hot' : p.pct >= 35 ? 'warm' : 'cool'}" data-matrix-event="${esc(p.a.family.name)}" data-hover-title="${esc(p.a.family.name + ' ↔ ' + p.b.family.name)}" data-hover-detail="${esc(p.pct + '% overlap · ' + p.shared.length + ' people')}" data-hover-body="${esc(names || 'Shared names appear here once the live source graph expands.')}"><span>${esc(shortEventLabel(p.a.family.name))}</span><b>↔</b><span>${esc(shortEventLabel(p.b.family.name))}</span><strong>${p.pct}</strong></button>`;
    }).join('');
    const n = familyPeople.length;
    const header = `<div class="matrix-corner">Event family</div>` + familyPeople.map((x)=>`<button type="button" class="matrix-axis top" data-matrix-event="${esc(x.family.name)}" title="${esc(x.family.name)}">${esc(shortEventLabel(x.family.name))}</button>`).join('');
    const rows = familyPeople.map((row, i) => {
      const cells = familyPeople.map((col, j) => {
        const shared = i === j ? row.peopleSet.size : [...row.peopleSet].filter((id)=>col.peopleSet.has(id)).length;
        const pct = i === j ? 100 : Math.round(shared / Math.max(1, Math.min(row.peopleSet.size || 1, col.peopleSet.size || 1)) * 100);
        const sharedNames = i === j ? row.hit.people.slice(0,5).map((p)=>p.canonicalName).join(', ') : [...row.peopleSet].filter((id)=>col.peopleSet.has(id)).slice(0,5).map((id)=>peopleById.get(id)?.canonicalName).filter(Boolean).join(', ');
        return `<button type="button" class="matrix-cell-v50 ${i===j ? 'self' : ''} ${pct>=70?'hot':pct>=35?'warm':pct>0?'cool':'empty'}" style="--heat:${pct}" data-matrix-event="${esc(row.family.name)}" data-hover-title="${esc(row.family.name + ' / ' + col.family.name)}" data-hover-detail="${esc(pct + '% · ' + shared + ' shared names')}" data-hover-body="${esc(sharedNames || 'No shared named people in this static build.')}"><strong>${pct}</strong><small>${shared}</small></button>`;
      }).join('');
      return `<button type="button" class="matrix-axis side" data-matrix-event="${esc(row.family.name)}" title="${esc(row.family.name)}">${esc(shortEventLabel(row.family.name))}</button>${cells}`;
    }).join('');
    els.eventOverlapMatrix.innerHTML = `<div class="matrix-intro-v50"><strong>Shared-attendee overlap</strong><span>Read this like a correlation map. The left axis is restored; brighter cells mean two event systems keep drawing the same named people. Click any row or cell to open that layer on the map.</span></div><div class="matrix-clusters-v50">${clusters}</div><div class="matrix-grid-v50" style="--n:${n}">${header}${rows}</div>`;
    qsAll('[data-matrix-event]', els.eventOverlapMatrix).forEach((b) => b.addEventListener('click', () => focusNetwork(b.dataset.matrixEvent)));
  }

'''
app = replace_between(app, '  function renderEventOverlapMatrix() {', '  function shortEventLabel', render_event_overlap, 'first')

render_org_penetration = r'''  function renderOrganizationPenetration() {
    if (!els.orgPenetration) return;
    const rows = orgPenetrationRowsV48();
    const topRooms = eventFamilies().slice(0,18).map((fam)=>({fam, count:rows.reduce((sum,row)=>sum + (row.eventCounts.find((x)=>x.fam.name===fam.name)?.records || 0),0)})).sort((a,b)=>b.count-a.count).slice(0,7);
    const totalRecords = rows.reduce((s,r)=>s+r.records.length,0);
    const topOrg = rows[0];
    const statStrip = `<div class="pen-v50-summary"><article><strong>${rows.length}</strong><span>organisations ranked</span></article><article><strong>${totalRecords}</strong><span>named records</span></article><article><strong>${esc(topRooms[0]?.fam.name || 'Davos')}</strong><span>busiest event room</span></article><article class="wide"><b>What this shows</b><p>Where institutions repeatedly surface in source-backed event systems. Gold chips are confirmed named records; blue chips are recurring watch venues that still need a named attendee before publication.</p></article></div>`;
    const roomBar = `<div class="pen-v50-roombar">${topRooms.map((x)=>`<button type="button" data-network-name="${esc(x.fam.name)}"><span>${esc(shortEventLabel(x.fam.name))}</span><b>${x.count}</b></button>`).join('')}</div>`;
    const cards = rows.slice(0, 12).map((row,idx)=>{
      const chips = row.eventCounts.filter((x)=>x.records || x.agendas).sort((a,b)=>(b.records+b.agendas)-(a.records+a.agendas)).slice(0,7).map((x)=>`<button type="button" class="pen-chip-v50 ${x.records?'hit':'watch'}" data-network-name="${esc(x.fam.name)}">${x.records?'✓':'○'} ${esc(shortEventLabel(x.fam.name))}<b>${x.records || x.agendas}</b></button>`).join('');
      const strongest = row.eventCounts.filter((x)=>x.records).sort((a,b)=>b.records-a.records).slice(0,3).map((x)=>x.fam.name);
      const summary = `${row.org.name} is most visible in ${strongest.join(', ') || 'the watchlist'}; the useful signal is repeated named presence, not a single logo sighting.`;
      const reps = row.reps.slice(0,4).map((p)=>`<button type="button" class="pen-person-v50" data-roster-id="${esc(rosterForPerson(p)?.id || '')}">${miniFaceName(p,{meta:p.roleTitle})}</button>`).join('');
      return `<article class="pen-card-v50" data-org-name="${esc(row.org.name)}" data-hover-title="${esc(row.org.name)}" data-hover-detail="${esc(row.confirmed + ' event systems · ' + row.records.length + ' records')}" data-hover-body="${esc(summary)}"><header><span class="org-mark">${esc((row.org.mark || row.org.name.slice(0,2)).toUpperCase())}</span><span><strong>${idx+1}. ${esc(row.org.name)}</strong><em>${esc(row.org.type || 'organisation')}</em></span><b>${row.confirmed}</b></header><p>${esc(summary)}</p><div class="pen-chip-wrap-v50">${chips}</div><div class="pen-people-v50">${reps}</div></article>`;
    }).join('');
    els.orgPenetration.innerHTML = `${statStrip}${roomBar}<div class="pen-board-v50">${cards}</div>`;
    qsAll('[data-org-name]', els.orgPenetration).forEach((b)=>b.addEventListener('click',()=>focusOrganization(b.dataset.orgName)));
    qsAll('[data-network-name]', els.orgPenetration).forEach((b)=>b.addEventListener('click',(ev)=>{ev.stopPropagation(); focusNetwork(b.dataset.networkName);}));
    qsAll('[data-roster-id]', els.orgPenetration).forEach((b)=>b.addEventListener('click',(ev)=>{ev.stopPropagation(); b.dataset.rosterId && selectRoster(b.dataset.rosterId);}));
    schedulePortraitHydration();
  }

'''
app = replace_between(app, '  function renderOrganizationPenetration() {', '  function renderInfluenceTimeline', render_org_penetration, 'last')

render_influence_timeline = r'''  function renderInfluenceTimeline() {
    if (!els.influenceTimeline) return;
    const items = uniqueAgendas(eventAgendas)
      .filter((a)=>Number.isFinite(new Date(a.startsAt).getTime()))
      .sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt))
      .slice(0, 72);
    const months = Array.from({length:12},(_,i)=>({index:i,label:new Date(2026,i,1).toLocaleString('en-GB',{month:'short'}),items:[]}));
    items.forEach((a)=>{ const d=new Date(a.startsAt); if (months[d.getMonth()]) months[d.getMonth()].items.push(a); });
    const totalPeople = new Set(items.flatMap((a)=>a.participantNames||[])).size;
    const cityCount = new Set(items.map((a)=>a.location?.city).filter(Boolean)).size;
    const headline = `<div class="timeline-v50-head"><strong>Annual influence rhythm</strong><p>Each month shows the public rooms that matter. Click an event to put the named people on the map; the board expands as the crawler adds new speaker lists, agendas and readouts.</p><span><b>${items.length}</b> event windows</span><span><b>${totalPeople}</b> named people</span><span><b>${cityCount}</b> cities</span></div>`;
    const board = months.map((m)=>{
      const first = m.items.slice(0,5).map((a)=>{
        const loc = a.location || {}; const d = new Date(a.startsAt);
        const ppl = peopleFromNames(a.participantNames||[]).slice(0,3);
        const topics = topicsForRecord(a).filter(isUsefulTopicName).slice(0,2);
        return `<button type="button" class="tl-event-v50" data-agenda-id="${esc(a.id || key(a.title))}" data-hover-title="${esc(cleanEventTitle(a.title))}" data-hover-detail="${esc(compactDate(a.startsAt) + ' · ' + (loc.city || 'public venue'))}" data-hover-body="${esc(oneLine(a.whyItMatters || a.summary || 'Named participants and agenda links are promoted when sources confirm them.', 180))}"><span class="tl-date-v50"><b>${d.getDate()}</b></span><span class="tl-copy-v50"><strong>${esc(cleanEventTitle(a.title))}</strong><em>${flagHtml(loc.countryCode, loc.countryName)} ${esc(loc.city || 'public venue')}</em></span><span class="tl-faces-v50">${ppl.map((p)=>miniFace(p)).join('')}</span><span class="tl-topics-v50">${topics.map((t)=>`<i>${topicIcon(t)} ${esc(t)}</i>`).join('')}</span></button>`;
      }).join('');
      const extra = Math.max(0, m.items.length - 5);
      return `<section class="tl-month-v50 ${m.items.length?'has-items':'empty'}"><h4><span>${esc(m.label)}</span><b>${m.items.length}</b></h4><div class="tl-month-events-v50">${first || '<span class="tl-empty-v50">crawler watch</span>'}${extra ? `<button type="button" class="tl-more-v50" data-month-index="${m.index}">+${extra} more public windows</button>` : ''}</div></section>`;
    }).join('');
    els.influenceTimeline.innerHTML = `<div class="timeline-board-v50">${headline}<div class="timeline-grid-v50">${board}</div></div>`;
    qsAll('[data-agenda-id]', els.influenceTimeline).forEach((b)=>b.addEventListener('click',()=>focusAgenda(b.dataset.agendaId)));
    qsAll('[data-month-index]', els.influenceTimeline).forEach((b)=>b.addEventListener('click',()=>{
      const idx = Number(b.dataset.monthIndex); const hit = months[idx]?.items?.[0]; if (hit) focusAgenda(hit.id || key(hit.title));
    }));
    schedulePortraitHydration();
  }

'''
app = replace_between(app, '  function renderInfluenceTimeline() {', '  function renderConnectionWeb', render_influence_timeline, 'last')

activate_web_person = r'''  function activateWebPerson(rosterId) {
    const r = rosterById.get(rosterId);
    if (!r) return;
    const p = mappedPersonForRoster(r);
    qsAll('.web-link', els.influenceWeb).forEach((line) => {
      const on = line.dataset.webPersonId === rosterId;
      line.classList.toggle('is-active', on);
      line.classList.toggle('is-dim', !on);
    });
    qsAll('.web-person', els.influenceWeb).forEach((node) => {
      const on = node.dataset.webRoster === rosterId || node.dataset.webPersonId === rosterId;
      node.classList.toggle('is-selected', on);
      node.classList.toggle('is-muted', !on);
    });
    const recs = p ? (appearancesByPerson.get(p.id) || []) : [];
    const families = eventFamilies().filter((f) => recs.some((a)=>f.rx.test(recordHay(a))));
    const counterpartIds = new Set(recs.flatMap((a)=>counterpartyIdsByAppearance.get(a.id) || []));
    const counterparts = [...counterpartIds].map((id)=>peopleById.get(id)).filter(Boolean).slice(0,10);
    const contactPane = qs('#web-contacts', els.influenceWeb);
    if (contactPane) contactPane.innerHTML = `<h4>${esc(r.name)}</h4><p>${esc(recs.length)} public records across ${esc(families.length)} event systems. Bright lines show the rooms this person is linked to in the current source graph.</p><div class="web-family-pills">${families.slice(0,10).map((f)=>`<button type="button" data-web-event="${esc(f.name)}">${esc(shortEventLabel(f.name))}</button>`).join('') || '<span>No event-family edges yet.</span>'}</div><div class="web-contact-grid-v50">${counterparts.map((x)=>personCardCompact(x, `${(appearancesByPerson.get(x.id)||[]).length} records`)).join('') || '<span class="empty-note">Counterpart faces appear once meeting records are promoted.</span>'}</div>`;
    qsAll('[data-web-event]', contactPane || els.influenceWeb).forEach((el)=>el.addEventListener('click',()=>activateWebEvent(el.dataset.webEvent)));
    if (p) renderProfile(p, recs.at(-1)); else selectRoster(rosterId);
    bindPersonButtons(contactPane || els.influenceWeb);
    schedulePortraitHydration();
  }

'''
app = replace_between(app, '  function activateWebPerson(rosterId) {', '  function networkScoreForPerson', activate_web_person, 'first')

render_connection_web = r'''  function renderConnectionWeb() {
    if (!els.influenceWeb) return;
    const families = eventFamilies().slice(0, 16);
    const topRoster = roster.slice(0, 86);
    const w = 1120, h = 650, cx = w / 2, cy = h / 2;
    const outerR = 270, innerR = 112;
    const personNodes = topRoster.map((r, i) => { const angle = -Math.PI/2 + Math.PI*2*i/Math.max(1,topRoster.length); const p=mappedPersonForRoster(r); const recs=p?(appearancesByPerson.get(p.id)||[]):[]; return {r,p,recs,x:cx+Math.cos(angle)*outerR,y:cy+Math.sin(angle)*outerR,angle}; });
    const familyNodes = families.map((f, i) => { const angle = -Math.PI/2 + Math.PI*2*i/Math.max(1,families.length); const hit=familyHits(f); return {f,hit,x:cx+Math.cos(angle)*innerR,y:cy+Math.sin(angle)*innerR}; });
    const lines=[]; for(const node of personNodes){ if(!node.p) continue; for(const fam of familyNodes) if(node.recs.some((a)=>fam.f.rx.test(recordHay(a)))) lines.push({node,fam}); }
    const edgeSvg = lines.slice(0,620).map((l)=>`<line class="web-link" data-web-person-id="${esc(l.node.r.id)}" data-web-family-name="${esc(l.fam.f.name)}" x1="${l.node.x.toFixed(1)}" y1="${l.node.y.toFixed(1)}" x2="${l.fam.x.toFixed(1)}" y2="${l.fam.y.toFixed(1)}" />`).join('');
    const familySvg = familyNodes.map((n)=>`<g class="web-event" tabindex="0" data-web-event="${esc(n.f.name)}" data-hover-title="${esc(n.f.name)}" data-hover-detail="${esc(n.hit.people.length + ' named people · ' + n.hit.agendas.length + ' agenda cards')}" data-hover-body="${esc('Click to open this event system and its named people below the chart.')}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})"><circle r="18"></circle><text y="4">${esc(shortEventLabel(n.f.name))}</text></g>`).join('');
    const peopleSvg = personNodes.map((n)=>{ const mapped=!!n.p; const size=mapped?Math.min(7.8,3.5+Math.sqrt(n.recs.length)):2.8; const labelX=n.x+(n.x>=cx?12:-12); const anchor=n.x>=cx?'start':'end'; return `<g class="web-person ${mapped?'mapped':'watch'}" tabindex="0" data-web-roster="${esc(n.r.id)}" data-web-person-id="${esc(n.r.id)}" data-hover-title="${esc(n.r.name)}" data-hover-detail="${esc((n.recs.length||0)+' public records · '+(n.r.bucket||n.r.roleTitle||'profile'))}" data-hover-body="${esc('Click to highlight this person’s event edges and contacts.')}" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})"><circle r="${size.toFixed(1)}"></circle><text class="web-person-label" x="${(n.x>=cx?12:-12).toFixed(1)}" y="3" text-anchor="${anchor}">${esc(shortName(n.r.name))}</text></g>`; }).join('');
    const namedNodes = personNodes.filter((n)=>n.p&&n.recs.length).sort((a,b)=>b.recs.length-a.recs.length).slice(0,18).map((n)=>`<button type="button" class="web-chip" data-web-chip="${esc(n.r.id)}">${personCardCompact(n.p, n.recs.length+' records')}</button>`).join('');
    els.influenceWeb.innerHTML = `<div class="web-intro"><strong>Top-200 relationship web</strong><span>Click a person or event. Lines brighten; named people and source-backed venues open directly below the chart.</span></div><div class="web-layout-v50"><div class="web-main-v50"><div class="web-wrap web-wrap-v50"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Top-200 person to event relationship web">${edgeSvg}<circle class="web-core" cx="${cx}" cy="${cy}" r="${innerR+34}"></circle>${familySvg}${peopleSvg}</svg></div><div id="web-contacts" class="web-contacts web-selected-layer web-selected-layer-v50"><h4>Source-backed event layer</h4><p>Select a person or event node to see named people and visible venues. This pane stays under the chart so the right-side people rail remains usable.</p></div></div><aside class="web-side"><h4>Open people</h4><div>${namedNodes}</div></aside></div>`;
    qsAll('[data-web-roster]', els.influenceWeb).forEach((el)=>el.addEventListener('click',()=>activateWebPerson(el.dataset.webRoster)));
    qsAll('[data-web-chip]', els.influenceWeb).forEach((el)=>el.addEventListener('click',()=>activateWebPerson(el.dataset.webChip)));
    qsAll('[data-web-event]', els.influenceWeb).forEach((el)=>el.addEventListener('click',()=>activateWebEvent(el.dataset.webEvent)));
    bindPersonButtons(els.influenceWeb); schedulePortraitHydration();
  }

'''
app = replace_between(app, '  function renderConnectionWeb() {', '  function activateWebEvent', render_connection_web, 'last')

activate_web_event = r'''  function activateWebEvent(eventName) {
    if (!eventName || !els.influenceWeb) return;
    qsAll('.web-link', els.influenceWeb).forEach((line)=>{
      const on = line.dataset.webFamilyName===eventName;
      line.classList.toggle('is-active', on);
      line.classList.toggle('is-dim', !on);
    });
    qsAll('.web-person', els.influenceWeb).forEach((node)=>{
      const id=node.dataset.webRoster;
      const has=qsAll('.web-link', els.influenceWeb).some((line)=>line.dataset.webFamilyName===eventName && line.dataset.webPersonId===id);
      node.classList.toggle('is-selected',has);
      node.classList.toggle('is-muted',!has);
    });
    qsAll('.web-event', els.influenceWeb).forEach((node)=>node.classList.toggle('is-selected', node.dataset.webEvent===eventName));
    const pane=qs('#web-contacts', els.influenceWeb); const family=eventFamilies().find((f)=>f.name===eventName); const hit=family?familyHits(family):{people:[],agendas:[]};
    const agendaLinks = (hit.agendas||[]).slice(0,4).map((a)=>sourcePillsForLinks(a.sourcePack || [], a.title)).join('');
    if(pane) pane.innerHTML = `<h4>${esc(eventName)}</h4><p>${hit.people.length} named people and ${hit.agendas.length} agenda/watch cards in this source-backed layer. Lines now show the people who appear in this event system.</p><div class="web-contact-grid-v50">${hit.people.slice(0,28).map((p)=>personCardCompact(p, p.roleTitle)).join('') || '<span class="empty-note">Named participants appear as records are promoted.</span>'}</div><div class="source-pills">${agendaLinks}</div>`;
    bindPersonButtons(pane || els.influenceWeb); schedulePortraitHydration();
  }

'''
app = replace_between(app, '  function activateWebEvent(eventName) {', '\n\n})();', activate_web_event, 'last')

# Helper function to render compact person cards safely. Insert before miniFaceName if absent.
helper = r'''  function personCardCompact(person, meta = '') {
    if (!person) return '';
    const rosterId = rosterForPerson(person)?.id || '';
    return `<button type="button" class="person-compact-v50" data-roster-id="${esc(rosterId)}" data-hover-title="${esc(person.canonicalName)}" data-hover-detail="${esc(meta || person.roleTitle || 'public figure')}" data-hover-body="${esc((appearancesByPerson.get(person.id)||[]).length + ' public records in this build.')}">${miniFace(person)}<span><strong>${esc(person.canonicalName)}</strong><em>${flagHtml(person.countryCode || person.countryFocus || 'UN', person.countryName || '')} ${esc(oneLine(meta || person.roleTitle || person.organization || 'public figure', 58))}</em></span></button>`;
  }

'''
if 'function personCardCompact' not in app:
    app = app.replace('  function miniFaceName(subject, opts = {}) {', helper + '  function miniFaceName(subject, opts = {}) {')

app_path.write_text(app)

css_append = r'''

/* v4.9.0 finishing repair: usable matrix axes, compact organisation penetration, full-board timeline, repaired relationship pane. */
.matrix-intro-v50 { display:grid; grid-template-columns:minmax(180px,.55fr) minmax(0,1fr); gap:12px; align-items:center; padding:10px 12px; border:1px solid var(--line-soft); background:linear-gradient(90deg, rgba(142,199,255,.08), rgba(255,194,71,.04)); }
.matrix-intro-v50 strong { color:var(--text); text-transform:uppercase; letter-spacing:.08em; }
.matrix-intro-v50 span { color:var(--muted); line-height:1.35; }
.matrix-clusters-v50 { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:10px 0; }
.matrix-cluster-v50 { display:grid; grid-template-columns:1fr 22px 1fr 44px; gap:6px; align-items:center; min-height:42px; padding:8px; border:1px solid var(--line); background:#111b2a; color:var(--text); text-align:center; cursor:pointer; }
.matrix-cluster-v50 strong { color:var(--gold); border:1px solid rgba(255,194,71,.4); padding:4px; }
.matrix-cluster-v50.hot { background:linear-gradient(90deg, rgba(255,194,71,.2), #111b2a); }
.matrix-grid-v50 { display:grid; grid-template-columns:96px repeat(var(--n), minmax(40px,1fr)); gap:2px; width:100%; }
.matrix-corner, .matrix-axis, .matrix-cell-v50 { min-height:38px; border:1px solid rgba(150,187,225,.18); }
.matrix-corner { display:grid; place-items:center; color:var(--muted); background:#152233; text-transform:uppercase; letter-spacing:.06em; font-size:var(--fs-s); }
.matrix-axis { background:#152235; color:var(--ice); cursor:pointer; font-weight:900; text-align:center; padding:4px; }
.matrix-axis.side { display:flex; align-items:center; justify-content:flex-start; padding-left:8px; color:#eef6ff; }
.matrix-axis.top { writing-mode:horizontal-tb; overflow:hidden; text-overflow:clip; }
.matrix-axis:hover, .matrix-cell-v50:hover { border-color:var(--gold); box-shadow:inset 0 0 0 1px rgba(255,194,71,.24); }
.matrix-cell-v50 { display:grid; place-items:center; align-content:center; gap:1px; color:var(--text); background:linear-gradient(135deg, rgba(19,31,48,.95), rgba(255,194,71, calc(var(--heat) / 155))); cursor:pointer; }
.matrix-cell-v50 strong { font-size:var(--fs-m); color:#fff; }
.matrix-cell-v50 small { color:#b8c5d7; font-size:10px; }
.matrix-cell-v50.self { outline:1px solid rgba(255,194,71,.45); background:linear-gradient(135deg, rgba(255,194,71,.38), rgba(142,199,255,.16)); }
.matrix-cell-v50.empty { opacity:.55; }

.pen-v50-summary { display:grid; grid-template-columns:repeat(3,150px) minmax(0,1fr); gap:8px; align-items:stretch; margin-bottom:10px; }
.pen-v50-summary article { border:1px solid var(--line-soft); background:linear-gradient(180deg,#132033,#101928); padding:10px; display:grid; align-content:center; gap:3px; }
.pen-v50-summary article strong { color:var(--gold); font-size:var(--fs-l); line-height:1; }
.pen-v50-summary article span { color:var(--muted); text-transform:uppercase; letter-spacing:.05em; }
.pen-v50-summary article.wide { grid-template-columns:160px minmax(0,1fr); align-items:center; }
.pen-v50-summary article.wide b { color:var(--gold); text-transform:uppercase; letter-spacing:.08em; }
.pen-v50-summary article.wide p { margin:0; color:var(--muted); line-height:1.35; max-width:85ch; }
.pen-v50-roombar { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 10px; }
.pen-v50-roombar button { border:1px solid var(--line-soft); background:#142135; color:var(--blue); padding:5px 8px; cursor:pointer; display:flex; gap:6px; align-items:center; }
.pen-v50-roombar button b { color:var(--gold); }
.pen-board-v50 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.pen-card-v50 { border:1px solid var(--line); background:linear-gradient(145deg,#111b2a,#0d1522); padding:10px; display:grid; gap:8px; min-height:0; cursor:pointer; }
.pen-card-v50:hover { border-color:var(--gold); background:#152136; }
.pen-card-v50 header { display:grid; grid-template-columns:42px minmax(0,1fr) 42px; gap:8px; align-items:center; }
.pen-card-v50 header strong { display:block; color:var(--text); line-height:1.1; }
.pen-card-v50 header em { display:block; color:var(--muted); font-style:normal; }
.pen-card-v50 header b { display:grid; place-items:center; height:36px; border:1px solid var(--gold); color:var(--gold); font-size:var(--fs-l); }
.pen-card-v50 p { margin:0; color:var(--muted); line-height:1.35; }
.pen-chip-wrap-v50 { display:flex; flex-wrap:wrap; gap:4px; }
.pen-chip-v50 { border:1px solid var(--line-soft); background:#132237; color:var(--blue); padding:3px 6px; cursor:pointer; }
.pen-chip-v50.hit { color:#0b111b; background:var(--gold); border-color:var(--gold); }
.pen-chip-v50 b { margin-left:4px; }
.pen-people-v50 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }
.pen-person-v50 { background:transparent; border:0; color:inherit; padding:0; text-align:left; cursor:pointer; }
.pen-person-v50 .face-name { width:100%; min-width:0 !important; }

.timeline-board-v50 { display:grid; gap:10px; }
.timeline-v50-head { display:grid; grid-template-columns:minmax(220px,.8fr) minmax(0,1.4fr) repeat(3,130px); gap:8px; align-items:stretch; border:1px solid var(--line-soft); background:linear-gradient(90deg, rgba(142,199,255,.08), rgba(255,194,71,.04)); padding:10px; }
.timeline-v50-head strong { color:var(--gold); text-transform:uppercase; letter-spacing:.08em; }
.timeline-v50-head p { margin:0; color:var(--muted); line-height:1.35; }
.timeline-v50-head span { display:grid; place-items:center; border:1px solid var(--line-soft); background:#101928; color:var(--muted); text-transform:uppercase; }
.timeline-v50-head span b { display:block; color:var(--gold); font-size:var(--fs-l); }
.timeline-grid-v50 { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:8px; align-items:start; }
.tl-month-v50 { border:1px solid var(--line); background:#101a29; min-height:250px; display:grid; grid-template-rows:auto 1fr; }
.tl-month-v50 h4 { margin:0; padding:8px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line-soft); color:var(--gold); font-size:var(--fs-l); }
.tl-month-v50 h4 b { font-size:var(--fs-s); color:var(--blue); }
.tl-month-events-v50 { display:grid; gap:6px; padding:8px; align-content:start; }
.tl-event-v50 { display:grid; grid-template-columns:34px minmax(0,1fr); gap:6px; align-items:start; border:1px solid var(--line-soft); background:#142136; color:var(--text); padding:6px; text-align:left; cursor:pointer; }
.tl-event-v50:hover { border-color:var(--gold); }
.tl-date-v50 { display:grid; place-items:center; min-height:32px; border:1px solid rgba(255,194,71,.38); color:var(--gold); }
.tl-copy-v50 strong, .tl-copy-v50 em { display:block; white-space:normal; overflow:visible; line-height:1.15; }
.tl-copy-v50 em { color:var(--muted); font-style:normal; }
.tl-faces-v50 { display:flex; flex-wrap:wrap; gap:2px; grid-column:2; }
.tl-faces-v50 .mini-face { width:22px; height:22px; }
.tl-topics-v50 { display:flex; flex-wrap:wrap; gap:3px; grid-column:2; }
.tl-topics-v50 i { font-style:normal; color:var(--blue); border:1px solid var(--line-soft); padding:2px 4px; }
.tl-empty-v50 { color:var(--muted); border:1px dashed var(--line-soft); padding:8px; text-align:center; }
.tl-more-v50 { border:1px solid var(--line-soft); color:var(--blue); background:#101928; padding:6px; cursor:pointer; }

.web-layout-v50 { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:10px; align-items:start; }
.web-main-v50 { display:grid; gap:10px; min-width:0; }
.web-wrap-v50 { min-height:640px; overflow:visible; background:radial-gradient(circle at 50% 48%, rgba(255,194,71,.08), transparent 34%), #080f18; }
.web-wrap-v50 svg { width:100%; height:auto; max-height:760px; display:block; }
.web-person-label { display:block !important; font-size:11px !important; fill:#eaf4ff; paint-order:stroke; stroke:#07101a; stroke-width:3px; stroke-linejoin:round; pointer-events:none; }
.web-person.is-muted { opacity:.18; }
.web-person.is-selected circle, .web-event.is-selected circle { stroke:#fff !important; stroke-width:3px !important; fill:var(--gold) !important; }
.web-selected-layer-v50 { border:1px solid var(--line); background:#101824; padding:12px; min-height:0; }
.web-selected-layer-v50 h4 { margin:0 0 6px; color:var(--gold); text-transform:uppercase; letter-spacing:.08em; }
.web-selected-layer-v50 p { margin:0 0 8px; color:var(--muted); line-height:1.35; }
.web-family-pills { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
.web-family-pills button { border:1px solid var(--line-soft); background:#142236; color:var(--blue); padding:4px 7px; cursor:pointer; }
.web-contact-grid-v50 { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:6px; }
.person-compact-v50 { display:grid; grid-template-columns:34px minmax(0,1fr); gap:6px; align-items:center; border:1px solid var(--line-soft); background:rgba(255,255,255,.025); color:var(--text); padding:5px; text-align:left; cursor:pointer; min-width:0; }
.person-compact-v50:hover { border-color:var(--gold); }
.person-compact-v50 .mini-face { width:32px !important; height:32px !important; }
.person-compact-v50 strong, .person-compact-v50 em { display:block; white-space:normal; overflow:visible; line-height:1.15; }
.person-compact-v50 em { color:var(--muted); font-style:normal; }
.web-side { max-height:740px; overflow:auto; }
.web-chip .person-compact-v50 { width:100%; }
.web-chip { padding:3px !important; }

.flag-img svg, .flag-img.flag-svg svg { width:100% !important; height:100% !important; display:block !important; }
.face-name, .person-compact-v50, .mini-face { overflow:hidden !important; }
.face-name-copy b, .face-name-copy em { white-space:normal !important; overflow:visible !important; text-overflow:unset !important; }

@media (max-width:1300px){ .pen-board-v50{grid-template-columns:repeat(2,minmax(0,1fr));} .timeline-grid-v50{grid-template-columns:repeat(4,minmax(0,1fr));} .matrix-clusters-v50{grid-template-columns:repeat(2,minmax(0,1fr));} }
@media (max-width:900px){ .matrix-intro-v50,.pen-v50-summary,.timeline-v50-head,.web-layout-v50{grid-template-columns:1fr !important;} .pen-board-v50,.timeline-grid-v50,.pen-people-v50{grid-template-columns:1fr !important;} .matrix-grid-v50{grid-template-columns:78px repeat(var(--n), minmax(32px,1fr));} .matrix-axis,.matrix-cell-v50{font-size:10px;} }
'''
css = css_path.read_text() + css_append
css_path.write_text(css)

# update metadata/docs
pkg = json.loads(pkg_path.read_text())
pkg['version'] = '4.9.0'
pkg['description'] = 'Static ParleyMap influence cockpit v4.9 with repaired overlap matrix y-axis, compact organisation penetration, rebuilt timeline and relationship web layout.'
pkg_path.write_text(json.dumps(pkg, indent=2) + '\n')

notes = root/'docs/ITERATION_NOTES_v4.9.0.md'
notes.write_text('''# ParleyMap v4.9.0\n\nFocused finishing pass after v4.8.0.\n\n- Restored the event-overlap matrix y-axis and replaced the stretched grid with a compact correlation-style layout.\n- Rebuilt Organisation Penetration Index into a compact KPI strip plus card grid, removing the empty left void.\n- Rebuilt Influence Timeline into a full month board that uses vertical space without cramped internal scrolling.\n- Repaired the Top-200 relationship web selection pane: open people stay on the right; named people and event details appear below the circle chart.\n- Added safer compact person cards to prevent oversized flag/image artefacts.\n- Kept core map, roadmovie, legal pages, crawler jobs and public-source boundaries unchanged.\n''')
rec = root/'recovery/RECOVERY_SUMMARY_v4.9.0.md'
rec.write_text('''# Recovery summary v4.9.0\n\nThe accepted ParleyMap layout remains: top-10 opening map, profile rail on the right, intelligence below the map. This iteration fixes the matrix axis, organisation penetration layout, influence timeline and relationship web presentation without changing the data model or crawler architecture.\n''')
open_items = root/'recovery/OPEN_ITEMS_v4.9.0.md'
open_items.write_text('''# Open items v4.9.0\n\n- Full top-200 x 24-month verified archive still requires the live crawler and promotion pipeline.\n- Event attendance should remain based on named source evidence.\n- Portraits should be cached with rights metadata before hardened production launch.\n''')

# README quick update
readme = root/'README.md'
text = readme.read_text()
text = re.sub(r'v4\.8\.0|4\.8\.0', 'v4.9.0', text)
readme.write_text(text)
