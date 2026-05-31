from pathlib import Path
import json, re
root = Path('/mnt/data/parleymap-v4.8-work')
app_path = root/'src/app.js'
css_path = root/'src/styles.css'
tpl_path = root/'templates/index.template.html'
pkg_path = root/'package.json'
app = app_path.read_text()

def replace_function(src, name, new):
    pat = f"  function {name}("
    start = src.find(pat)
    if start < 0:
        raise SystemExit(f'missing {name}')
    brace = src.find('{', start)
    depth = 0
    i = brace
    in_str = None
    esc = False
    in_line = False
    in_block = False
    while i < len(src):
        ch = src[i]
        nxt = src[i+1] if i+1 < len(src) else ''
        if in_line:
            if ch == '\n': in_line = False
        elif in_block:
            if ch == '*' and nxt == '/':
                in_block = False; i += 1
        elif in_str:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == in_str:
                in_str = None
        else:
            if ch == '/' and nxt == '/':
                in_line = True; i += 1
            elif ch == '/' and nxt == '*':
                in_block = True; i += 1
            elif ch in ('"', "'", '`'):
                in_str = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    return src[:start] + new.rstrip() + src[end:]
        i += 1
    raise SystemExit(f'no end {name}')

# Replace build alerts: compact, no large empty side labels, source links visible.
app = replace_function(app, 'renderBuildAlerts', r'''  function renderBuildAlerts() {
    if (!els.rankAlerts) return;
    const agendaRows = uniqueAgendas(eventAgendas).sort((a,b) => Math.abs(daysFromNow(a.startsAt)) - Math.abs(daysFromNow(b.startsAt))).slice(0, 8);
    const futureApps = appearances.filter(isFuture).slice().sort((a,b) => new Date(a.startsAt) - new Date(b.startsAt)).slice(0, 6);
    const rows = [];
    for (const a of agendaRows) {
      const loc = a.location || {};
      const persons = peopleFromNames(a.participantNames || []);
      rows.push({
        kind: /registration/i.test(a.title + " " + (a.type || "")) ? "Registration opens" : "Agenda published",
        title: cleanEventTitle(a.title),
        event: cleanEventTitle(a.title),
        date: a.startsAt,
        loc,
        people: persons,
        detail: alertCommentForAgenda(a, persons.length),
        links: a.sourcePack || [],
        target: () => focusAgenda(a.id || key(a.title))
      });
    }
    for (const a of futureApps) {
      const p = peopleById.get(a.personId);
      rows.push({
        kind: "New attendee announced",
        title: p ? p.canonicalName : cleanEventTitle(a.title),
        event: cleanEventTitle(a.title),
        date: a.startsAt,
        loc: a.location || {},
        people: p ? [p, ...peopleFromNames((a.counterpartIds || []).map((id)=>peopleById.get(id)?.canonicalName).filter(Boolean))] : [],
        detail: oneLine(a.summary || a.whyItMatters || "A named public appearance has entered the future watch layer.", 220),
        links: a.sourcePack || [],
        target: () => p && selectRoster(rosterForPerson(p)?.id)
      });
    }
    rows.push(
      { kind: "Speaker added", title: "Speaker-list watch", event: "Conference speaker pages", date: now, loc: { city: "public web", countryCode: "UN", countryName: "Public sources" }, people: [], detail: "The nightly queue compares speaker pages with the last crawl. A new named speaker becomes an alert only after a source check.", links: [] },
      { kind: "Event moved", title: "Venue/date watch", event: "Agenda change monitoring", date: now, loc: { city: "public web", countryCode: "UN", countryName: "Public sources" }, people: [], detail: "Official event pages are watched for venue, date and session changes. The public card changes only after a source confirms it.", links: [] }
    );
    els.rankAlerts.innerHTML = rows.slice(0, 12).map((a, i) => {
      const flag = flagHtml(a.loc.countryCode, a.loc.countryName);
      const faces = a.people.slice(0, 5).map((p) => miniFaceName(p, { meta: p.roleTitle })).join("");
      const pills = sourcePillsForLinks(a.links, a.event || a.title) || sourceLinkHtml(`https://news.google.com/search?q=${encodeURIComponent((a.event || a.title) + " attendees agenda")}`, "news search", "source-link source-news");
      const hoverHtml = `<div class="hover-line"><b>Event</b><span>${esc(a.event || a.title)}</span></div><div class="hover-line"><b>Where</b><span>${esc([a.loc.city, a.loc.countryName].filter(Boolean).join(", ") || "public source")}</span></div><p>${esc(a.detail)}</p>`;
      return `<button type="button" class="alert-row signal-card-v49" data-alert-idx="${i}" data-hover-title="${esc(a.kind)}" data-hover-detail="${esc(a.event || a.title)}" data-hover-html="${esc(hoverHtml)}"><span class="alert-type"><span>${esc(alertIcon(a.kind))}</span><b>${esc(a.kind)}</b></span><span class="signal-main"><strong>${esc(a.title)}</strong><em>${flag} ${esc(compactDate(a.date))} · ${esc(a.loc.city || "source watch")}</em><p>${esc(a.detail)}</p>${faces ? `<span class="named-faces">${faces}</span>` : ""}<span class="source-pills">${pills}</span></span></button>`;
    }).join("");
    qsAll("[data-alert-idx]", els.rankAlerts).forEach((b, idx) => b.addEventListener("click", () => rows[idx].target ? rows[idx].target() : null));
    bindPersonButtons(els.rankAlerts);
    schedulePortraitHydration();
  }''')

# helper insert after renderBuildAlerts
insert_after = '  function renderBuildAlerts() {'
# We'll insert helper functions after end of renderBuildAlerts by locating next function renderTopicPanels
helper = r'''

  function alertIcon(kind = "") {
    const k = key(kind);
    if (/attendee|speaker/.test(k)) return "person";
    if (/agenda/.test(k)) return "agenda";
    if (/registration/.test(k)) return "open";
    if (/moved|venue|date/.test(k)) return "move";
    return "alert";
  }

  function alertCommentForAgenda(a, count = 0) {
    const hay = key([a.title, a.type, a.whyItMatters, ...(a.topics || [])].join(" "));
    const named = count ? `${count} named participant${count === 1 ? "" : "s"} already visible in this build.` : "Named participants are still being watched.";
    if (/shangri|nato|munich|security|defence/.test(hay)) return `Security agendas matter when ministers, commanders and defence firms converge. ${named}`;
    if (/fomc|jackson|sintra|bis|central bank|inflation/.test(hay)) return `Markets watch the room as much as the speech: rates, liquidity and confidence can shift before the formal decision. ${named}`;
    if (/ai|sun valley|ces|technology|semiconductor/.test(hay)) return `This is where technology strategy meets policy: chips, compute, safety language and public-sector demand. ${named}`;
    if (/g7|g20|brics|apec|oecd|unga/.test(hay)) return `The value is in who repeats the language later: communiqués, side meetings and ministerial follow-up show whether the agenda travels. ${named}`;
    return `${oneLine(a.whyItMatters || a.summary || "Public agenda watch.", 150)} ${named}`;
  }
'''
idx = app.find('  function renderTopicPanels()')
app = app[:idx] + helper + app[idx:]

