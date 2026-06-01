#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run");
const now = new Date();
const dataPath = path.join(root, "data", "demo.json");
const rosterPath = path.join(root, "data", "top200-roster.json");
const outPath = path.join(root, "data", "top200-review.json");

const data = readJson(dataPath, {});
const rosterEnvelope = readJson(rosterPath, { meta: {}, roster: data.roster || [] });
const roster = Array.isArray(rosterEnvelope.roster) ? rosterEnvelope.roster : (data.roster || []);
const existing = new Set(roster.map((p) => norm(p.name || p.canonicalName)));
const findings = [];
const failures = [];

if (!dryRun && typeof fetch === "function") {
  try {
    const rows = await queryWikidataHeads();
    for (const row of rows) {
      const name = row.personLabel?.value;
      if (!name || existing.has(norm(name))) continue;
      findings.push({
        name,
        country: row.countryLabel?.value || "",
        roleTitle: row.positionLabel?.value || "Head of state/government",
        wikidataId: row.person?.value?.split("/").pop() || "",
        source: "Wikidata current office query",
        action: "consider_addition"
      });
    }
  } catch (error) {
    failures.push({ source: "Wikidata", error: error.message });
  }
}

const review = {
  generatedAt: now.toISOString(),
  mode: apply ? "apply" : dryRun ? "dry-run" : "review",
  currentRosterSize: roster.length,
  findings: findings.slice(0, 80),
  failures,
  rule: "Daily delta review. Annual full rebuild remains a separate editorial/analytical step so the roster does not churn from one noisy source."
};
fs.writeFileSync(outPath, JSON.stringify(review, null, 2));

if (apply) {
  const updated = roster.slice();
  let rank = updated.length;
  for (const item of findings.slice(0, Math.max(0, 200 - updated.length))) {
    rank += 1;
    updated.push({
      rank,
      id: `r-${String(rank).padStart(3, "0")}-${slug(item.name)}`,
      name: item.name,
      canonicalName: item.name,
      slug: slug(item.name),
      wikidataId: item.wikidataId,
      wikiTitle: item.name.replaceAll(" ", "_"),
      profileUrl: item.wikidataId ? `https://www.wikidata.org/wiki/${item.wikidataId}` : "",
      region: item.country,
      country: item.country,
      countryName: item.country,
      countryFocus: "UN",
      bucket: "Head of state/government",
      sector: "Government",
      organization: `${item.country} government`,
      roleTitle: item.roleTitle,
      prominenceScore: 80,
      imageUrl: "",
      sourcePriority: "official appointment page, official calendar, host-public event page",
      trackingStatus: "profile added by daily office-holder review; travel records require public-source crawl"
    });
  }
  rosterEnvelope.meta = { ...(rosterEnvelope.meta || {}), version: "2.4.0", lastTop200Review: now.toISOString().slice(0,10), generatedAt: now.toISOString() };
  rosterEnvelope.roster = updated.slice(0, 200).map((p, i) => ({ ...p, rank: i + 1 }));
  fs.writeFileSync(rosterPath, JSON.stringify(rosterEnvelope, null, 2));
  data.roster = rosterEnvelope.roster;
  data.meta = { ...(data.meta || {}), lastTop200Review: now.toISOString().slice(0,10), nextTop200Review: nextMonth(now), importStatus: "top-200 daily review completed" };
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

console.log(`Top-200 review: ${findings.length} possible additions, ${failures.length} soft failures.`);

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } }
function norm(value) { return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function slug(value) { return norm(value).replace(/ /g, "-").slice(0, 80); }
function nextMonth(date) { const d = new Date(date); d.setUTCMonth(d.getUTCMonth()+1); return d.toISOString().slice(0,10); }
async function queryWikidataHeads() {
  const query = `
SELECT ?person ?personLabel ?positionLabel ?countryLabel WHERE {
  VALUES ?class { wd:Q6256 }
  ?country wdt:P31 ?class .
  ?person p:P39 ?statement .
  ?statement ps:P39 ?position .
  FILTER NOT EXISTS { ?statement pq:P582 ?end . }
  OPTIONAL { ?statement pq:P17 ?country . }
  VALUES ?positionKind { wd:Q48352 wd:Q2285706 wd:Q14212 wd:Q274948 }
  ?position wdt:P279* ?positionKind .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 300`;
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const res = await fetch(url, { headers: { "accept": "application/sparql-results+json", "user-agent": "ParleyMapRosterReview/2.4" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.results?.bindings || [];
}
