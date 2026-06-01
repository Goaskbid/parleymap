#!/usr/bin/env node
import fs from "node:fs";

const now = new Date();
const data = JSON.parse(fs.readFileSync("data/demo.json", "utf8"));
const roster = (data.roster || []).slice().sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
const names = new Set();
const issues = [];
for (const person of roster) {
  if (names.has(person.canonicalName || person.name)) issues.push({ type: "duplicate_name", name: person.canonicalName || person.name });
  names.add(person.canonicalName || person.name);
  if (!person.wikiTitle) issues.push({ type: "missing_wiki_title", name: person.canonicalName || person.name });
  if (!person.countryFocus) issues.push({ type: "missing_country_focus", name: person.canonicalName || person.name });
  if (!person.birthDate) issues.push({ type: "missing_birth_date", name: person.canonicalName || person.name });
}
const mappedNames = new Set((data.people || []).map((p) => p.canonicalName));
const mappedTop = roster.filter((p) => mappedNames.has(p.canonicalName || p.name)).map((p) => p.rank);
const report = {
  generatedAt: now.toISOString(),
  rosterSize: roster.length,
  mappedRosterProfiles: mappedTop.length,
  top20Mapped: roster.slice(0, 20).filter((p) => mappedNames.has(p.canonicalName || p.name)).length,
  imageHydration: "Runtime Wikimedia pageimage hydration is enabled for every roster item with a wikiTitle; production should cache and audit portraits.",
  reviewPolicy: "Daily drift check; monthly high-calibre additions; annual full rebuild; immediate review when a head of state/government, monarch, foreign minister, central banker, multilateral head or major CEO changes role.",
  issues: issues.slice(0, 200)
};
fs.writeFileSync("data/roster-review.json", JSON.stringify(report, null, 2));
data.meta = data.meta || {};
data.meta.lastTop200Review = now.toISOString().slice(0, 10);
data.meta.nextTop200Review = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
fs.writeFileSync("data/demo.json", JSON.stringify(data, null, 2));
console.log(`Roster review: ${report.rosterSize} profiles; ${report.top20Mapped}/20 top faces have mapped trails; ${report.issues.length} data issues logged.`);