# topic panels and icon helpers
app = replace_function(app, 'renderTopicPanels', r'''  function renderTopicPanels() {
    const allowed = new Set(["AI", "Defence", "Inflation", "Energy", "China", "Semiconductors", "Climate", "Trade", "Ukraine", "Middle East", "Debt", "Health", "Cyber", "Space", "Payments", "Food security"]);
    const topicRows = topicFamilies().filter((t) => allowed.has(displayTopicName(t.name))).map((t) => {
      const canonical = displayTopicName(t.name);
      const apps = appearances.filter((a) => topicsForRecord(a).includes(canonical) || t.rx.test(recordHay(a)));
      const agendas = uniqueAgendas(eventAgendas).filter((a) => topicsForRecord(a).includes(canonical) || t.rx.test(agendaHay(a)));
      const months = new Map();
      [...apps, ...agendas].forEach((x) => { const d = new Date(x.startsAt || x.date || now); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; months.set(k, (months.get(k) || 0) + 1); });
      const monthValues = [...months.entries()].sort().slice(-6).map(([,v]) => v);
      const recent = monthValues.slice(-3).reduce((s,v)=>s+v,0);
      const prior = monthValues.slice(0,3).reduce((s,v)=>s+v,0);
      const growth = recent - prior;
      const peopleSet = new Set(apps.map((a) => a.personId));
      return { ...t, name: canonical, apps, agendas, count: apps.length + agendas.length, growth, monthValues, people: [...peopleSet].map((id) => peopleById.get(id)).filter(Boolean) };
    }).filter((t) => t.count > 0).sort((a,b) => b.count - a.count);
    if (els.rankTopics) els.rankTopics.innerHTML = topicRows.slice(0, 8).map((t, idx) => topicRankRow(t, idx, "count")).join("");
    const growthRows = topicRows.slice().sort((a,b) => b.growth - a.growth || b.count - a.count).filter((t)=>Math.abs(t.growth) > 0).slice(0, 8);
    if (els.rankTopicGrowth) els.rankTopicGrowth.innerHTML = (growthRows.length ? growthRows : topicRows.slice(0,8)).map((t, idx) => topicRankRow(t, idx, "growth")).join("");
    qsAll("[data-topic-name]").forEach((b) => b.addEventListener("click", () => focusTopic(b.dataset.topicName)));
  }''')
app = replace_function(app, 'topicIcon', r'''  function topicIcon(name) {
    const t = key(name);
    if (/ai|artificial intelligence/.test(t)) return "AI";
    if (/semiconductor|chips/.test(t)) return "chip";
    if (/cyber/.test(t)) return "cyber";
    if (/space/.test(t)) return "orbit";
    if (/payments|cbdc|crypto/.test(t)) return "pay";
    if (/defence|security|nato|ukraine|middle east/.test(t)) return "shield";
    if (/inflation|debt|monetary|central bank|rates/.test(t)) return "rates";
    if (/trade/.test(t)) return "trade";
    if (/energy|opec|oil|gas/.test(t)) return "energy";
    if (/climate|carbon/.test(t)) return "climate";
    if (/china/.test(t)) return "china";
    if (/health/.test(t)) return "health";
    if (/food/.test(t)) return "food";
    return "topic";
  }''')
# Add topicChip and source if not exists before renderRecurringAttendees
idx = app.find('  function renderRecurringAttendees()')
app = app[:idx] + r'''

  function topicChip(name) {
    const label = displayTopicName(name);
    return `<span class="topic-pill topic-${esc(topicClass(label))}"><span class="topic-icon ${esc(topicClass(label))}">${esc(topicIcon(label))}</span>${esc(label)}</span>`;
  }

''' + app[idx:]

# Organization profiles source links labels and full copy
app = replace_function(app, 'renderOrganizationProfiles', r'''  function renderOrganizationProfiles() {
    if (!els.rankOrgProfiles) return;
    const families = eventFamilies();
    const rows = organizationFamilies().map((org) => {
      const apps = appearances.filter((a) => org.rx.test(recordHay(a)) || org.rx.test(recordHay(peopleById.get(a.personId) || {})));
      const agendas = eventAgendas.filter((a) => org.rx.test(agendaHay(a)));
      const reps = new Map();
      people.forEach((p) => { if (org.rx.test(recordHay(p))) reps.set(p.id, p); });
      (org.representatives || []).forEach((name) => { const p = mappedByName.get(key(name)) || people.find((x)=>key(x.canonicalName)===key(name)); if (p) reps.set(p.id,p); });
      apps.forEach((a) => { const p = peopleById.get(a.personId); if (p) reps.set(p.id, p); });
      const eventNames = families.filter((f) => apps.some((a) => f.rx.test(recordHay(a))) || agendas.some((a) => f.rx.test(agendaHay(a)))).map((f) => f.name);
      return { ...org, apps, agendas, reps: [...reps.values()], eventNames, score: apps.length + agendas.length * 2 + eventNames.length * 3 };
    }).sort((a,b) => b.score - a.score).slice(0, 12);
    els.rankOrgProfiles.innerHTML = rows.map((org) => {
      const reps = org.reps.slice(0, 6).map((p) => miniFaceName(p, { meta: p.roleTitle })).join("");
      const source = [sourceLinkHtml(orgWebsite(org.name), "website", "source-link source-doc"), sourceLinkHtml(`https://news.google.com/search?q=${encodeURIComponent(org.name + " events investor relations newsroom")}`, "news search", "source-link source-news")].filter(Boolean).join("");
      const comment = organisationComment(org);
      return `<article class="org-profile-row org-profile-v49" data-org-name="${esc(org.name)}" data-hover-title="${esc(org.name)}" data-hover-detail="${esc(org.apps.length + " records · " + org.agendas.length + " agenda cards")}" data-hover-body="${esc(comment)}"><span class="org-mark">${esc((org.mark || org.name.slice(0,2)).toUpperCase())}</span><span class="org-copy"><strong>${esc(org.name)}</strong><em>${esc(org.type || "organisation")} · ${org.apps.length} records · ${org.agendas.length} agenda cards</em><p>${esc(comment)}</p><span class="source-pills">${source}</span></span><span class="org-events">${org.eventNames.slice(0, 6).map((e)=>`<button type="button" data-matrix-event="${esc(e)}">${esc(e)}</button>`).join("")}</span><span class="named-faces">${reps}</span></article>`;
    }).join("");
    qsAll("[data-org-name]", els.rankOrgProfiles).forEach((b) => b.addEventListener("click", () => focusOrganisation(b.dataset.orgName)));
    qsAll("[data-matrix-event]", els.rankOrgProfiles).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); focusNetwork(b.dataset.matrixEvent); }));
    bindPersonButtons(els.rankOrgProfiles);
    schedulePortraitHydration();
  }''')
