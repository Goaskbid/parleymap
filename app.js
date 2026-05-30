:root {
  --bg: #060b13;
  --panel: #0d141f;
  --panel-2: #131c28;
  --line: #344255;
  --line-soft: #223044;
  --text: #eef4ff;
  --muted: #b6c1d1;
  --blue: #8ec7ff;
  --gold: #ffc247;
  --green: #8bd99a;
  --red: #ff8a82;
  --fs-s: 12px;
  --fs-m: 15px;
  --fs-l: 30px;
  --shadow: 0 22px 55px rgba(0,0,0,.45);
}
* { box-sizing: border-box; border-radius: 0 !important; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: radial-gradient(circle at 25% 0%, rgba(39,84,130,.26), transparent 34%), linear-gradient(120deg, #050912, #0c1420 56%, #060910);
  color: var(--text);
  font-family: "Arial Narrow", "Aptos Narrow", "Liberation Sans Narrow", Arial, sans-serif;
  font-size: var(--fs-m);
  line-height: 1.25;
  overflow-x: hidden;
}
body::before {
  content: "";
  position: fixed;
  inset: -20%;
  pointer-events: none;
  background:
    linear-gradient(115deg, transparent 0 46%, rgba(142,199,255,.05) 47%, transparent 49% 100%),
    radial-gradient(circle at 70% 30%, rgba(255,194,71,.08), transparent 28%);
  animation: drift 18s linear infinite alternate;
  z-index: -1;
}
@keyframes drift { from { transform: translate3d(-20px,-12px,0) rotate(-1deg); } to { transform: translate3d(20px,10px,0) rotate(1deg); } }
a { color: inherit; }
button, input, select { font: inherit; }
button { cursor: pointer; }
img { max-width: 100%; }
.skip-link { position: absolute; left: -999px; top: 0; padding: 10px; background: #fff; color: #000; z-index: 10000; }
.skip-link:focus { left: 12px; top: 12px; }
.site-header {
  position: sticky;
  top: 0;
  z-index: 9000;
  display: grid;
  grid-template-columns: minmax(260px, 380px) minmax(210px, 340px) minmax(310px, 520px) minmax(260px, 360px);
  gap: 18px;
  align-items: center;
  min-height: 126px;
  padding: 10px 22px;
  border-bottom: 1px solid var(--line);
  background: rgba(5,9,16,.94);
  backdrop-filter: blur(10px);
}
.brand-reset {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 108px;
  padding: 0;
  border: 0;
  background: transparent;
}
.brand-logo {
  width: min(370px, 100%);
  height: 106px;
  object-fit: contain;
  object-position: left center;
  display: block;
  filter: drop-shadow(0 14px 20px rgba(0,0,0,.4));
}
.header-copy strong, .timeline-head h1, .profile-card h2 { display: block; font-size: var(--fs-l); line-height: .92; letter-spacing: -.035em; }
.header-copy span, .partner-copy em, .header-status span, p, li, dd, .timeline-current, .rank-row span, .profile-body { font-size: var(--fs-m); }
.header-copy span { display: block; margin-top: 8px; color: var(--muted); max-width: 340px; }
.header-partner {
  display: grid;
  grid-template-columns: 114px 1fr 68px;
  align-items: center;
  gap: 14px;
  min-height: 70px;
  padding: 10px 12px;
  border: 1px solid rgba(255,194,71,.7);
  background: linear-gradient(90deg, rgba(255,194,71,.08), rgba(11,18,29,.9));
  text-decoration: none;
  overflow: hidden;
}
.cerebral-mark {
  display: grid;
  place-items: center;
  height: 48px;
  background: #fff;
  color: #d71920;
  font-size: var(--fs-l);
  font-style: italic;
  letter-spacing: -.05em;
}
.partner-copy strong { display: block; text-transform: uppercase; letter-spacing: .08em; }
.partner-copy em { display: block; color: var(--muted); font-style: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.partner-open { display: grid; place-items: center; height: 38px; border: 1px solid var(--line); text-transform: uppercase; font-weight: 900; }
.header-status { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-self: stretch; }
.header-status span { display: flex; flex-direction: column; justify-content: center; border: 1px solid var(--line); padding: 8px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; overflow: hidden; }
.header-status strong { color: var(--text); text-transform: none; letter-spacing: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.app-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 12px;
  padding: 14px;
}
.map-column { min-width: 0; }
.map-toolbar {
  display: grid;
  grid-template-columns: 170px minmax(220px, 1fr) 170px 120px;
  gap: 10px;
  margin-bottom: 10px;
}
.toolbar-button, .toolbar-primary, .toolbar-select, .filter-drawer input, .filter-drawer select, .timeline-controls button, .rank-row, .top20-chip, .source-link {
  border: 1px solid var(--line);
  background: #111925;
  color: var(--text);
  padding: 10px 12px;
  min-height: 42px;
}
.toolbar-primary, .timeline-controls button.is-playing, .timeline-controls button[data-action="speed"].is-fast { background: var(--gold); color: #080b10; border-color: var(--gold); font-weight: 900; text-transform: uppercase; }
.toolbar-select { width: 100%; }
.filter-drawer {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  border: 1px solid var(--line);
  background: rgba(12,18,29,.96);
  padding: 10px;
}
.filter-drawer label { display: grid; gap: 5px; color: var(--muted); font-size: var(--fs-s); text-transform: uppercase; letter-spacing: .08em; }
.filter-drawer .check { display: flex; align-items: end; gap: 8px; padding: 8px 0; }
.map-frame {
  position: sticky;
  top: 140px;
  height: min(72dvh, 760px);
  min-height: 560px;
  border: 1px solid var(--line);
  background: #0b111b;
  overflow: hidden;
  box-shadow: var(--shadow);
}
.map, .fallback-map { position: absolute; inset: 0; }
.fallback-map {
  display: block;
  background:
    radial-gradient(ellipse at 50% 45%, rgba(176,222,234,.88), rgba(158,205,220,.9)),
    linear-gradient(#a8d4e0, #9bcbd8);
  overflow: hidden;
}
.fallback-map::before {
  content: ""; position: absolute; inset: 0;
  background-image: linear-gradient(rgba(5,15,25,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(5,15,25,.12) 1px, transparent 1px);
  background-size: 8.333% 16.666%;
  opacity: .35;
}
.fallback-land { position: absolute; background: rgba(244,242,234,.94); border: 1px solid rgba(50,70,82,.3); box-shadow: 0 8px 22px rgba(0,0,0,.08); }
.map-status, .heat-key {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 600;
  display: flex;
  gap: 8px;
  align-items: center;
  background: rgba(9,16,25,.88);
  border: 1px solid var(--line);
  padding: 8px 10px;
  max-width: calc(100% - 28px);
}
.map-status span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.map-status span:last-child { color: var(--muted); }
.heat-key { left: auto; right: 14px; }
.heat-key span { width: 110px; height: 12px; background: linear-gradient(90deg, rgba(142,199,255,.2), #6fbfff, #142235, #ffc247); border: 1px solid rgba(255,255,255,.25); }
.heat-key em { color: var(--muted); font-style: normal; }
.start-strip, .timeline-panel, .side-rail > section, .info-panel, .footer {
  border: 1px solid var(--line);
  background: rgba(10,16,26,.96);
}
.start-strip { margin-top: 10px; padding: 10px; }
.strip-head { display: flex; justify-content: space-between; gap: 10px; color: var(--muted); }
.strip-head strong { color: var(--text); text-transform: uppercase; letter-spacing: .12em; }
.top20-list { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.top20-chip { display: grid; grid-template-columns: 34px 1fr; gap: 8px; align-items: center; text-align: left; min-height: 56px; padding: 7px; }
.avatar, .map-avatar { position: relative; display: grid; place-items: center; overflow: hidden; background: #26313f; border: 2px solid var(--avatar, var(--blue)); color: #fff; font-weight: 900; }
.avatar { width: 34px; height: 34px; }
.avatar img, .map-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-fallback { font-size: var(--fs-m); }
.flag-badge { position: absolute; right: -1px; bottom: -1px; display: grid; place-items: center; width: 18px; height: 14px; background: #fff; border: 1px solid #08111f; font-size: 12px; line-height: 1; overflow: hidden; }
.top20-chip strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top20-chip span { display: block; color: var(--muted); font-size: var(--fs-s); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.timeline-panel { margin-top: 10px; padding: 12px; }
.eyebrow { margin: 0 0 4px; color: var(--blue); text-transform: uppercase; letter-spacing: .16em; font-weight: 900; font-size: var(--fs-s); }
.timeline-head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: start; }
.timeline-head h1 { margin: 0 0 4px; }
.timeline-head p { margin: 0; color: var(--muted); }
.timeline-controls { display: grid; grid-template-columns: repeat(5, minmax(52px, 1fr)); gap: 6px; }
.timeline-controls button { min-height: 36px; padding: 7px 9px; }
.timeline-scrubber { width: 100%; accent-color: var(--gold); margin: 12px 0 8px; }
.timeline-current { border: 1px solid var(--line); background: #111925; padding: 10px; color: var(--text); }
.timeline-stops { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; margin-top: 10px; }
.timeline-stop { border: 1px solid var(--line); background: #111925; color: var(--text); text-align: left; min-height: 82px; padding: 8px; }
.timeline-stop.is-active { border-color: var(--gold); box-shadow: inset 0 0 0 1px var(--gold); }
.timeline-stop strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.timeline-stop span, .timeline-stop em { display: block; color: var(--muted); font-size: var(--fs-s); font-style: normal; margin-top: 3px; }
.counterparts { display: flex; gap: 3px; margin-top: 6px; }
.counterparts .mini-face { width: 22px; height: 22px; border: 1px solid var(--line); background: #26313f; overflow: hidden; display: grid; place-items: center; font-size: 10px; }
.counterparts img { width: 100%; height: 100%; object-fit: cover; }
.side-rail { position: sticky; top: 140px; align-self: start; max-height: calc(100dvh - 154px); overflow: auto; display: grid; gap: 10px; }
.profile-card, .rankings { padding: 12px; }
.profile-card h2 { margin: 0 0 8px; }
.profile-top { display: grid; grid-template-columns: 72px 1fr; gap: 10px; align-items: center; margin: 8px 0 12px; }
.profile-top .avatar { width: 72px; height: 72px; }
.profile-top h3 { margin: 0; font-size: var(--fs-l); line-height: .95; }
.profile-top p { margin: 4px 0 0; color: var(--muted); }
.pills { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0; }
.pill { border: 1px solid var(--line); background: #101824; color: var(--muted); padding: 5px 7px; font-size: var(--fs-s); text-transform: uppercase; letter-spacing: .06em; }
.bio-lines { display: grid; gap: 7px; margin-top: 10px; }
.bio-lines div { border-top: 1px solid var(--line-soft); padding-top: 7px; color: var(--muted); overflow-wrap: anywhere; }
.bio-lines strong { color: var(--text); }
.source-link { display: inline-flex; min-height: 0; padding: 6px 8px; margin: 4px 4px 0 0; color: var(--blue); text-decoration: none; }
.rankings details { border: 1px solid var(--line); margin-bottom: 8px; background: #0d141f; }
.rankings summary { padding: 12px; cursor: pointer; font-weight: 900; }
.rank-list { display: grid; gap: 6px; padding: 0 10px 10px; }
.rank-row { display: grid; grid-template-columns: 34px 1fr auto; gap: 8px; align-items: center; width: 100%; text-align: left; min-height: 54px; }
.rank-row strong, .rank-row span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-row em { color: var(--blue); font-style: normal; font-weight: 900; }
.below-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 0 14px 14px; }
.info-panel { padding: 14px; }
.info-panel h2 { margin: 0 0 8px; font-size: var(--fs-l); }
.info-panel p { margin: 0; color: var(--muted); }
.footer { margin: 0 14px 14px; padding: 12px 14px; color: var(--muted); }
.back-top { position: fixed; right: 18px; bottom: 18px; z-index: 9001; border: 1px solid var(--line); background: var(--gold); color: #080b10; padding: 10px 14px; font-weight: 900; display: none; }
.back-top.is-visible { display: block; }
.hover-card {
  position: fixed;
  z-index: 10000;
  width: min(320px, calc(100vw - 24px));
  max-height: 172px;
  overflow: hidden;
  border: 1px solid var(--gold);
  background: rgba(7,12,20,.96);
  box-shadow: 0 18px 45px rgba(0,0,0,.45);
  padding: 10px;
  pointer-events: none;
}
.hover-card strong { display: block; color: var(--text); font-size: var(--fs-m); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hover-card span { display: block; color: var(--muted); font-size: var(--fs-s); margin-top: 4px; }
.hover-card p { margin: 7px 0 0; color: var(--text); font-size: var(--fs-s); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.leaflet-container { background: #a9d6e1; font-family: inherit; }
.leaflet-control-zoom a { border-radius: 0 !important; }
.leaflet-tooltip.map-tip, .leaflet-popup-content-wrapper { background: rgba(7,12,20,.95); border: 1px solid var(--gold); color: var(--text); box-shadow: var(--shadow); border-radius: 0 !important; }
.leaflet-popup-content { margin: 10px; max-width: 280px; }
.map-marker { width: 96px; height: 62px; transform: translate(-48px,-31px); cursor: pointer; }
.map-marker-inner { position: relative; display: grid; grid-template-columns: 50px 1fr; align-items: center; gap: 6px; min-width: 96px; height: 62px; padding: 5px 7px; background: rgba(11,18,28,.88); border: 2px solid var(--avatar, var(--blue)); box-shadow: 0 12px 26px rgba(0,0,0,.42); }
.map-avatar { width: 42px; height: 42px; }
.map-name { display: block; max-width: 60px; color: #fff; font-weight: 900; font-size: var(--fs-s); line-height: 1.05; overflow: hidden; text-overflow: ellipsis; }
.map-role { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
.stop-marker { width: 34px; height: 34px; transform: translate(-17px,-17px); border: 2px solid var(--stop-color, var(--blue)); background: rgba(9,16,25,.92); display: grid; place-items: center; color: #fff; box-shadow: 0 10px 24px rgba(0,0,0,.4); cursor: pointer; }
.stop-marker.future { --stop-color: var(--gold); }
.stop-marker.home { --stop-color: var(--green); }
.stop-marker .stop-icon { font-size: var(--fs-m); }
.moving-chip { width: 70px; height: 70px; transform: translate(-35px,-35px); border: 3px solid var(--gold); background: rgba(5,10,18,.88); box-shadow: 0 0 0 8px rgba(255,194,71,.15), 0 18px 45px rgba(0,0,0,.5); overflow: hidden; display: grid; place-items: center; }
.moving-chip img { width: 100%; height: 100%; object-fit: cover; }
.moving-chip span { font-size: var(--fs-l); font-weight: 900; }
.route-arrow { stroke-linecap: round; stroke-linejoin: round; }
.route-arrow.future { stroke-dasharray: 7 7; }
.route-arrow.return { stroke-dasharray: 2 8; opacity: .38; }
.map-label { background: rgba(8,13,21,.92); color: var(--text); border: 1px solid var(--line); padding: 4px 6px; font-size: var(--fs-s); box-shadow: 0 10px 20px rgba(0,0,0,.24); }
.static-marker { position: absolute; z-index: 10; transform: translate(-50%,-50%); }
.static-marker .map-marker-inner { transform: scale(.95); }
.static-route { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
.static-heat { position: absolute; width: 220px; height: 220px; transform: translate(-50%,-50%); background: radial-gradient(circle, rgba(255,194,71,.5), rgba(111,191,255,.25) 42%, transparent 72%); opacity: .6; mix-blend-mode: multiply; }
@media (max-width: 1300px) {
  .site-header { grid-template-columns: 300px 1fr; }
  .header-partner { grid-column: 1 / 2; }
  .header-status { grid-column: 2 / 3; }
  .app-shell { grid-template-columns: 1fr; }
  .side-rail { position: static; max-height: none; grid-template-columns: 1fr 1fr; }
}
@media (max-width: 820px) {
  :root { --fs-s: 12px; --fs-m: 14px; --fs-l: 24px; }
  .site-header { position: static; grid-template-columns: 1fr; min-height: 0; padding: 10px; }
  .brand-reset { height: 102px; }
  .brand-logo { width: 100%; height: 100px; object-position: center; }
  .header-copy strong { font-size: var(--fs-l); }
  .header-partner { grid-template-columns: 98px 1fr 58px; }
  .header-status { grid-template-columns: 1fr; }
  .app-shell { padding: 8px; }
  .map-toolbar { grid-template-columns: 1fr; }
  .filter-drawer { grid-template-columns: 1fr; }
  .map-frame { position: sticky; top: 0; height: 64dvh; min-height: 430px; z-index: 10; }
  .top20-list { grid-template-columns: 1fr 1fr; }
  .timeline-head { grid-template-columns: 1fr; }
  .timeline-controls { grid-template-columns: repeat(3, 1fr); }
  .side-rail { grid-template-columns: 1fr; }
  .below-grid { grid-template-columns: 1fr; padding: 0 8px 8px; }
  .map-status { max-width: calc(100% - 28px); }
  .heat-key { display: none; }
}
@media (max-width: 520px) {
  .top20-list, .timeline-stops { grid-template-columns: 1fr; }
  .header-partner { grid-template-columns: 1fr; }
  .partner-open { display: none; }
}

/* v2.8 repair overrides */
.site-header {
  grid-template-columns: minmax(360px, 500px) minmax(260px, 370px) minmax(420px, 600px) minmax(260px, 420px);
  min-height: 118px;
  padding: 8px 22px;
}
.brand-reset { height: 108px; }
.brand-logo { width: min(500px, 100%); height: 108px; object-fit: contain; object-position: left center; }
.header-copy strong { max-width: 360px; }
.header-partner { grid-template-columns: 142px 1fr 64px; min-height: 66px; padding: 8px 12px; }
.partner-logo-box { display: grid; place-items: center; height: 48px; background: #fff; overflow: hidden; padding: 6px; }
.cerebral-logo { width: 124px; height: 36px; object-fit: contain; display: block; }
.header-status { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; align-self: center; }
.header-status span { border: 0; padding: 0; background: transparent; min-width: 76px; display: grid; gap: 2px; }
.header-status strong { max-width: 150px; }
.map-toolbar { grid-template-columns: 170px minmax(260px, 1fr) minmax(230px, 340px) 150px 112px; }
.toolbar-button, .toolbar-primary, .toolbar-select, .toolbar-search, .filter-drawer input, .filter-drawer select, .timeline-controls button, .rank-row, .top20-chip, .source-link { border: 1px solid var(--line); background: #111925; color: var(--text); padding: 10px 12px; min-height: 42px; }
.toolbar-search { width: 100%; }
.finder-wrap { position: relative; min-width: 0; }
.quick-results { position: absolute; z-index: 9500; left: 0; right: 0; top: calc(100% + 5px); max-height: 360px; overflow: auto; background: rgba(8,13,21,.98); border: 1px solid var(--gold); box-shadow: var(--shadow); }
.quick-hit { width: 100%; display: grid; grid-template-columns: 42px 1fr auto; gap: 9px; align-items: center; border: 0; border-bottom: 1px solid var(--line-soft); background: transparent; color: var(--text); padding: 8px 10px; text-align: left; }
.quick-hit strong, .quick-hit span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.quick-hit span, .quick-hit em, .quick-empty { color: var(--muted); font-style: normal; font-size: var(--fs-s); }
.quick-empty { padding: 10px; }
.filter-drawer { grid-template-columns: repeat(6, minmax(140px, 1fr)); }
.start-strip, .timeline-panel, .side-rail > section, .info-panel, .footer, .stats-dock { border: 1px solid var(--line); background: rgba(10,16,26,.96); }
.stats-dock { margin-top: 10px; padding: 10px; }
.stats-summary { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 8px; }
.stat-tile { border: 1px solid var(--line); background: #111925; padding: 9px; min-height: 56px; display: grid; align-content: center; gap: 3px; }
.stat-tile strong { display: block; font-size: var(--fs-l); line-height: .95; }
.stat-tile span { color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-size: var(--fs-s); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top20-list { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.top20-chip { grid-template-columns: 42px 1fr; min-height: 62px; }
.avatar { width: 42px; height: 42px; }
.avatar, .map-avatar, .mini-face { position: relative; display: grid; place-items: center; overflow: hidden; background: #26313f; border: 2px solid var(--avatar, var(--blue)); color: #fff; font-weight: 900; }
.avatar-photo { position: relative; display: block; width: 100%; height: 100%; overflow: hidden; background: #1b2635; }
.avatar-photo img, .avatar-svg, .mini-face img, .moving-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar-svg { position: absolute; }
.avatar-fallback { position: absolute; inset: auto 0 4px; text-align: center; font-size: var(--fs-s); color: rgba(255,255,255,.9); z-index: 1; }
.flag-img { display: inline-grid; place-items: center; vertical-align: -2px; width: 24px; height: 16px; background: #fff; border: 1px solid rgba(8,17,31,.9); overflow: hidden; color: #0b111b; font-size: var(--fs-s); font-weight: 900; }
.flag-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.flag-special { background: #162234; color: var(--text); border-color: var(--line); }
.flag-badge { position: absolute; right: -2px; bottom: -2px; width: 25px; height: 17px; padding: 0; background: transparent; border: 0; z-index: 4; }
.flag-badge .flag-img { width: 25px; height: 17px; }
.role-dot { display: inline-grid; place-items: center; width: 20px; height: 20px; border: 1px solid var(--line); margin-right: 4px; font-size: var(--fs-s); }
.map-marker { width: 142px; height: 70px; transform: translate(-71px,-35px); cursor: pointer; }
.map-marker-inner { grid-template-columns: 54px 1fr; min-width: 142px; height: 70px; gap: 8px; padding: 6px 8px; background: rgba(11,18,28,.92); }
.map-avatar { width: 50px; height: 50px; }
.map-name { max-width: 72px; font-size: var(--fs-s); }
.map-role { display: flex; align-items: center; gap: 4px; font-size: var(--fs-s); }
.stop-marker { width: 38px; height: 38px; transform: translate(-19px,-19px); position: relative; }
.stop-marker.current { width: 48px; height: 48px; transform: translate(-24px,-24px); border-color: var(--gold); box-shadow: 0 0 0 8px rgba(255,194,71,.18), 0 14px 32px rgba(0,0,0,.45); }
.stop-marker.old { opacity: .52; filter: grayscale(.45); }
.stop-marker.future { --stop-color: var(--gold); }
.stop-marker.return { --stop-color: #9ba6b5; opacity: .68; }
.stop-marker.base { --stop-color: var(--green); }
.stop-flag { position: absolute; right: -5px; bottom: -4px; }
.stop-flag .flag-img { width: 22px; height: 15px; }
.stop-icon { font-size: var(--fs-m); line-height: 1; }
.moving-chip { width: 92px; height: 94px; transform: translate(-46px,-64px); border: 3px solid var(--gold); background: rgba(5,10,18,.9); box-shadow: 0 0 0 8px rgba(255,194,71,.14), 0 18px 45px rgba(0,0,0,.52); overflow: visible; display: grid; place-items: start center; padding-top: 4px; }
.moving-photo { position: relative; width: 68px; height: 68px; overflow: hidden; border: 2px solid rgba(255,255,255,.72); background: #1a2635; }
.chip-name { position: absolute; left: 50%; bottom: -18px; transform: translateX(-50%); max-width: 126px; padding: 3px 7px; background: rgba(7,12,20,.95); border: 1px solid var(--gold); color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: var(--fs-s); }
.vehicle-chip { width: 42px; height: 30px; display: grid; place-items: center; background: rgba(255,194,71,.96); border: 2px solid #07101d; color: #07101d; box-shadow: 0 12px 28px rgba(0,0,0,.42); font-size: var(--fs-s); font-weight: 900; text-transform: uppercase; animation: vehiclePulse 1.6s ease-in-out infinite; }
@keyframes vehiclePulse { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.route-arrow { stroke-linecap: round; stroke-linejoin: round; transition: opacity .25s ease; }
.route-arrow.old { opacity: .28; }
.route-arrow.active { filter: drop-shadow(0 0 6px rgba(142,199,255,.35)); }
.route-arrow.future { stroke-dasharray: 8 8; }
.route-arrow.return { stroke-dasharray: 2 8; opacity: .38; }
.route-arrow.call-line { stroke-dasharray: 3 9; }
.timeline-stop.is-past { opacity: .62; }
.counterparts .mini-face { font-size: var(--fs-s); }
.profile-top .avatar { width: 72px; height: 72px; }
.rank-row { grid-template-columns: 36px 1fr auto; }
.hover-card span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 1500px) {
  .site-header { grid-template-columns: minmax(320px,420px) 1fr minmax(360px,520px); }
  .header-status { grid-column: 1 / -1; }
  .map-toolbar { grid-template-columns: 150px minmax(220px,1fr) minmax(200px,300px) 150px 100px; }
  .stats-summary { grid-template-columns: repeat(4, minmax(0,1fr)); }
}
@media (max-width: 1300px) {
  .site-header { grid-template-columns: 300px 1fr; }
  .header-partner { grid-column: 1 / -1; }
  .header-status { grid-column: 1 / -1; }
  .app-shell { grid-template-columns: 1fr; }
  .side-rail { position: static; max-height: none; grid-template-columns: 1fr 1fr; }
}
@media (max-width: 820px) {
  :root { --fs-s: 12px; --fs-m: 14px; --fs-l: 24px; }
  .site-header { position: static; grid-template-columns: 1fr; min-height: 0; padding: 10px; }
  .brand-reset { height: 120px; }
  .brand-logo { width: 100%; height: 118px; object-position: center; }
  .header-partner { grid-template-columns: 116px 1fr 56px; }
  .header-status { display: grid; grid-template-columns: 1fr; }
  .map-toolbar { grid-template-columns: 1fr; }
  .filter-drawer { grid-template-columns: 1fr; }
  .map-frame { position: sticky; top: 0; height: 64dvh; min-height: 430px; z-index: 10; }
  .top20-list { grid-template-columns: 1fr 1fr; }
  .stats-summary { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .timeline-head { grid-template-columns: 1fr; }
  .timeline-controls { grid-template-columns: repeat(3, 1fr); }
  .side-rail { grid-template-columns: 1fr; }
  .below-grid { grid-template-columns: 1fr; padding: 0 8px 8px; }
  .heat-key { display: none; }
}
@media (max-width: 520px) {
  .top20-list, .timeline-stops { grid-template-columns: 1fr; }
  .header-partner { grid-template-columns: 1fr; }
  .partner-open { display: none; }
}
.empty-note { border: 1px solid var(--line); background: #111925; color: var(--muted); padding: 10px; }
.stop-marker.old { opacity: .52; filter: grayscale(.8); }
.stop-marker.active { box-shadow: 0 0 0 6px rgba(142,199,255,.18), 0 16px 34px rgba(0,0,0,.45); }

/* v2.8 repair pass: cleaner header, visible search, fitted flags, below-map stats */
.site-header {
  grid-template-columns: minmax(360px, 430px) minmax(230px, 320px) minmax(360px, 1fr) auto;
  min-height: 132px;
  padding: 8px 22px;
}
.brand-reset { height: 118px; }
.brand-logo { width: min(430px, 100%); height: 118px; object-fit: contain; object-position: left center; }
.header-status { grid-template-columns: repeat(3, minmax(88px, 1fr)); gap: 12px; align-self: center; }
.header-status span { border: 0; padding: 0; background: transparent; min-width: 82px; }
.header-status strong { margin-top: 3px; }
.header-partner { grid-template-columns: 132px minmax(0, 1fr) 58px; min-height: 64px; }
.cerebral-mark { height: 46px; font-size: var(--fs-l); background: #fff; }
.map-toolbar { grid-template-columns: 160px minmax(210px, 330px) minmax(250px, 1fr) 150px 110px; align-items: stretch; }
.finder-wrap { position: relative; min-width: 0; }
.quick-search { width: 100%; height: 100%; min-height: 42px; border: 1px solid var(--line); background: #111925; color: var(--text); padding: 10px 12px; }
.quick-results { position: absolute; z-index: 8500; top: calc(100% + 4px); left: 0; right: 0; max-height: 430px; overflow: auto; border: 1px solid var(--gold); background: rgba(7,12,20,.98); box-shadow: var(--shadow); padding: 6px; }
.quick-hit { width: 100%; display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 54px; padding: 7px; border: 1px solid var(--line-soft); background: #101824; color: var(--text); text-align: left; }
.quick-hit + .quick-hit { margin-top: 5px; }
.quick-hit strong, .quick-hit span span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.quick-hit em { color: var(--blue); font-style: normal; font-size: var(--fs-s); text-transform: uppercase; }
.quick-empty, .empty-note { border: 1px solid var(--line-soft); padding: 10px; color: var(--muted); background: #101824; }
.metrics-board { border: 1px solid var(--line); background: rgba(10,16,26,.96); margin-top: 10px; padding: 10px; }
.dataset-summary { display: grid; grid-template-columns: repeat(8, minmax(88px, 1fr)); gap: 8px; margin-top: 10px; }
.stat-tile { border: 1px solid var(--line); background: #101824; padding: 10px; min-height: 64px; }
.stat-tile strong { display: block; font-size: var(--fs-l); line-height: .92; }
.stat-tile span { display: block; color: var(--muted); font-size: var(--fs-s); text-transform: uppercase; letter-spacing: .08em; margin-top: 6px; }
.flag-img { display: inline-grid; place-items: center; width: 22px; height: 15px; vertical-align: -2px; overflow: hidden; margin-right: 5px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: var(--text); font-size: 13px; line-height: 1; }
.flag-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.flag-special { background: #101824; }
.flag-badge { width: 22px; height: 16px; background: #0a1019; border: 1px solid #fff; padding: 0; }
.flag-badge .flag-img { width: 100%; height: 100%; margin: 0; border: 0; background: transparent; }
.stop-flag { position: absolute; right: -5px; bottom: -5px; }
.stop-flag .flag-img { margin: 0; width: 22px; height: 15px; box-shadow: 0 6px 12px rgba(0,0,0,.45); }
.avatar-photo { position: relative; width: 100%; height: 100%; display: grid; place-items: center; overflow: hidden; background: #101825; }
.avatar-photo img, .avatar-photo .avatar-svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.avatar-photo img { z-index: 2; }
.avatar-fallback { position: relative; z-index: 1; color: #fff; font-weight: 900; }
.map-avatar .avatar-photo, .avatar .avatar-photo, .moving-photo .avatar-photo, .mini-face .avatar-photo { width: 100%; height: 100%; }
.vehicle-chip, .vehicle-marker { width: 34px; height: 34px; display: grid; place-items: center; background: rgba(5,10,16,.9); border: 2px solid var(--gold); box-shadow: 0 10px 22px rgba(0,0,0,.42); color: #fff; font-size: var(--fs-m); }
.route-arrow.old { opacity: .35; }
.route-arrow.call-line { stroke: #ff5b55; }
.timeline-stop.is-past { opacity: .72; }
.moving-chip { position: relative; }
.moving-chip .flag-badge { right: 4px; bottom: 16px; }
.chip-name { position: absolute; left: 50%; bottom: -1px; transform: translateX(-50%); max-width: 86px; min-width: 70px; background: rgba(5,10,16,.92); border: 1px solid var(--line); padding: 2px 4px; color: #fff; font-size: var(--fs-s); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.map-label { max-width: 150px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

@media (max-width: 1220px) {
  .site-header { grid-template-columns: minmax(280px, 360px) 1fr; gap: 10px; }
  .header-partner, .header-status { grid-column: 1 / -1; }
  .map-toolbar { grid-template-columns: 1fr 1fr; }
  .finder-wrap, .toolbar-select { min-height: 42px; }
  .dataset-summary { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 760px) {
  .site-header { position: relative; grid-template-columns: 1fr; min-height: 0; padding: 8px 10px; }
  .brand-reset { height: auto; }
  .brand-logo { height: auto; max-height: 120px; width: 100%; }
  .header-copy strong { font-size: var(--fs-l); }
  .header-partner { grid-template-columns: 110px 1fr; }
  .partner-open { display: none; }
  .header-status { grid-template-columns: 1fr; }
  .app-shell { grid-template-columns: 1fr; padding: 10px; }
  .map-toolbar { grid-template-columns: 1fr; }
  .filter-drawer { grid-template-columns: 1fr; }
  .map-frame { position: relative; top: auto; height: 66dvh; min-height: 420px; }
  .side-rail { position: relative; top: auto; max-height: none; }
  .top20-list { grid-template-columns: 1fr 1fr; }
  .dataset-summary { grid-template-columns: 1fr 1fr; }
  .below-grid { grid-template-columns: 1fr; }
}


/* v2.8 repair pass: cleaner header, no header stat boxes, fitted flags, smoother map objects. */
.site-header {
  grid-template-columns: minmax(360px, 500px) minmax(230px, 360px) minmax(390px, 560px) minmax(250px, 360px);
  min-height: 118px;
  padding: 8px 18px;
  gap: 18px;
}
.brand-reset { height: 104px; }
.brand-logo { width: min(520px, 100%); height: 104px; object-fit: contain; object-position: left center; }
.header-copy strong { max-width: 360px; font-size: var(--fs-l); line-height: 1; }
.header-copy span { max-width: 360px; margin-top: 7px; }
.header-partner { min-height: 64px; grid-template-columns: 132px 1fr 60px; }
.partner-logo-box { background: #fff; display: grid; place-items: center; height: 46px; padding: 5px; overflow: hidden; }
.cerebral-logo { width: 122px; height: 34px; object-fit: contain; display: block; }
.header-status { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; justify-content: flex-end; align-self: center; }
.header-status span { border: 0; background: transparent; padding: 0; min-width: 78px; color: var(--muted); display: grid; gap: 1px; }
.header-status strong { max-width: 132px; color: var(--text); }
.map-toolbar { grid-template-columns: 160px minmax(270px, 1fr) minmax(240px, 340px) 150px 108px; }
.flag-img { background: transparent; border: 0; width: 24px; height: 18px; font-size: 18px; line-height: 1; overflow: hidden; }
.flag-badge { right: -4px; bottom: -4px; width: 28px; height: 20px; background: rgba(7,12,20,.92); border: 1px solid rgba(255,255,255,.55); display: grid; place-items: center; }
.flag-badge .flag-img { width: 24px; height: 17px; font-size: 17px; }
.stop-flag { right: -7px; bottom: -7px; }
.stop-flag .flag-img { width: 22px; height: 16px; font-size: 15px; }
.avatar-photo img { z-index: 2; opacity: 0; transition: opacity .22s ease; }
.avatar-photo.has-photo img { opacity: 1; }
.avatar-svg { z-index: 1; }
.map-marker-inner { pointer-events: auto; }
.map-marker:hover .map-marker-inner, .top20-chip:hover, .quick-hit:hover { border-color: var(--gold); box-shadow: 0 14px 34px rgba(0,0,0,.5); }
.vehicle-chip { width: 38px; height: 30px; font-size: 18px; text-transform: none; border-color: rgba(7,16,30,.95); }
.route-arrow.old { opacity: .22; }
.stop-marker.old { opacity: .42; filter: grayscale(.9); }
.stats-dock { margin-top: 10px; }
.stats-summary { display: grid; grid-template-columns: repeat(8, minmax(0,1fr)); gap: 8px; }
.stat-tile { min-width: 0; }
.hover-card { max-height: 150px; }
.hover-card p { -webkit-line-clamp: 3; }
@media (max-width: 1500px) {
  .site-header { grid-template-columns: minmax(330px, 440px) 1fr minmax(360px, 520px); }
  .header-status { grid-column: 1 / -1; justify-content: flex-start; }
  .map-toolbar { grid-template-columns: 150px minmax(230px,1fr) minmax(210px,310px) 150px 100px; }
}
@media (max-width: 1080px) {
  .site-header { grid-template-columns: 1fr 1fr; }
  .header-partner, .header-status { grid-column: 1 / -1; }
  .map-toolbar { grid-template-columns: 1fr 1fr; }
  .finder-wrap, .toolbar-select { grid-column: span 2; }
  .stats-summary { grid-template-columns: repeat(4, minmax(0,1fr)); }
}
@media (max-width: 820px) {
  .site-header { position: static; grid-template-columns: 1fr; min-height: 0; padding: 8px; }
  .brand-reset { height: 118px; justify-content: center; }
  .brand-logo { width: 100%; height: 116px; object-position: center; }
  .header-copy strong { font-size: var(--fs-l); }
  .header-partner { grid-template-columns: 116px 1fr 54px; }
  .header-status { justify-content: flex-start; }
  .map-toolbar { grid-template-columns: 1fr; }
  .finder-wrap, .toolbar-select { grid-column: auto; }
  .stats-summary { grid-template-columns: repeat(2, minmax(0,1fr)); }
}

/* v2.8 final face/flag visibility fix */
.avatar-photo img, .moving-photo img, .mini-face img { opacity: 1 !important; }
.partner-logo-box { background: #fff; padding: 4px; overflow: hidden; }
.cerebral-logo { width: 100%; height: 46px; object-fit: contain; object-position: left center; }
/* v2.8 toolbar search alias used by the slim toolbar template. */
.toolbar-search {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--line);
  background: #111925;
  color: var(--text);
  padding: 10px 12px;
  outline: 0;
}
.toolbar-search:focus { border-color: var(--gold); box-shadow: inset 0 -2px 0 rgba(255,190,64,.45); }

/* v2.9 face pass: every map marker and card keeps a visible face tile, with live portraits layered on top when available. */
.avatar, .map-avatar, .moving-photo, .mini-face, .rank-face {
  background: #111a28;
  border-color: var(--avatar, var(--blue));
  overflow: visible;
}
.avatar-photo {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #101825;
}
.avatar-photo .avatar-svg,
.avatar-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-photo .avatar-svg { z-index: 1; }
.avatar-photo img { z-index: 2; opacity: 1 !important; }
.avatar-photo.has-photo .avatar-svg { opacity: 0; }
.flag-img,
.flag-emoji {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 18px;
  margin-right: 5px;
  border: 0;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  vertical-align: -3px;
  overflow: hidden;
}
.flag-badge {
  right: -5px;
  bottom: -5px;
  width: 28px;
  height: 21px;
  padding: 0;
  background: rgba(7,12,20,.96);
  border: 1px solid rgba(255,255,255,.72);
  display: grid;
  place-items: center;
  box-shadow: 0 6px 12px rgba(0,0,0,.42);
}
.flag-badge .flag-img {
  width: 24px;
  height: 17px;
  margin: 0;
  font-size: 17px;
}
.map-marker { width: 152px; height: 72px; transform: translate(-76px,-36px); }
.map-marker-inner { grid-template-columns: 56px minmax(0, 1fr); min-width: 152px; height: 72px; }
.map-avatar { width: 48px; height: 48px; border-width: 2px; box-shadow: 0 8px 22px rgba(0,0,0,.35); }
.map-name { max-width: 74px; }
.profile-top .avatar { width: 82px; height: 82px; }
.rank-row.person-rank {
  grid-template-columns: 28px 38px minmax(0,1fr) auto;
  min-height: 62px;
}
.rank-row.city-row { grid-template-columns: 38px minmax(0,1fr) auto; }
.rank-no { color: var(--muted); font-weight: 900; text-align: center; }
.rank-face { width: 38px; height: 38px; display: grid; place-items: center; position: relative; border: 2px solid var(--avatar, var(--blue)); }
.rank-face .flag-badge { width: 22px; height: 16px; right: -4px; bottom: -4px; }
.rank-face .flag-badge .flag-img { width: 19px; height: 14px; font-size: 14px; }
.timeline-stop-head { display: grid; grid-template-columns: 24px minmax(0,1fr); align-items: center; gap: 6px; }
.timeline-stop-head .mini-face { width: 24px; height: 24px; }
.timeline-stop strong { min-width: 0; }
.mini-face { position: relative; }
.counterparts .mini-face { position: relative; }
.quick-hit .avatar, .top20-chip .avatar { position: relative; }
.hover-card { width: min(300px, calc(100vw - 24px)); max-height: 138px; }
@media (max-width: 820px) {
  .map-marker { width: 132px; height: 66px; transform: translate(-66px,-33px); }
  .map-marker-inner { grid-template-columns: 50px minmax(0,1fr); min-width: 132px; height: 66px; }
  .map-avatar { width: 43px; height: 43px; }
  .rank-row.person-rank { grid-template-columns: 24px 34px minmax(0,1fr); }
  .rank-row.person-rank em { grid-column: 3; justify-self: start; }
}

/* v3.0: polish pass for roadmovie, flags, portraits, and header */
.site-header {
  grid-template-columns: minmax(420px, 560px) minmax(260px, 390px) minmax(380px, 560px) minmax(260px, 340px);
  min-height: 126px;
  padding: 8px 22px;
  gap: 20px;
}
.brand-reset { height: 116px; align-items: center; }
.brand-logo { width: min(560px, 100%); height: 116px; object-fit: contain; object-position: left center; }
.header-copy strong { font-size: var(--fs-l); line-height: .95; max-width: 390px; }
.header-copy span { max-width: 390px; }
.header-partner { min-height: 68px; grid-template-columns: 138px minmax(0,1fr) 58px; }
.partner-logo-box { height: 50px; }
.cerebral-logo { width: 132px; height: 38px; }
.header-status { border: 0; background: transparent; }
.header-status span { border: 0 !important; background: transparent !important; padding: 0 !important; }
.map-frame { background: #a9d6e1; }
.map-marker { width: 162px; height: 76px; transform: translate(-81px,-38px); }
.map-marker-inner {
  grid-template-columns: 58px minmax(0,1fr);
  min-width: 162px;
  height: 76px;
  padding: 6px 8px;
  background: rgba(7,12,20,.94);
  border-width: 2px;
}
.map-avatar { width: 50px; height: 50px; border: 2px solid rgba(255,255,255,.18); }
.map-name { max-width: 84px; font-size: var(--fs-m); line-height: .96; }
.map-role { display: flex; align-items: center; gap: 5px; min-height: 18px; }
.flag-img {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 18px;
  margin-right: 5px;
  vertical-align: -3px;
  overflow: hidden;
  background: #f7f7f7;
  border: 1px solid rgba(5,9,16,.85);
  color: transparent;
  line-height: 1;
  box-shadow: 0 1px 0 rgba(255,255,255,.25) inset;
}
.flag-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.flag-special { color: #fff; background: #1b2b44; font-size: 14px; }
.flag-badge {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 28px;
  height: 20px;
  padding: 0;
  display: grid;
  place-items: center;
  background: #07101d;
  border: 1px solid #fff;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0,0,0,.45);
}
.flag-badge .flag-img { width: 100%; height: 100%; margin: 0; border: 0; box-shadow: none; }
.stop-marker {
  position: relative;
  width: 42px;
  height: 42px;
  transform: translate(-21px,-21px);
  overflow: visible;
  background: rgba(8,14,22,.96);
  border: 2px solid var(--stop-color, var(--blue));
  box-shadow: 0 12px 26px rgba(0,0,0,.46);
}
.stop-marker.current {
  width: 54px;
  height: 54px;
  transform: translate(-27px,-27px);
  border-color: var(--gold);
  box-shadow: 0 0 0 8px rgba(255,194,71,.18), 0 16px 38px rgba(0,0,0,.55);
}
.stop-photo {
  position: absolute;
  inset: 3px;
  display: block;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.22);
  background: #111925;
}
.stop-marker.old .stop-photo { filter: grayscale(.9); opacity: .70; }
.stop-symbol {
  position: absolute;
  right: -7px;
  top: -7px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  background: var(--gold);
  color: #07101d;
  border: 1px solid #07101d;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 5px 10px rgba(0,0,0,.4);
}
.stop-flag { position: absolute; right: -7px; bottom: -7px; }
.stop-flag .flag-img { width: 26px; height: 18px; margin: 0; }
.moving-chip {
  width: 94px;
  height: 98px;
  transform: translate(-47px,-68px);
  border-color: var(--gold);
  background: rgba(5,10,18,.94);
}
.moving-photo { width: 76px; height: 76px; display: block; overflow: hidden; margin: 4px auto 0; border: 1px solid rgba(255,255,255,.22); }
.vehicle-chip {
  width: 44px;
  height: 34px;
  background: rgba(255,194,71,.96);
  color: #07101d;
  border: 2px solid #07101d;
  font-size: 20px;
  box-shadow: 0 14px 28px rgba(0,0,0,.45);
  animation: none;
}
.route-arrow { transition: opacity .45s ease, stroke-width .45s ease; }
.route-arrow.old { opacity: .24; }
.route-arrow.active { filter: drop-shadow(0 0 8px rgba(142,199,255,.45)); }
.route-arrow.call-line { stroke: #ff4d46; }
.map-label { max-width: 120px; font-size: var(--fs-s); padding: 3px 5px; opacity: .92; }
.timeline-current {
  display: grid;
  grid-template-columns: 58px minmax(0,1fr);
  gap: 10px;
  align-items: start;
  min-height: 86px;
}
.current-face { position: relative; width: 58px; height: 58px; overflow: hidden; border: 2px solid var(--gold); background: #101824; }
.current-copy { display: grid; gap: 5px; min-width: 0; }
.current-copy strong { display: block; white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.12; }
.with-line { color: var(--muted); }
.with-line b { color: var(--text); }
.source-pills { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.source-pills .source-link { margin: 0; }
.timeline-stops { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.timeline-stop { min-height: 94px; }
.timeline-stop-head { grid-template-columns: 28px minmax(0,1fr); }
.timeline-stop-head .mini-face, .mini-face { width: 28px; height: 28px; }
.timeline-stop span, .timeline-stop em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-row.person-rank { grid-template-columns: 28px 42px minmax(0,1fr) auto; }
.rank-face { width: 42px; height: 42px; }
.profile-top .avatar { width: 86px; height: 86px; }
.hover-card {
  width: min(330px, calc(100vw - 24px));
  max-height: 150px;
  padding: 9px 10px;
}
.hover-card p { -webkit-line-clamp: 3; }
.source-link { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
.leaflet-control-attribution { font-size: 10px !important; }
@media (max-width: 1500px) {
  .site-header { grid-template-columns: minmax(340px, 440px) minmax(230px, 330px) minmax(320px, 1fr); }
  .header-status { grid-column: 1 / -1; justify-content: flex-start; }
}
@media (max-width: 1050px) {
  .site-header { grid-template-columns: 1fr 1fr; position: static; }
  .header-partner, .header-status { grid-column: 1 / -1; }
  .map-marker { width: 136px; height: 68px; transform: translate(-68px,-34px); }
  .map-marker-inner { grid-template-columns: 50px minmax(0,1fr); min-width: 136px; height: 68px; }
  .map-avatar { width: 44px; height: 44px; }
  .map-name { max-width: 70px; }
}
@media (max-width: 760px) {
  .site-header { grid-template-columns: 1fr; padding: 8px 10px; }
  .brand-logo { width: 100%; height: auto; max-height: 132px; }
  .header-copy strong { max-width: none; }
  .header-partner { grid-template-columns: 120px 1fr; }
  .map-frame { height: 66dvh; min-height: 430px; }
  .timeline-current { grid-template-columns: 46px minmax(0,1fr); }
  .current-face { width: 46px; height: 46px; }
  .timeline-stops { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px) {
  .timeline-stops, .top20-list { grid-template-columns: 1fr; }
  .header-partner { grid-template-columns: 1fr; }
}

/* v3.1: flag icons, summit pills, stop briefings, calmer roadmovie */
.site-header {
  grid-template-columns: minmax(360px, 520px) minmax(260px, 390px) minmax(360px, 1fr) minmax(220px, 300px);
  min-height: 118px;
  padding: 7px 18px;
}
.brand-reset { height: 104px; }
.brand-logo { height: 104px; width: min(520px, 100%); }
.header-status { display: flex; gap: 22px; align-items: center; justify-content: flex-end; }
.header-status span { min-width: 0; }
.header-partner { min-height: 64px; }
.map-toolbar { grid-template-columns: 160px minmax(240px,1fr) minmax(230px,360px) 150px 108px; }
.summit-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 0 10px;
  scrollbar-width: thin;
}
.summit-pill {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 28px minmax(150px, 1fr) auto;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 2px 8px;
  min-width: 285px;
  max-width: 360px;
  border: 1px solid rgba(255,194,71,.62);
  background: linear-gradient(90deg, rgba(255,194,71,.10), rgba(17,25,37,.98));
  color: var(--text);
  padding: 8px 10px;
  text-align: left;
}
.summit-pill .summit-icon { grid-row: 1 / 3; width: 28px; height: 28px; display: grid; place-items: center; background: var(--gold); color: #07101d; font-weight: 900; }
.summit-pill strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.summit-pill em { grid-column: 2; color: var(--muted); font-style: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.summit-faces { grid-column: 3; grid-row: 1 / 3; display: flex; max-width: 92px; overflow: hidden; }
.summit-faces .mini-face { margin-left: -6px; border: 1px solid #07101d; }
.flag-img.flag-svg {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 19px;
  margin-right: 5px;
  background: transparent;
  border: 1px solid rgba(255,255,255,.38);
  overflow: hidden;
  box-shadow: 0 5px 10px rgba(0,0,0,.25);
  vertical-align: -4px;
  color: transparent;
}
.flag-img.flag-svg svg { width: 100%; height: 100%; display: block; }
.flag-badge {
  width: 30px;
  height: 22px;
  right: -5px;
  bottom: -5px;
  border: 1px solid rgba(255,255,255,.72);
  background: rgba(5,9,16,.82);
  box-shadow: 0 7px 14px rgba(0,0,0,.45);
}
.flag-badge .flag-img.flag-svg { width: 28px; height: 20px; margin: 0; border: 0; box-shadow: none; }
.map-marker { width: 170px; height: 78px; transform: translate(-85px,-39px); }
.map-marker-inner { min-width: 170px; height: 78px; grid-template-columns: 58px minmax(0,1fr); }
.map-avatar { width: 52px; height: 52px; }
.map-name { max-width: 92px; }
.stop-marker.old { filter: grayscale(.84); opacity: .66; }
.stop-marker.return { border-color: #96a3b2; background: rgba(14,20,29,.82); }
.stop-marker.call { border-color: #ff625c; }
.stop-marker.future { border-color: var(--gold); }
.vehicle-chip {
  width: 46px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 2px solid #07101d;
  background: linear-gradient(180deg, #ffe39b, #ffc247);
  color: #07101d;
  font-weight: 900;
  font-size: 20px;
  box-shadow: 0 16px 32px rgba(0,0,0,.44);
  will-change: transform;
}
.route-arrow.active { filter: drop-shadow(0 0 9px rgba(255,194,71,.32)); }
.route-arrow.call-line { stroke-dasharray: 3 9; }
.phone-party {
  position: relative;
  display: grid;
  grid-template-columns: 40px minmax(0,1fr);
  gap: 6px;
  align-items: center;
  width: 100px;
  min-height: 54px;
  background: rgba(7,12,20,.95);
  border: 2px solid #ff5b55;
  padding: 5px 6px;
  box-shadow: 0 15px 30px rgba(0,0,0,.42);
}
.phone-face { position: relative; width: 38px; height: 38px; overflow: hidden; border: 1px solid rgba(255,255,255,.25); }
.phone-ring { position: absolute; right: -8px; top: -8px; width: 25px; height: 25px; display: grid; place-items: center; background: #ff5b55; color: #fff; font-weight: 900; }
.phone-party b { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: .95; }
.phone-party.is-ringing::before,
.phone-party.is-ringing::after { content: ""; position: absolute; inset: -8px; border: 2px solid rgba(255,91,85,.75); animation: phoneRing 1.4s ease-out infinite; pointer-events: none; }
.phone-party.is-ringing::after { animation-delay: .55s; }
@keyframes phoneRing { from { opacity: .82; transform: scale(.9); } to { opacity: 0; transform: scale(1.26); } }
.step-brief {
  position: absolute;
  z-index: 850;
  left: 18px;
  top: 18px;
  width: min(420px, calc(100% - 36px));
  background: rgba(7,12,20,.95);
  border: 1px solid rgba(255,194,71,.75);
  box-shadow: 0 22px 50px rgba(0,0,0,.52);
  padding: 12px;
  animation: briefIn .24s ease-out;
}
@keyframes briefIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
.brief-head { display: grid; grid-template-columns: 34px minmax(0,1fr); gap: 9px; align-items: start; }
.brief-icon { width: 34px; height: 34px; display: grid; place-items: center; background: var(--gold); color: #07101d; font-weight: 900; }
.brief-head strong { display: block; white-space: normal; line-height: 1.1; }
.brief-head span { color: var(--muted); display: block; margin-top: 2px; }
.step-brief p, .briefing-card p { margin: 8px 0; color: var(--text); }
.brief-who { color: var(--muted); }
.brief-who b { color: var(--text); }
.brief-faces { margin: 7px 0 2px; }
.brief-timer { display: block; margin-top: 7px; color: var(--muted); font-style: normal; font-size: var(--fs-s); }
.briefing-log { margin-top: 12px; border-top: 1px solid var(--line-soft); padding-top: 10px; }
.briefing-stack { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; margin-top: 8px; }
.briefing-card { border: 1px solid var(--line); background: #111925; padding: 9px; min-width: 0; }
.briefing-card .source-pills { margin-top: 6px; }
.source-note { color: var(--muted); font-size: var(--fs-s); }
.source-link.newspaper { border-color: rgba(142,199,255,.65); color: #b8ddff; }
.summit-profile h3 { margin: 0 0 6px; font-size: var(--fs-l); line-height: 1; }
.summit-attendees { display: grid; gap: 6px; margin: 10px 0; }
.summit-attendees button { display: grid; grid-template-columns: 32px minmax(0,1fr); align-items: center; gap: 8px; background: #111925; color: var(--text); border: 1px solid var(--line); padding: 6px; text-align: left; }
.summit-attendees span:last-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stats-dock { margin-top: 10px; }
@media (max-width: 1500px) {
  .site-header { grid-template-columns: minmax(300px,430px) minmax(240px,330px) minmax(330px,1fr); }
  .header-status { grid-column: 1 / -1; justify-content: flex-start; }
}
@media (max-width: 1180px) {
  .map-toolbar { grid-template-columns: 1fr 1fr; }
  .finder-wrap, #roster-select { grid-column: span 2; }
  .toolbar-primary, #toggle-drawer { grid-column: span 1; }
}
@media (max-width: 760px) {
  .site-header { grid-template-columns: 1fr; }
  .brand-logo { height: auto; max-height: 105px; }
  .header-status { justify-content: flex-start; flex-wrap: wrap; gap: 12px; }
  .summit-pill { min-width: 260px; }
  .map-toolbar { grid-template-columns: 1fr; }
  .finder-wrap, #roster-select, .toolbar-primary, #toggle-drawer { grid-column: auto; }
  .step-brief { left: 10px; top: 10px; width: calc(100% - 20px); }
  .briefing-stack { grid-template-columns: 1fr; }
}

/* v3.2 audit pass: map first, profile-only rail, below-map intelligence, selected-person roadmovie launch. */
.map-toolbar {
  grid-template-columns: 138px 180px minmax(250px, 1fr) minmax(220px, 330px) 210px 96px;
  align-items: stretch;
}
.compact-select { min-width: 0; }
.toolbar-primary {
  white-space: normal;
  line-height: 1.05;
  padding-left: 10px;
  padding-right: 10px;
}
.toolbar-primary.has-target {
  background: linear-gradient(90deg, #ffc247, #ffe09a);
  color: #07101d;
  box-shadow: inset 0 -3px 0 rgba(0,0,0,.22), 0 0 0 1px rgba(255,255,255,.12);
}
.app-shell {
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: start;
}
.map-frame {
  position: relative;
  top: auto;
  height: min(70dvh, 760px);
  min-height: 570px;
}
.side-rail,
.profile-rail {
  position: relative;
  top: auto;
  max-height: none;
  overflow: visible;
  align-self: start;
}
.profile-rail .profile-card {
  min-height: 280px;
}
.map-role {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 17px;
}
.role-dot {
  display: inline-grid;
  place-items: center;
  width: 17px;
  height: 17px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.16);
  color: var(--gold);
  flex: 0 0 auto;
}
.role-word {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--muted);
  font-size: var(--fs-s);
}
.map-marker-inner .flag-badge {
  right: -6px;
  bottom: -6px;
}
.intelligence-deck {
  margin-top: 12px;
  border: 1px solid var(--line);
  background: rgba(10,16,26,.96);
  padding: 12px;
}
.intel-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 14px;
  align-items: end;
  border-bottom: 1px solid var(--line-soft);
  padding-bottom: 10px;
  margin-bottom: 10px;
}
.intel-head .eyebrow { grid-column: 1 / -1; margin: 0; }
.intel-head h2 {
  margin: 0;
  font-size: var(--fs-l);
  line-height: .95;
}
.intel-head span {
  color: var(--muted);
  text-align: right;
}
.intel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.intel-panel {
  min-width: 0;
  border: 1px solid var(--line);
  background: #0d141f;
  padding: 10px;
}
.intel-panel h3 {
  margin: 0 0 8px;
  font-size: var(--fs-m);
  text-transform: uppercase;
  letter-spacing: .09em;
  color: var(--text);
}
.intel-panel .rank-list {
  padding: 0;
}
.intel-panel .rank-row {
  min-height: 56px;
  padding: 7px;
  background: #111925;
}
.stats-dock .strip-head span,
.start-strip .strip-head span {
  text-align: right;
}
.header-status span {
  border: 0 !important;
  background: transparent !important;
  padding: 0 !important;
}
.map-status {
  max-width: min(760px, calc(100% - 28px));
}
.map-status span:first-child {
  font-weight: 900;
}
.top20-list {
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}
.source-link.jump-link {
  cursor: pointer;
}
@media (max-width: 1500px) {
  .site-header { grid-template-columns: minmax(300px, 430px) minmax(230px, 330px) minmax(330px, 1fr); }
  .header-status { grid-column: 1 / -1; justify-content: flex-start; }
  .map-toolbar { grid-template-columns: 130px 170px minmax(240px, 1fr) minmax(210px, 300px) 190px 90px; }
}
@media (max-width: 1180px) {
  .app-shell { grid-template-columns: 1fr; }
  .map-toolbar { grid-template-columns: 1fr 1fr; }
  #roster-select, .finder-wrap { grid-column: span 2; }
  .toolbar-primary, #toggle-drawer { grid-column: span 1; }
  .side-rail { grid-template-columns: 1fr; }
  .intel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .map-frame { height: 68dvh; }
}
@media (max-width: 760px) {
  .map-toolbar { grid-template-columns: 1fr; }
  #roster-select, .finder-wrap, .toolbar-primary, #toggle-drawer { grid-column: auto; }
  .map-frame { min-height: 430px; height: 65dvh; }
  .intel-head { grid-template-columns: 1fr; }
  .intel-head span { text-align: left; }
  .intel-grid { grid-template-columns: 1fr; }
  .stats-dock .strip-head, .start-strip .strip-head { display: grid; gap: 4px; }
  .stats-dock .strip-head span, .start-strip .strip-head span { text-align: left; }
}
/* v3.4 high-signal agenda and speech expansion; the v3.2 cockpit remains the visual anchor. */
.intel-panel.wide { grid-column: span 3; }
.agenda-list { display: grid; gap: 8px; }
.agenda-row {
  width: 100%; display: grid; grid-template-columns: 86px minmax(0,1fr) auto; gap: 10px; align-items: center;
  text-align: left; border: 1px solid var(--line); background: #101824; color: var(--text); padding: 9px; min-height: 64px; cursor: pointer;
}
.agenda-row:hover, .agenda-row:focus-visible { border-color: var(--gold); background: #151f2d; outline: 0; }
.agenda-date { display: grid; place-items: center; min-height: 44px; border: 1px solid var(--line-soft); background: #0b111a; color: var(--gold); font-weight: 900; white-space: nowrap; }
.agenda-main { min-width: 0; display: grid; gap: 4px; }
.agenda-main strong, .agenda-main em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.agenda-main em { color: var(--muted); font-style: normal; }
.topic-pills { display: flex; gap: 5px; flex-wrap: wrap; min-width: 0; }
.topic-pill { border: 1px solid var(--line-soft); color: var(--blue); padding: 2px 6px; background: #0b111a; white-space: nowrap; }
.agenda-faces { display: flex; justify-content: flex-end; min-width: 84px; max-width: 230px; overflow: hidden; }
.agenda-faces .mini-face { margin-left: -6px; border-color: var(--panel); }
.agenda-meta { color: var(--blue); font-weight: 900; white-space: nowrap; }
.network-row { grid-template-columns: 64px minmax(0,1fr) 82px; }
@media (max-width:1180px){ .intel-panel.wide{grid-column:span 2;} }
@media (max-width:760px){ .intel-panel.wide{grid-column:auto;} .agenda-row{grid-template-columns:72px minmax(0,1fr);} .agenda-faces,.agenda-meta{grid-column:1/-1;justify-content:flex-start;} }

/* v3.5 profile and audit pass */
.profile-lines { display: grid; gap: 7px; margin-top: 10px; }
.profile-line { display: grid; grid-template-columns: 26px 78px minmax(0,1fr); gap: 8px; align-items: start; border-top: 1px solid var(--line-soft); padding-top: 7px; color: var(--muted); }
.profile-line .line-icon { display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid var(--line); background: #101824; color: var(--gold); }
.profile-line strong { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-line p { margin: 0; color: var(--muted); overflow-wrap: anywhere; }
.profile-social { border-top: 1px solid var(--line-soft); margin-top: 10px; padding-top: 8px; }
.profile-social > strong { display: block; margin-bottom: 5px; }
.org-badge { display: inline-grid; place-items: center; min-width: 32px; height: 18px; padding: 0 5px; margin-right: 5px; border: 1px solid rgba(142,199,255,.65); background: linear-gradient(135deg, rgba(142,199,255,.22), rgba(255,194,71,.10)); color: #dcecff; font-size: var(--fs-s); font-weight: 900; letter-spacing: .04em; vertical-align: -3px; line-height: 1; }
.flag-badge .org-badge { min-width: 100%; height: 100%; padding: 0 2px; margin: 0; font-size: 9px; border: 0; }
.org-mini { display: inline-grid; place-items: center; min-width: 30px; padding: 1px 5px; border: 1px solid var(--line); color: var(--blue); background: #0b1320; font-size: var(--fs-s); font-weight: 900; }
.stat-tile { appearance: none; color: var(--text); text-align: left; cursor: help; }
.stat-tile:hover, .stat-tile:focus-visible, .profile-line:hover, .profile-line:focus-within { border-color: var(--gold); outline: none; }
.rank-row[data-hover-body], .agenda-row[data-hover-body], .profile-line[data-hover-body] { cursor: pointer; }
.flag-svg svg { display: block; width: 100%; height: 100%; }
.source-pills { display: flex; flex-wrap: wrap; gap: 4px; }
@media (max-width: 760px) {
  .profile-line { grid-template-columns: 24px 1fr; }
  .profile-line p { grid-column: 2 / 3; }
}


/* v3.6 audit pass: cleaner profile text, one visible flag near faces, and overlap-safe opening markers. */
.display-leader-line { stroke-linecap: round; stroke-linejoin: round; pointer-events: stroke; }
.map-marker { filter: drop-shadow(0 13px 22px rgba(0,0,0,.42)); }
.map-marker-inner { overflow: visible; }
.map-name { display: block; max-width: 92px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.map-role { display: grid; grid-template-columns: 16px minmax(0,1fr); gap: 4px; align-items: center; }
.map-role .role-word { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-top p .role-dot { display: inline-grid; place-items: center; width: 18px; height: 18px; margin-right: 4px; border: 1px solid var(--line); color: var(--gold); background: #111925; }
.profile-line { grid-template-columns: 26px 96px minmax(0,1fr); }
.profile-line p { max-height: 4.8em; overflow: hidden; }
.profile-social .source-pills { display: flex; flex-wrap: wrap; gap: 7px; }
.top20-chip strong, .quick-hit strong, .rank-row strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.top20-chip .avatar, .quick-hit .avatar, .rank-face, .profile-top .avatar, .map-avatar { overflow: visible; }
.summit-pills { scrollbar-width: thin; }
.summit-pill { min-width: 275px; }
.summit-pill .summit-faces { justify-self: end; max-width: 120px; overflow: hidden; }
.source-note { display: none; }
@media (max-width: 980px) {
  .profile-line { grid-template-columns: 24px 1fr; }
  .profile-line strong { grid-column: 2; }
  .profile-line p { grid-column: 2; }
  .summit-pill { min-width: 240px; }
}


/* v3.6 anchor polish: single flag near portraits, display-offset leader lines, cleaner hover details. */
.display-leader-line { stroke-linecap: round; stroke-linejoin: round; pointer-events: stroke; }
.map-marker-inner { border-width: 2px; }
.map-marker .flag-badge, .profile-top .flag-badge, .top20-chip .flag-badge, .quick-hit .flag-badge, .rank-row .flag-badge { box-shadow: 0 5px 12px rgba(0,0,0,.42); }
.profile-top p { color: var(--muted); }
.profile-lines { display: grid; gap: 7px; margin-top: 10px; }
.profile-line { display: grid; grid-template-columns: 24px minmax(0,1fr); gap: 7px; border-top: 1px solid var(--line-soft); padding-top: 7px; min-width: 0; }
.profile-line .line-icon { grid-row: span 2; color: var(--gold); }
.profile-line strong { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-line p { margin: 0; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.event-catalog-row .agenda-date { background: rgba(142,199,255,.12); color: var(--blue); }
.hover-rich-wrap { color: var(--muted); font-size: var(--fs-s); margin-top: 7px; }
.hover-rich-wrap p { margin: 6px 0 0; color: var(--text); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.hover-line { display: grid; grid-template-columns: 72px 1fr; gap: 7px; margin: 4px 0; }
.hover-line b { color: var(--text); }
.hover-pillrow { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.hover-pillrow span { display: inline-flex; border: 1px solid var(--line); padding: 3px 5px; color: var(--blue); background: #101824; margin: 0; }
.summit-pills { scrollbar-width: thin; }
.summit-pill { min-width: 300px; }
.rank-row strong, .top20-chip strong, .quick-hit strong { min-width: 0; }
@media (max-width: 760px) { .summit-pill { min-width: 250px; } .profile-line p { -webkit-line-clamp: 4; } }


/* v3.6 audit refinements: clean face map, one-flag cards, de-overlapped event graph */
.map-marker { width: 148px; height: 68px; transform: translate(-74px,-34px); }
.map-marker-inner { min-width: 148px; height: 68px; grid-template-columns: 52px minmax(0,1fr); overflow: hidden; }
.map-name { max-width: 82px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.map-role { max-width: 86px; overflow: hidden; }
.map-role .role-word { max-width: 62px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.avatar .flag-badge, .map-avatar .flag-badge, .rank-face .flag-badge { width: 24px; height: 17px; right: -3px; bottom: -3px; overflow: hidden; }
.profile-line p, .bio-lines div, .agenda-main em, .summit-profile p { overflow-wrap: anywhere; }
.display-leader-line { stroke-linecap: round; pointer-events: stroke; }
.event-catalog-row .agenda-date { min-width: 52px; }
.intel-panel.wide { min-width: 0; }
@media (max-width: 760px) {
  .map-marker { width: 128px; height: 62px; transform: translate(-64px,-31px); }
  .map-marker-inner { min-width: 128px; height: 62px; grid-template-columns: 46px minmax(0,1fr); }
  .map-name { max-width: 70px; }
  .map-role .role-word { max-width: 52px; }
}

/* v3.6 event graph / de-overlap polish */
.display-leader-line, .anchor-leader-line { pointer-events: stroke; }
.event-catalog-row .agenda-meta { max-width: 12rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.connector-row .rank-face { width: 2.15rem; height: 2.15rem; display: inline-grid; place-items: center; overflow: visible; }
.connector-row .mini-face { width: 2rem; height: 2rem; }
.profile-source-card { width: 100%; display: grid; gap: .25rem; text-align: left; border: 1px solid var(--line); background: rgba(10,16,25,.82); color: var(--text); padding: .55rem; margin-top: .45rem; }
.profile-source-card span { color: var(--muted); font-size: var(--small); }
.profile-line p { overflow-wrap: anywhere; }

/* v3.6: anchored layout, single-flag portraits, de-overlapped map labels, richer intelligence rows */
.profile-top {
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  overflow: visible;
}
.profile-top .avatar {
  width: 88px;
  height: 88px;
  overflow: visible;
}
.profile-top h3 {
  overflow-wrap: anywhere;
  line-height: .95;
  padding-right: 4px;
}
.profile-top p {
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.profile-top .flag-badge,
.profile-top .entity-badge {
  right: -5px;
  bottom: -5px;
  width: 30px;
  height: 22px;
}
.profile-top .org-badge {
  min-width: 30px;
  height: 22px;
  font-size: 9px;
  padding: 0 3px;
}
.map-marker-inner,
.top20-chip,
.quick-hit,
.rank-row,
.agenda-row,
.summit-pill,
.profile-line,
.stat-tile {
  transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease, opacity .16s ease;
}
.display-leader-line,
.anchor-leader-line {
  stroke-linecap: round;
  pointer-events: stroke;
}
.anchor-origin-dot {
  filter: drop-shadow(0 2px 6px rgba(0,0,0,.45));
}
.map-marker {
  z-index: 420 !important;
}
.map-marker-inner {
  overflow: visible;
}
.map-avatar .flag-badge {
  right: -8px;
  bottom: -8px;
  width: 30px;
  height: 22px;
}
.map-avatar .org-badge {
  min-width: 30px;
  height: 22px;
  font-size: 9px;
}
.top20-chip strong,
.quick-hit strong,
.rank-row strong {
  display: block;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rank-row.person-rank {
  grid-template-columns: 28px 42px minmax(0, 1fr) auto;
}
.connector-row {
  grid-template-columns: minmax(98px, auto) minmax(0,1fr);
}
.connector-row em {
  grid-column: 2 / 3;
}
.connector-faces {
  display: flex;
  align-items: center;
  min-width: 0;
}
.connector-faces .mini-face {
  margin-right: -7px;
  box-shadow: 0 0 0 1px #0a1019;
}
.summit-pills {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}
.summit-pill {
  min-width: 270px;
}
.summit-pill strong,
.summit-pill em {
  min-width: 0;
}
.profile-line p {
  overflow-wrap: normal;
  word-break: normal;
  hyphens: auto;
}
@media (max-width: 980px) {
  .profile-top { grid-template-columns: 82px minmax(0,1fr); gap: 14px; }
  .profile-top .avatar { width: 76px; height: 76px; }
  .rank-row.person-rank { grid-template-columns: 24px 36px minmax(0,1fr); }
  .connector-row { grid-template-columns: 1fr; }
  .connector-row em { grid-column: auto; }
}
