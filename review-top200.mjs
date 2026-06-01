#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const dryRun = args.has("--dry-run") || !live;
const now = new Date().toISOString();
const userAgent = process.env.PARLEYMAP_USER_AGENT || "ParleyMapBot/2.4 portrait cache (+public-source image metadata; contact: set-PARLEYMAP_CONTACT)";

function readJson(rel, fallback) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return fallback;
  return JSON.parse(fs.readFileSync(full, "utf8"));
}
function writeJson(rel, value) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`);
}
async function fetchJson(url) {
  const res = await fetch(url, { headers: { "user-agent": userAgent, "accept": "application/json,*/*" } });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 160)}`);
  return JSON.parse(body);
}
function chunks(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}
function commonsThumbFromFilePath(url, width = 220) {
  if (!url) return "";
  const decoded = decodeURIComponent(String(url).split("/Special:FilePath/")[1] || "");
  if (!decoded) return url;
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(decoded)}?width=${width}`;
}
async function wikidataImages(roster) {
  const qids = roster.map((p) => p.wikidataId).filter(Boolean);
  const result = new Map();
  for (const group of chunks(qids, 45)) {
    const values = group.map((id) => `wd:${id}`).join(" ");
    const query = `SELECT ?item ?dob ?image WHERE { VALUES ?item { ${values} } OPTIONAL { ?item wdt:P569 ?dob. } OPTIONAL { ?item wdt:P18 ?image. } }`;
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
    const payload = await fetchJson(url);
    for (const row of payload.results?.bindings || []) {
      const qid = row.item?.value?.split("/").pop();
      if (!qid) continue;
      result.set(qid, {
        birthDate: row.dob?.value ? row.dob.value.slice(0, 10) : "",
        imageUrl: row.image?.value ? commonsThumbFromFilePath(row.image.value, 220) : "",
        source: "Wikidata P18/P569"
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return result;
}
async function wikipediaPageImages(roster) {
  const result = new Map();
  for (const group of chunks(roster.filter((p) => p.wikiTitle), 35)) {
    const titles = group.map((p) => p.wikiTitle).join("|");
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&pithumbsize=220&piprop=thumbnail|original&titles=${encodeURIComponent(titles)}`;
    const payload = await fetchJson(url);
    const aliases = new Map();
    for (const item of payload.query?.normalized || []) aliases.set(item.from, item.to);
    for (const item of payload.query?.redirects || []) aliases.set(item.from, item.to);
    const byTitle = new Map();
    for (const page of Object.values(payload.query?.pages || {})) {
      if (page?.title) byTitle.set(page.title, page.thumbnail?.source || page.original?.source || "");
    }
    for (const person of group) {
      const resolved = aliases.get(person.wikiTitle) || person.wikiTitle;
      result.set(person.id, byTitle.get(resolved) || "");
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return result;
}
function applyPortraits(demo, cache) {
  const byName = new Map(cache.profiles.map((p) => [String(p.name).toLowerCase(), p]));
  for (const person of demo.roster || []) {
    const c = byName.get(String(person.name || person.canonicalName).toLowerCase());
    if (!c) continue;
    if (c.imageUrl && !person.imageUrl) person.imageUrl = c.imageUrl;
    if (c.birthDate && !person.birthDate) person.birthDate = c.birthDate;
    person.imageProvider = c.source || person.imageProvider || "public media metadata";
    person.visualAuditStatus = person.visualAuditStatus || "portrait requires licence and attribution capture before production export";
  }
  for (const person of demo.people || []) {
    const c = byName.get(String(person.canonicalName || person.name).toLowerCase());
    if (!c) continue;
    if (c.imageUrl && !person.imageUrl) person.imageUrl = c.imageUrl;
    if (c.birthDate && !person.birthDate) person.birthDate = c.birthDate;
  }
  return demo;
}
async function run() {
  const demo = readJson("data/demo.json", {});
  const roster = [...(demo.roster || readJson("data/top200-roster.json", [])), ...(demo.expansionRoster || [])];
  if (dryRun) {
    const missing = roster.filter((p) => !p.imageUrl).map((p) => ({ id: p.id, name: p.name || p.canonicalName, wikiTitle: p.wikiTitle, wikidataId: p.wikidataId })).slice(0, 25);
    writeJson("data/evergreen/portrait-cache-preview.json", { generatedAt: now, mode: "dry-run", rosterCount: roster.length, missingImageCount: roster.filter((p) => !p.imageUrl).length, preview: missing });
    console.log(`Portrait dry-run: ${roster.length} profiles, ${missing.length} preview rows written.`);
    return;
  }
  const errors = [];
  let wd = new Map();
  let wp = new Map();
  try {
    wd = await wikidataImages(roster);
  } catch (error) {
    errors.push({ stage: "wikidata", message: error.message });
  }
  try {
    wp = await wikipediaPageImages(roster);
  } catch (error) {
    errors.push({ stage: "wikipedia-pageimages", message: error.message });
  }
  const profiles = roster.map((person) => {
    const wdItem = wd.get(person.wikidataId) || {};
    const wikiImage = wp.get(person.id) || "";
    return {
      id: person.id,
      rank: person.rank,
      name: person.name || person.canonicalName,
      wikiTitle: person.wikiTitle,
      wikidataId: person.wikidataId,
      birthDate: wdItem.birthDate || person.birthDate || "",
      imageUrl: person.imageUrl || wdItem.imageUrl || wikiImage || "",
      source: person.imageUrl ? (person.imageProvider || "seeded image") : wdItem.imageUrl ? "Wikidata P18" : wikiImage ? "Wikipedia pageimages" : "no image found",
      auditStatus: "candidate thumbnail; production must store author, license, source URL, and attribution text"
    };
  });
  const cache = { generatedAt: now, count: profiles.length, withImage: profiles.filter((p) => p.imageUrl).length, errors, profiles };
  writeJson("data/portrait-cache.json", cache);
  const updated = applyPortraits(demo, cache);
  updated.meta = { ...(updated.meta || {}), lastPortraitCache: now };
  writeJson("data/demo.json", updated);
  writeJson("data/top200-roster.json", updated.roster || roster);
  console.log(`Portrait cache live: ${cache.withImage}/${cache.count} profiles have thumbnail candidates${errors.length ? `; ${errors.length} network/source errors recorded` : ""}.`);
}

run().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