idx = app.find('  function orgWebsite(')
app = app[:idx] + r'''

  function organisationComment(org) {
    const n = org.name || "This organisation";
    const k = key(n + " " + (org.type || ""));
    if (/blackrock|blackstone|jpmorgan|goldman|asset|bank|capital/.test(k)) return `${n} matters here because its executives turn public forums into capital-allocation signals: panels, side rooms, client meetings and policy language.`;
    if (/nato|security|defence|palantir/.test(k)) return `${n} sits in the security layer: appearances reveal procurement priorities, alliance politics and which risks are becoming operational.`;
    if (/bis|ecb|federal reserve|imf|world bank|oecd/.test(k)) return `${n} anchors the policy layer: speeches, ministerial meetings and agenda wording shape expectations before formal decisions.`;
    if (/openai|microsoft|nvidia|alphabet|meta|technology/.test(k)) return `${n} belongs to the technology-policy layer: safety, compute, chips and public-sector demand are visible through recurring rooms.`;
    return `${n} is tracked through public events, representative appearances and recurring agenda links.`;
  }

''' + app[idx:]

# Event overlap matrix: compact no internal scrolling.
app = replace_function(app, 'renderEventOverlapMatrix', r'''  function renderEventOverlapMatrix() {
    if (!els.eventOverlapMatrix) return;
    const families = eventFamilies().filter((f)=>!/^Federal Reserve FOMC/i.test(f.name)).slice(0, 18);
    const familyPeople = families.map((f) => ({ family: f, hit: familyHits(f), peopleSet: new Set(familyHits(f).people.map((p)=>p.id)) }));
    const pairs = [];
    for (let i = 0; i < familyPeople.length; i++) for (let j = i + 1; j < familyPeople.length; j++) {
      const a = familyPeople[i], b = familyPeople[j];
      const shared = [...a.peopleSet].filter((id) => b.peopleSet.has(id));
      const denom = Math.max(1, Math.min(a.peopleSet.size || 1, b.peopleSet.size || 1));
      const pct = Math.round(shared.length / denom * 100);
      if (pct > 0) pairs.push({ a, b, shared, pct });
    }
    const clusters = pairs.sort((x,y)=>y.pct-x.pct || y.shared.length-x.shared.length).slice(0, 8).map((p)=>`<button type="button" class="matrix-cluster-v49 ${p.pct >= 70 ? "hot" : p.pct >= 35 ? "warm" : "cool"}" data-matrix-event="${esc(p.a.family.name)}" data-hover-title="${esc(p.a.family.name + " ↔ " + p.b.family.name)}" data-hover-detail="${esc(p.pct + "% shared-attendee overlap")}" data-hover-body="${esc(p.shared.length + " named people appear in both layers in the current data.")}"><span>${esc(p.a.family.name)}</span><b>↔</b><span>${esc(p.b.family.name)}</span><strong>${p.pct}</strong></button>`).join("");
    const n = familyPeople.length;
    const cells = familyPeople.map((row, i) => familyPeople.map((col, j) => {
      const shared = i === j ? row.peopleSet.size : [...row.peopleSet].filter((id)=>col.peopleSet.has(id)).length;
      const pct = i === j ? 100 : Math.round(shared / Math.max(1, Math.min(row.peopleSet.size || 1, col.peopleSet.size || 1)) * 100);
      return `<button type="button" class="corr-cell ${i===j ? "self" : ""}" style="--heat:${pct}" data-matrix-event="${esc(row.family.name)}" data-hover-title="${esc(row.family.name + " / " + col.family.name)}" data-hover-detail="${esc(pct + "% · " + shared + " shared")}" data-hover-body="${esc("Bright cells mean the same people recur across both event systems.")}"><span>${i===j ? "100" : pct}</span><small>${shared}</small></button>`;
    }).join("")).join("");
    const labelsTop = familyPeople.map((x)=>`<span class="corr-label top" title="${esc(x.family.name)}">${esc(shortOrg(x.family.name))}</span>`).join("");
    const labelsSide = familyPeople.map((x)=>`<span class="corr-label side" title="${esc(x.family.name)}">${esc(shortOrg(x.family.name))}</span>`).join("");
    els.eventOverlapMatrix.innerHTML = `<div class="matrix-intro compact"><strong>Shared-attendee overlap</strong><span>Read it like a correlation map. Bright cells show event systems that draw the same people. Click a row or cell to open that layer.</span></div><div class="matrix-clusters-v49">${clusters}</div><div class="corr-wrap" style="--n:${n}"><span></span>${labelsTop}${labelsSide}<div class="corr-grid" style="--n:${n}">${cells}</div></div>`;
    qsAll("[data-matrix-event]", els.eventOverlapMatrix).forEach((b) => b.addEventListener("click", () => focusNetwork(b.dataset.matrixEvent)));
  }''')

