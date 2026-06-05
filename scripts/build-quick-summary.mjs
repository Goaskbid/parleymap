import fs from "node:fs";

const OUT = "data/diagnostics/LATEST_RUN_SUMMARY.md";

function readJson(path) {
  try {
    if (!fs.existsSync(path)) return null;
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function n(value) {
  return value === undefined || value === null ? "n/a" : String(value);
}

fs.mkdirSync("data/diagnostics", { recursive: true });

const publish = readJson("data/diagnostics/publish-report.json");
const repair = readJson("data/diagnostics/repair-report.json");
const hygiene = readJson("data/diagnostics/roster-hygiene-report.json");
const mapAnchor = readJson("data/diagnostics/map-anchor-hygiene-report.json");
const strictAudit = readJson("data/diagnostics/strict-crawler-audit-report.json");
const rosterReview = readJson("data/diagnostics/roster-review.json");
const crawler = readJson("data/crawler/crawl-report.json");

const lines = [];

lines.push("# ParleyMap latest automated run");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Workflow: ${process.env.GITHUB_WORKFLOW || "local"}`);
lines.push(`Run: ${process.env.GITHUB_RUN_NUMBER || "local"}`);
lines.push("");

lines.push("## Dataset");
lines.push("");
lines.push("| Item | Before | After |");
lines.push("|---|---:|---:|");

const before = publish?.before || mapAnchor?.before || hygiene?.before || {};
const after = publish?.after || mapAnchor?.after || hygiene?.after || {};

for (const key of ["people", "roster", "expansionRoster", "appearances", "categories"]) {
  lines.push(`| ${key} | ${n(before[key])} | ${n(after[key])} |`);
}

lines.push("");
lines.push("## Results");
lines.push("");
lines.push(`- Publish status: ${publish?.status || "n/a"}`);
lines.push(`- Approved crawler records: ${n(publish?.approved)}`);
lines.push(`- Rejected crawler records: ${n(publish?.rejected)}`);
lines.push(`- Added appearances: ${n(publish?.added)}`);
lines.push(`- Updated appearances: ${n(publish?.updated)}`);
lines.push(`- Strict audit removed from index: ${n(strictAudit?.removedFromIndex?.length)}`);
lines.push(`- Repair fixes: ${n(repair?.homeBaseFixes?.length)}`);
lines.push(`- Roster hygiene fixes: ${n(hygiene?.fixes?.length)}`);
lines.push(`- Map anchor fixes: ${n(mapAnchor?.fixes?.length)}`);
lines.push(`- Map anchor unresolved: ${n(mapAnchor?.unresolved?.length)}`);

if (rosterReview) {
  lines.push("");
  lines.push("## Monthly roster review");
  lines.push("");
  lines.push(`- Checked countries: ${n(rosterReview.checkedCountries?.length)}`);
  lines.push(`- Addition candidates: ${n(rosterReview.additionCandidates?.length)}`);
  lines.push(`- Possible stale roster entries: ${n(rosterReview.possibleStaleRosterEntries?.length)}`);
  lines.push(`- Data hygiene warnings: ${n(rosterReview.dataHygieneWarnings?.length)}`);
}

if (crawler) {
  lines.push("");
  lines.push("## Crawler");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(crawler, null, 2).slice(0, 3000));
  lines.push("```");
}

fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(lines.join("\n"));