# Organisation penetration: no void, compact full width.
app = replace_function(app, 'renderOrganizationPenetration', r'''  function renderOrganizationPenetration() {
    if (!els.orgPenetration) return;
    const families = eventFamilies().slice(0, 18);
    const rows = organizationFamilies().map((org) => {
      const apps = appearances.filter((a) => org.rx.test(recordHay(a)) || org.rx.test(recordHay(peopleById.get(a.personId) || {})));
      const agendas = uniqueAgendas(eventAgendas).filter((a) => org.rx.test(agendaHay(a)));
      const reps = new Map();
      people.forEach((p)=>{ if (org.rx.test([p.canonicalName, p.roleTitle, p.organization, p.sector, p.countryName].join(" "))) reps.set(p.id, p); });
      apps.forEach((a)=>{ const p=peopleById.get(a.personId); if (p) reps.set(p.id,p); });
      (org.representatives || []).forEach((name)=>{ const p=mappedByName.get(key(name)) || people.find((x)=>key(x.canonicalName)===key(name)); if(p) reps.set(p.id,p); });
      const marks = families.map((f) => {
        const count = apps.filter((a)=>f.rx.test(recordHay(a))).length + agendas.filter((a)=>f.rx.test(agendaHay(a))).length;
        const watch = (org.eventPresence || []).some((e)=>key(e).includes(key(f.name)) || key(f.name).includes(key(e)));
        return { name: f.name, count, hit: count > 0, watch };
      });
      const confirmed = marks.filter((m)=>m.hit).length;
      const watch = marks.filter((m)=>!m.hit && m.watch).length;
      return { org, apps, agendas, reps:[...reps.values()], marks, confirmed, watch, records: apps.length + agendas.length, score: confirmed * 12 + watch * 3 + apps.length + agendas.length * 2 };
    }).filter((r)=>r.score > 0).sort((a,b)=>b.score-a.score).slice(0, 12);
    const topEvents = eventFamilies().slice(0, 10).map((f)=>`<button type="button" data-matrix-event="${esc(f.name)}">${esc(f.name)}</button>`).join("");
    const totalConfirmed = rows.reduce((s,r)=>s+r.confirmed,0);
    const totalWatch = rows.reduce((s,r)=>s+r.watch,0);
    const kpis = `<div class="pen-kpis-v49"><article><b>${rows.length}</b><span>organisations ranked</span></article><article><b>${totalConfirmed}</b><span>confirmed event-system hits</span></article><article><b>${totalWatch}</b><span>watch venues</span></article><article class="wide"><strong>How to read this</strong><p>Gold chips are named public records. Blue chips are venues worth watching until a source names a representative.</p><div class="source-pills">${topEvents}</div></article></div>`;
    const cards = rows.map((row, idx) => {
      const topMarks = row.marks.filter((m)=>m.hit || m.watch).sort((a,b)=>(b.hit-a.hit) || b.count-a.count).slice(0, 9);
      const chips = topMarks.map((m)=>`<button type="button" class="${m.hit ? "hit" : "watch"}" data-matrix-event="${esc(m.name)}" title="${esc(m.name)}">${m.hit ? "✓" : "○"} ${esc(m.name)}${m.count ? ` <i>${m.count}</i>` : ""}</button>`).join("");
      const reps = row.reps.slice(0, 4).map((p)=>miniFaceName(p, { meta: p.roleTitle })).join("");
      const summary = orgPenetrationLine(row.org, row.confirmed, row.marks.filter((m)=>m.hit).map((m)=>m.name));
      return `<article class="pen-card-v49" data-org-name="${esc(row.org.name)}" data-hover-title="${esc(row.org.name)}" data-hover-detail="${esc(row.confirmed + " confirmed systems · " + row.records + " records")}" data-hover-body="${esc(summary)}"><button type="button" class="pen-head-v49" data-org-name="${esc(row.org.name)}"><span class="org-mark">${esc((row.org.mark || row.org.name.slice(0,2)).toUpperCase())}</span><span><strong>${idx + 1}. ${esc(row.org.name)}</strong><em>${esc(row.org.type || "organisation")}</em></span><b>${row.confirmed}</b></button><p>${esc(summary)}</p><div class="pen-chips-v49">${chips}</div><div class="pen-reps-v49">${reps}</div></article>`;
    }).join("");
    els.orgPenetration.innerHTML = `${kpis}<div class="pen-board-v49">${cards}</div>`;
    qsAll("[data-org-name]", els.orgPenetration).forEach((b) => b.addEventListener("click", () => focusOrganisation(b.dataset.orgName)));
    qsAll("[data-matrix-event]", els.orgPenetration).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); focusNetwork(b.dataset.matrixEvent); }));
    bindPersonButtons(els.orgPenetration);
    schedulePortraitHydration();
  }''')

# Timeline: full-width, less cramped.
app = replace_function(app, 'renderInfluenceTimeline', r'''  function renderInfluenceTimeline() {
    if (!els.influenceTimeline) return;
    const items = uniqueAgendas(eventAgendas)
      .filter((a) => Number.isFinite(new Date(a.startsAt).getTime()))
      .sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt))
      .slice(0, 96);
    const months = Array.from({ length: 12 }, (_, i) => ({ index: i, label: new Date(2026, i, 1).toLocaleString("en-GB", { month: "short" }), items: [] }));
    items.forEach((a) => { const d = new Date(a.startsAt); months[d.getMonth()]?.items.push(a); });
    const peak = months.slice().sort((a,b)=>b.items.length-a.items.length)[0];
    const monthHtml = months.map((m) => {
      const cards = m.items.slice(0, 5).map((a) => {
        const d = new Date(a.startsAt);
        const loc = a.location || {};
        const topics = topicsForRecord(a).filter(isUsefulTopicName).slice(0, 3);
        const peopleList = peopleFromNames(a.participantNames || []).slice(0, 4);
        const summary = agendaOutcomeComment(a, peopleList.length);
        return `<button type="button" class="tl-v49-event" data-agenda-id="${esc(a.id || key(a.title))}" data-hover-title="${esc(cleanEventTitle(a.title))}" data-hover-detail="${esc(compactDate(a.startsAt) + " · " + (loc.city || "public venue"))}" data-hover-body="${esc(summary.signal)}"><span class="tl-v49-date"><b>${d.getDate()}</b><em>${esc(m.label)}</em></span><span class="tl-v49-copy"><strong>${esc(cleanEventTitle(a.title))}</strong><small>${flagHtml(loc.countryCode, loc.countryName)} ${esc(loc.city || "public venue")}</small><i>${esc(oneLine(summary.moved, 170))}</i></span><span class="tl-v49-faces">${peopleList.map((p)=>miniFaceName(p, { meta: p.roleTitle })).join("")}</span><span class="topic-pills">${topics.map((t)=>topicChip(t)).join("")}</span></button>`;
      }).join("");
      const more = m.items.length > 5 ? `<button type="button" class="tl-v49-more" data-month-index="${m.index}">+${m.items.length - 5} more</button>` : "";
      return `<section class="tl-v49-month ${m.items.length ? "has-items" : "quiet"}"><h4>${esc(m.label)} <span>${m.items.length}</span></h4>${cards || `<span class="timeline-empty">source watch</span>`}${more}</section>`;
    }).join("");
    els.influenceTimeline.innerHTML = `<div class="tl-v49-head"><strong>Annual influence rhythm</strong><p>${esc(peak?.label || "The year")} carries the heaviest public-event load in this build. The timeline uses the full panel width; click a card to put named participants on the map.</p><span>Daily updates add new events, speakers and agenda pages without redesigning the rail.</span></div><div class="tl-v49-grid">${monthHtml}</div>`;
    qsAll("[data-agenda-id]", els.influenceTimeline).forEach((b) => b.addEventListener("click", () => focusAgenda(b.dataset.agendaId)));
    qsAll("[data-month-index]", els.influenceTimeline).forEach((b) => b.addEventListener("click", () => { const month = months[Number(b.dataset.monthIndex)]; const first = month?.items?.[0]; if (first) focusAgenda(first.id || key(first.title)); }));
    bindPersonButtons(els.influenceTimeline);
    schedulePortraitHydration();
  }''')

# Focus event catalogue: if no records, still useful fallback layer.
app = replace_function(app, 'focusEventCatalog', r'''  function focusEventCatalog(id) {
    const item = eventCatalog.find((x) => x.id === id) || influenceEventCatalog.find((x)=>x.id===id || key(x.name)===key(id));
    if (!item) return;
    const terms = [item.name, item.title, item.group, ...(item.aliases || []), ...(item.events || [])].map(key).filter(Boolean);
    const hasTerm = (text) => { const hay = key(text); return terms.some((term) => hay.includes(term) || term.split(/\s+/).filter(Boolean).every((word) => hay.includes(word))); };
    const agendaMatches = eventAgendas.filter((a) => hasTerm([a.title, a.type, a.whyItMatters, ...(a.topics || [])].join(" ")));
    const recordMatches = appearances.filter((a) => hasTerm([a.title, a.eventType, a.summary, ...(a.topics || [])].join(" ")));
    const fallback = !recordMatches.length && !agendaMatches.length ? networkFallbackPeople(item.name || item.title || item.group || "") : [];
    stopPlayback(); selectedPerson = null; selectedRoster = null; timeline = []; currentStep = -1;
    if (els.roster) els.roster.value = "";
    clearMap();
    const title = cleanEventTitle(item.name || item.title || item.group || "Event layer");
    els.mapTitle.textContent = title;
    els.mapStatus.textContent = recordMatches.length || agendaMatches.length ? `${recordMatches.length} public records · ${agendaMatches.length} agenda/watch cards. Click a card below for source context.` : `Source-watch layer. No promoted event record yet; showing likely public anchors for the relevant people.`;
    const locs = [...recordMatches.map((a) => a.location), ...agendaMatches.map((a) => a.location)].filter(Boolean);
    if (!fallbackMode && map) {
      const bounds = [];
      if (locs.length) {
        const uniqueLocs = [];
        const seen = new Set();
        for (const loc of locs) { const k = `${loc.city}|${loc.countryCode}`; if (!seen.has(k)) { seen.add(k); uniqueLocs.push(loc); } }
        const points = deOverlapAnchors(uniqueLocs.slice(0, 60).map((loc) => ({ anchor: loc, trueAnchor: loc, roster: { id: "", name: title, countryFocus: loc.countryCode, countryName: loc.countryName }, person: null })));
        drawDisplayLeaderLines(points);
        points.forEach((point) => { const actual = point.trueAnchor || point.anchor; drawHeat(actual, 1.1, countryColor(actual.countryCode)); const marker = L.marker([point.anchor.lat, point.anchor.lng], { icon: stopDivIcon({ kind: "event", date: title, record: { location: actual, title } }, 0, "network"), riseOnHover: true, keyboard: true }); marker.on("click", () => focusCity(actual.city, actual.countryCode)); marker.on("mouseover", (e) => showHoverAt(e.originalEvent, { title, detail: `${actual.city}, ${actual.countryName}`, body: item.why || item.category || "Public event layer." })); marker.on("mousemove", (e) => moveHover(e.originalEvent)); marker.on("mouseout", hideHover); marker.addTo(layers.markers); bounds.push([point.anchor.lat, point.anchor.lng]); });
      } else if (fallback.length) {
        const anchors = deOverlapAnchors(fallback.map((it) => ({ ...it, anchor: it.anchor || openingAnchorForRoster(it.roster) })));
        drawDisplayLeaderLines(anchors);
        anchors.forEach((item) => { const r = item.roster; const p = item.person; drawHeat(item.trueAnchor || item.anchor, .75, countryColor(r.countryFocus)); const marker = L.marker([item.anchor.lat, item.anchor.lng], { icon: personDivIcon(r, p, { label: shortName(r.name) }), riseOnHover: true, keyboard: true }); marker.on("click", () => selectRoster(r.id)); marker.on("mouseover", (e) => showHoverAt(e.originalEvent, { title: r.name, detail: title, body: `Watch profile: ${r.roleTitle || r.bucket || "public figure"}. Public records are still being promoted for this event family.` })); marker.on("mousemove", (e) => moveHover(e.originalEvent)); marker.on("mouseout", hideHover); marker.addTo(layers.markers); bounds.push([item.anchor.lat, item.anchor.lng]); });
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [64, 64], maxZoom: 5, animate: true });
    }
    const agendaHtml = agendaMatches.slice(0, 8).map((agenda) => `<button type="button" class="profile-source-card" data-agenda-id="${esc(agenda.id)}"><strong>${esc(cleanEventTitle(agenda.title))}</strong><span>${esc(compactDate(agenda.startsAt))} · ${esc(agenda.location?.city || "")}</span></button>`).join("");
    const fields = (item.trackerFields || ["event", "person", "organisation", "role", "year", "speaker/attendee", "source URL"]).map((x) => `<span class="topic-pill">${esc(x)}</span>`).join("");
    const fallbackHtml = fallback.slice(0, 12).map((it)=>`<button type="button" data-roster-id="${esc(it.roster.id)}">${miniFaceName(it.person || it.roster, { meta: it.roster.roleTitle || it.roster.bucket })}</button>`).join("");
    els.profile.innerHTML = `<div class="summit-profile"><h3>${esc(title)}</h3><p>${esc(item.category || item.type || "Influence event layer")}</p><div class="topic-pills">${fields}</div><div class="bio-lines"><div><strong>What this layer is for:</strong> ${esc(item.why || "Track recurring attendance, named participants and official source links.")}</div><div><strong>What the crawler collects:</strong> person, organisation, role, year, speaker/attendee status and source URL.</div><div><strong>Current layer:</strong> ${recordMatches.length} public records and ${agendaMatches.length} agenda cards.</div></div><div class="summit-attendees">${fallbackHtml}</div><div class="profile-card-list">${agendaHtml || "Agenda cards appear here once loaded."}</div></div>`;
    qsAll("[data-agenda-id]", els.profile).forEach((b) => b.addEventListener("click", () => focusAgenda(b.dataset.agendaId)));
    qsAll("[data-roster-id]", els.profile).forEach((b) => b.addEventListener("click", () => b.dataset.rosterId && selectRoster(b.dataset.rosterId)));
    schedulePortraitHydration();
  }''')

# Focus network fallback if no records.
app = replace_function(app, 'focusNetwork', r'''  function focusNetwork(name) {
    const rxMap = {
      "Technology / AI": /ai|artificial intelligence|technology|digital|chips|semiconductor|ces|sun valley|openai|nvidia|microsoft/i,
      "NATO / security": /nato|munich security|shangri-la|raisina|defence|defense|security/i,
      "G7 / G20": /g7|g20|kananaskis|evian|é?vian|miami/i,
      "BRICS / APEC": /brics|apec|shenzhen|global south|asia-pacific/i,
      "Central banking": /central bank|jackson hole|bis|ecb|monetary|payments|g30|bank of canada|bank of england|boj/i,
      "Bilderberg": /bilderberg/i,
      "UNGA / COP": /unga|united nations|cop31|climate|antalya|high-level week/i,
      "IMF / World Bank": /imf|world bank|development finance|annual meetings/i,
      "Energy": /opec|ceraweek|adipec|energy|oil|gas|lng|houston|abu dhabi/i,
      "Business / capital": /milken|sun valley|fii|blackrock|blackstone|jpmorgan|goldman|private equity|asset/i,
      "Universities and ideas": /harvard|stanford|oxford|cambridge|mit|lse|sciences po|tsinghua|university|symposium|st\.?gallen/i,
      "OECD": /oecd/i,
      "BIS": /bis|basel committee|innovation summit/i,
      "UN system": /united nations|unga|who|wto|un /i,
      "OPEC / energy": /opec|energy|oil|gas/i,
      "AI policy": /ai|artificial intelligence|technology|digital/i,
      "Global connectors": /davos|bilderberg|milken|sun valley|fii|aspen|g30|chatham|cfr|wef/i,
      "Security forums": /munich security|shangri-la|raisina|nato|aspen security|defence|defense/i,
      "Trade and industry": /wto|apec|farnborough|paris air show|ces|trade|supply chain|aerospace/i,
      "Energy and commodities": /opec|ceraweek|adipec|fii|energy|oil|gas|lng/i
    };
    const rx = rxMap[name] || new RegExp(escapeRegex(name), "i");
    const matches = appearances.filter((a) => rx.test([a.title, a.eventType, a.summary, ...(a.topics || [])].join(" ")));
    const agendaMatches = uniqueAgendas(eventAgendas).filter((a) => rx.test([a.title, a.type, a.whyItMatters, ...(a.topics || [])].join(" ")));
    const fallback = !matches.length ? networkFallbackPeople(name) : [];

    stopPlayback(); selectedPerson = null; selectedRoster = null; timeline = []; currentStep = -1; clearMap();
    const sourceWatch = !matches.length && fallback.length;
    const personRows = matches.length ? networkPersonRows(matches).slice(0, 34) : fallback.map((it) => ({ person: it.person, roster: it.roster, records: it.records || [], latest: { location: it.anchor, startsAt: now, title: `${name} source watch` }, cities: [it.anchor.city], score: 1 })).filter((x)=>x.person || x.roster).slice(0, 22);
    const cityRows = matches.length ? networkCityRows(matches).slice(0, 18) : [];
    const repeatedPeople = personRows.filter((row) => (row.records || []).length > 1);
    const topCities = cityRows.slice(0, 5).map((row) => `${row.city} ${row.count}`).join(" · ");

    els.mapTitle.textContent = name;
    els.mapStatus.textContent = sourceWatch ? `${personRows.length} watch profiles. No promoted records yet, so the map shows public anchors rather than travel claims.` : `${personRows.length} faces · ${matches.length} records collapsed into city heat. Repeated attendees appear once; heat and leader lines carry the density.`;

    if (!fallbackMode && map) {
      const bounds = [];
      cityRows.forEach((row) => { drawNetworkCityHeat(row, name); bounds.push([row.lat, row.lng]); });
      const anchors = deOverlapAnchors(personRows.map((row) => ({ person: row.person, roster: row.roster || rosterForPerson(row.person), anchor: row.latest.location, networkCount: (row.records || []).length || 1, networkCities: row.cities, networkTitles: (row.records || []).map((a) => a.title) })));
      drawDisplayLeaderLines(anchors);
      anchors.forEach((item) => {
        const actual = item.trueAnchor || item.anchor;
        const marker = L.marker([item.anchor.lat, item.anchor.lng], { icon: networkPersonIcon(item.roster || item.person, item.person, item.networkCount || 1), riseOnHover: true, keyboard: true });
        marker.on("click", () => selectRoster((item.roster || rosterForPerson(item.person))?.id));
        marker.on("mouseover", (e) => showHoverAt(e.originalEvent, { title: (item.person?.canonicalName || item.roster?.name || name), detail: sourceWatch ? "watch profile" : `${item.networkCount || 1} record${(item.networkCount || 1) === 1 ? "" : "s"} in ${name}`, body: sourceWatch ? `Public anchor only. The next live crawl looks for named records in this layer.` : `${(item.networkCities || []).slice(0, 4).join(" · ") || actual.city}. Latest visible record is promoted in the source-backed archive.` }));
        marker.on("mousemove", (e) => moveHover(e.originalEvent));
        marker.on("mouseout", hideHover);
        marker.addTo(layers.markers); bounds.push([item.anchor.lat, item.anchor.lng]);
      });
      if (bounds.length) map.fitBounds(bounds, { padding: [64,64], maxZoom: 5, animate: true });
    } else {
      renderStaticNetworkMap(name, personRows, cityRows);
    }

    const peopleHtml = personRows.slice(0, 16).map((row) => `<button type="button" data-roster-id="${esc((row.roster || rosterForPerson(row.person))?.id || "")}">${miniFaceName(row.person || row.roster, { meta: sourceWatch ? (row.roster?.roleTitle || row.roster?.bucket || "watch profile") : `${(row.records || []).length} records · ${(row.cities || []).slice(0, 2).join(" / ")}` })}</button>`).join("");
    els.profile.innerHTML = `<h3>${esc(name)}</h3><p>${sourceWatch ? "This is a source-watch layer. People are shown at public institutional anchors until a dated public appearance is promoted." : `${matches.length} public records are shown as a density map: one face per person, not one marker per repeated appearance.`}</p><div class="network-brief"><span><b>Repeat attendees</b>${esc(String(repeatedPeople.length))}</span><span><b>Hot cities</b>${esc(topCities || (sourceWatch ? "pending promoted records" : "source watch"))}</span></div><div class="network-city-list">${cityRows.slice(0, 6).map((row) => `<button type="button" data-network-city="${esc(row.city)}" data-network-code="${esc(row.countryCode)}"><strong>${flagHtml(row.countryCode, row.countryName)} ${esc(row.city)}</strong><span>${row.count} records · ${row.people.size} people</span></button>`).join("")}</div><div class="summit-attendees">${peopleHtml}</div>`;
    qsAll("[data-roster-id]", els.profile).forEach((b) => b.addEventListener("click", () => b.dataset.rosterId && selectRoster(b.dataset.rosterId)));
    qsAll("[data-network-city]", els.profile).forEach((b) => b.addEventListener("click", () => focusCity(b.dataset.networkCity, b.dataset.networkCode)));
    schedulePortraitHydration();
  }''')

# UK spelling in visible strings and helpers
app = app.replace('"organization"', '"organisation"').replace('"organizations"', '"organisations"')
# Do not globally replace function names/class identifiers. Replace visible phrases only below.
app = app.replace('source URL', 'source URL')
app_path.write_text(app)

# Template version and UK spelling
pkg = json.loads(pkg_path.read_text())
pkg['version'] = '4.8.0'
pkg['description'] = 'Static ParleyMap influence cockpit with audited top-10 opening map, source-watch fallbacks, improved UK-English intelligence panels, compact organisation penetration, readable timeline and evergreen public-source queues.'
pkg_path.write_text(json.dumps(pkg, indent=2) + '\n')
tpl = tpl_path.read_text()
tpl = tpl.replace('v4.7.0', 'v4.8.0').replace('organizations', 'organisations').replace('organizations and event graph', 'organisations and event graph').replace('<body>', '<body style="--pm-logo-watermark: url(\'__LOGO_DATA_URI__\')">')
tpl = tpl.replace('Influence-event catalog', 'Influence-event catalogue')
tpl = tpl.replace('Organization profiles', 'Organisation profiles').replace('Organization penetration index', 'Organisation penetration index')
tpl = tpl.replace('top-200: King Charles, Xi, Musk...', 'top-200: King Charles, Xi, Musk...')
tpl_path.write_text(tpl)

# CSS finishing patch
css = css_path.read_text()
css += r'''

/* v4.8.0 finishing pass: cleaner intelligence panels, UK-English presentation, no cut-off text. */
body::before { content:""; position:fixed; inset:0; pointer-events:none; z-index:-1; background: radial-gradient(circle at 18% 12%, rgba(18,78,116,.22), transparent 34%), radial-gradient(circle at 82% 4%, rgba(255,194,71,.08), transparent 28%), linear-gradient(180deg, rgba(255,255,255,.01), transparent 42%); animation: pm-breathe 13s ease-in-out infinite alternate; }
@keyframes pm-breathe { from { filter:brightness(1); } to { filter:brightness(1.12); } }
.intel-panel::after, .profile-card::after, .info-panel::after, .timeline-panel::after, .stats-dock::after { content:""; position:absolute; right:16px; bottom:12px; width:130px; height:72px; pointer-events:none; opacity:.035; background-image:var(--pm-logo-watermark); background-size:contain; background-repeat:no-repeat; background-position:right bottom; }
.intel-panel, .profile-card, .info-panel, .timeline-panel, .stats-dock { position:relative; }
.intel-panel *, .profile-body *, .agenda-row *, .catalog-card *, .network-card *, .org-profile-row *, .alert-row *, .rank-row *, .power-city *, .migration-row *, .pen-card-v49 *, .tl-v49-event *, .web-selected-layer * { white-space:normal !important; overflow:visible !important; text-overflow:unset !important; line-height:1.22; }
.source-link, .topic-pill { white-space:normal !important; max-width:none !important; }
.alert-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.signal-card-v49 { display:grid !important; grid-template-columns:116px minmax(0,1fr) !important; align-items:stretch; gap:12px !important; padding:12px !important; border:1px solid var(--line); background:linear-gradient(135deg, rgba(17,27,40,.98), rgba(9,15,24,.98)); color:var(--text); min-height:0; cursor:pointer; }
.signal-card-v49:hover { border-color:var(--gold); box-shadow:inset 0 0 0 1px rgba(255,194,71,.18); transform:translateY(-1px); }
.signal-card-v49 .alert-type { display:grid; align-content:center; justify-items:center; gap:6px; border:1px solid rgba(255,194,71,.44); background:linear-gradient(135deg, rgba(255,194,71,.16), rgba(142,199,255,.06)); color:var(--gold); text-transform:uppercase; letter-spacing:.08em; min-height:86px; padding:8px; }
.signal-card-v49 .alert-type span { color:var(--gold); font-size:var(--fs-m); }
.signal-card-v49 .signal-main { display:grid; gap:6px; align-content:start; }
.signal-card-v49 .signal-main strong { color:var(--text); }
.signal-card-v49 .signal-main em { color:var(--muted); font-style:normal; }
.signal-card-v49 .signal-main p { margin:0; max-width:80ch; }
.signal-card-v49 .named-faces { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }
.topic-row { display:grid !important; grid-template-columns:64px minmax(0,1fr) 150px minmax(80px,auto) !important; min-height:54px !important; }
.topic-icon { display:inline-grid; place-items:center; min-width:34px; min-height:28px; padding:2px 6px; border:1px solid currentColor; color:var(--gold); background:rgba(255,194,71,.08); font-size:var(--fs-s); text-transform:uppercase; letter-spacing:.05em; }
.topic-pill .topic-icon { min-width:26px; min-height:20px; margin-right:4px; }
.topic-tech, .topic-pill.topic-tech .topic-icon { color:#80c6ff; }
.topic-security, .topic-pill.topic-security .topic-icon { color:#ff7e67; }
.topic-energy, .topic-pill.topic-energy .topic-icon { color:#ffc247; }
.topic-finance, .topic-pill.topic-finance .topic-icon { color:#b7f7c1; }
.topic-diplomacy, .topic-pill.topic-diplomacy .topic-icon { color:#c7a7ff; }
.org-profile-v49 { display:grid !important; grid-template-columns:54px minmax(0,1fr) minmax(210px,320px); gap:12px; align-items:start; padding:12px; }
.org-profile-v49 .named-faces { grid-column:2 / -1; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; }
.org-profile-v49 .org-events { display:flex; flex-wrap:wrap; gap:5px; justify-content:flex-start; }
.org-profile-v49 .org-events button, .pen-kpis-v49 button { border:1px solid var(--line-soft); color:var(--blue); background:#0a111c; padding:3px 6px; cursor:pointer; }
.matrix-clusters-v49 { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:10px 0; }
.matrix-cluster-v49 { display:grid; grid-template-columns:minmax(0,1fr) 24px minmax(0,1fr) 44px; gap:6px; align-items:center; border:1px solid var(--line); background:#101824; color:var(--text); padding:8px; cursor:pointer; }
.matrix-cluster-v49 span { white-space:normal !important; }
.matrix-cluster-v49 strong { display:grid; place-items:center; min-height:28px; color:var(--gold); border:1px solid rgba(255,194,71,.35); }
.matrix-cluster-v49.hot { background:linear-gradient(90deg, rgba(255,194,71,.20), #101824); }
.matrix-cluster-v49.warm { background:linear-gradient(90deg, rgba(142,199,255,.15), #101824); }
.corr-wrap { display:grid; grid-template-columns:72px repeat(var(--n), minmax(0,1fr)); gap:2px; align-items:stretch; width:100%; }
.corr-label { display:grid; place-items:center; min-height:32px; border:1px solid var(--line-soft); background:#111c2a; color:var(--muted); font-size:var(--fs-s); text-align:center; padding:4px; }
.corr-label.side { justify-content:start; padding-left:6px; }
.corr-grid { grid-column:2 / -1; display:grid; grid-template-columns:repeat(var(--n), minmax(0,1fr)); gap:2px; }
.corr-cell { min-height:38px; border:1px solid rgba(255,255,255,.05); background:linear-gradient(90deg, rgba(142,199,255,.10), rgba(255,194,71, calc(var(--heat) / 135))); color:var(--text); cursor:pointer; display:grid; place-items:center; }
.corr-cell span { font-size:var(--fs-m); }
.corr-cell small { color:var(--muted); }
.corr-cell.self { box-shadow:inset 0 0 0 1px rgba(255,194,71,.35); }
.pen-kpis-v49 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)) minmax(320px,2fr); gap:10px; margin-bottom:10px; }
.pen-kpis-v49 article { border:1px solid var(--line); background:linear-gradient(135deg, rgba(142,199,255,.08), rgba(255,194,71,.06)); padding:10px; display:grid; gap:5px; min-height:72px; }
.pen-kpis-v49 b { color:var(--gold); font-size:var(--fs-l); line-height:.95; }
.pen-kpis-v49 span { color:var(--muted); }
.pen-kpis-v49 .wide { grid-template-columns:150px minmax(0,1fr); align-items:start; }
.pen-kpis-v49 .wide .source-pills { grid-column:1 / -1; }
.pen-board-v49 { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
.pen-card-v49 { border:1px solid var(--line); background:#111a27; color:var(--text); padding:10px; display:grid; gap:8px; min-height:0; }
.pen-card-v49:hover { border-color:var(--gold); background:#162236; transform:translateY(-1px); }
.pen-head-v49 { display:grid; grid-template-columns:42px minmax(0,1fr) 38px; gap:8px; align-items:center; border:0; background:transparent; color:var(--text); padding:0; text-align:left; cursor:pointer; }
.pen-head-v49 b, .pen-head-v49 .org-mark { display:grid; place-items:center; min-height:32px; border:1px solid var(--gold); color:var(--gold); background:rgba(255,194,71,.07); }
.pen-head-v49 em { color:var(--muted); font-style:normal; }
.pen-chips-v49 { display:flex; flex-wrap:wrap; gap:4px; }
.pen-chips-v49 button { border:1px solid var(--line-soft); background:rgba(255,255,255,.03); color:var(--muted); padding:3px 5px; cursor:pointer; }
.pen-chips-v49 button.hit { border-color:var(--gold); background:rgba(255,194,71,.18); color:#ffe6a8; }
.pen-chips-v49 button.watch { border-color:rgba(142,199,255,.5); color:var(--blue); }
.pen-reps-v49 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; }
.tl-v49-head { display:grid; grid-template-columns:260px minmax(0,1fr) 220px; gap:12px; align-items:center; padding:10px; border:1px solid var(--line); background:linear-gradient(90deg, rgba(142,199,255,.08), rgba(255,194,71,.05)); margin-bottom:10px; }
.tl-v49-head strong { color:var(--gold); text-transform:uppercase; letter-spacing:.06em; }
.tl-v49-head p, .tl-v49-head span { margin:0; color:var(--muted); }
.tl-v49-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:10px; align-items:start; }
.tl-v49-month { border:1px solid var(--line); background:#101824; min-height:150px; padding:8px; display:grid; gap:6px; align-content:start; }
.tl-v49-month h4 { display:flex; justify-content:space-between; align-items:center; margin:0; color:var(--gold); border-bottom:1px solid var(--line-soft); padding-bottom:5px; }
.tl-v49-event { display:grid; grid-template-columns:44px minmax(0,1fr); gap:6px; align-items:start; border:1px solid var(--line-soft); background:#0b121d; color:var(--text); padding:7px; cursor:pointer; text-align:left; }
.tl-v49-date { display:grid; place-items:center; min-height:42px; border:1px solid rgba(255,194,71,.35); color:var(--gold); }
.tl-v49-date em { color:var(--muted); font-style:normal; }
.tl-v49-copy { display:grid; gap:3px; }
.tl-v49-copy small, .tl-v49-copy i { color:var(--muted); font-style:normal; }
.tl-v49-faces, .tl-v49-event .topic-pills { grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:4px; }
.tl-v49-more { border:1px solid var(--line-soft); color:var(--blue); background:#0a111c; padding:5px; cursor:pointer; }
.web-layout-v48 { grid-template-columns:minmax(0,1fr) 300px !important; align-items:start; }
.web-main-v48 { display:grid; gap:10px; min-width:0; }
.web-wrap { min-height:520px; }
.web-contacts { min-height:0 !important; }
.web-contacts .named-faces { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
.web-person-label { font-size:12px; fill:#dfe8f7; paint-order:stroke; stroke:#07101a; stroke-width:3px; stroke-linejoin:round; }
@media (max-width:1500px){ .pen-board-v49{grid-template-columns:repeat(3,minmax(0,1fr));} .tl-v49-grid{grid-template-columns:repeat(4,minmax(0,1fr));} .matrix-clusters-v49{grid-template-columns:repeat(2,minmax(0,1fr));} }
@media (max-width:900px){ .alert-list,.pen-kpis-v49,.pen-board-v49,.tl-v49-grid,.matrix-clusters-v49,.web-layout-v48{grid-template-columns:1fr !important;} .signal-card-v49,.org-profile-v49,.tl-v49-head{grid-template-columns:1fr !important;} .corr-wrap{grid-template-columns:56px repeat(var(--n), minmax(24px,1fr));} .corr-label{font-size:10px;} .pen-reps-v49,.signal-card-v49 .named-faces,.org-profile-v49 .named-faces{grid-template-columns:1fr;} }
'''
css_path.write_text(css)

# Add docs
notes = root/'docs/ITERATION_NOTES_v4.8.0.md'
notes.write_text('''# ParleyMap v4.8.0\n\nFinishing pass for the below-map intelligence layer.\n\n- Kept accepted map-first layout and core roadmovie functionality.\n- Reworked build alerts to show event, place, people and source links without oversized empty label blocks.\n- Added source-watch fallback layers so event families such as foreign-minister corridors and family-capital / imamat diplomacy show relevant public-anchor people rather than empty maps.\n- Rebuilt organisation penetration as compact KPI strip plus card grid.\n- Rebuilt influence timeline into a full-width month grid.\n- Added stronger UK-English copy in visible panels.\n- Added mild logo watermarks and smoother card/background motion.\n- Added no-cutoff text safeguards in intelligence panels.\n\nOpen technical notes: full archive still needs the networked live crawler and promotion pipeline; restricted signals stay internal until converted into safe public records.\n''')

# Recovery docs
recdir = root/'recovery'
recdir.mkdir(exist_ok=True)
(recdir/'RECOVERY_v4.8.0.md').write_text('''# Recovery summary v4.8.0\n\nAnchor state: v4.7 accepted UI remains intact. v4.8 only improves presentation and usability of the intelligence layer below the map. Use the complete GitHub zip for deployment.\n\nKey changes: alert cards, event-family fallbacks, organisation penetration redesign, influence timeline redesign, source labels, UK-English copy, no-cutoff CSS.\n''')

# Update README version strings
for p in [root/'README.md', root/'RECOVERY_v4.7.0.md']:
    if p.exists():
        txt = p.read_text(errors='ignore').replace('v4.7.0','v4.8.0')
        p.write_text(txt)
