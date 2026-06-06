import fs from "node:fs";

const OUT = "data/diagnostics/LATEST_RUN_SUMMARY.md";
function read(path) { try { return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : null; } catch { return null; } }
function n(value) { return value === null || value === undefined ? "n/a" : String(value); }
fs.mkdirSync("data/diagnostics", { recursive: true });
const rescue = read("data/diagnostics/final-rescue-report.json");
const audit = read("data/diagnostics/final-audit-report.json");
const roster = read("data/diagnostics/roster-current-holder-review.json");
const publish = read("data/diagnostics/publish-report.json");
const crawl = read("data/crawler/crawl-report.json");
const before = rescue?.before || publish?.before || roster?.before || {};
const after = rescue?.after || publish?.after || roster?.after || {};
const lines = [
  "# ParleyMap latest automated run",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Workflow: ${process.env.GITHUB_WORKFLOW || "local"}`,
  `Run: ${process.env.GITHUB_RUN_NUMBER || "local"}`,
  "",
  "## Status",
  "",
  `Final rescue: ${rescue?.status || "n/a"}`,
  `Final audit: ${audit?.status || "n/a"}`,
  `Roster review: ${roster?.status || "n/a"}`,
  `Crawler publish: ${publish?.status || "n/a"}`,
  "",
  "## Counts",
  "",
  "| Dataset | Before | After |",
  "|---|---:|---:|",
  `| people | ${n(before.people)} | ${n(after.people)} |`,
  `| roster | ${n(before.roster)} | ${n(after.roster)} |`,
  `| topRoster | ${n(before.topRoster)} | ${n(after.topRoster)} |`,
  `| expansionRoster | ${n(before.expansionRoster)} | ${n(after.expansionRoster)} |`,
  `| appearances | ${n(before.appearances)} | ${n(after.appearances)} |`,
  `| categories | ${n(before.categories)} | ${n(after.categories)} |`,
  "",
  "## Anchor patch counts",
  ""
];
if (rescue?.patchCountsByTarget) {
  for (const [key, value] of Object.entries(rescue.patchCountsByTarget)) lines.push(`- ${key}: ${value}`);
} else {
  lines.push("No final rescue patch report found.");
}
lines.push("", "## Roster", "", `Candidates: ${n(roster?.candidates?.length)}`, `Operations: ${n(roster?.operations?.length)}`, `Errors: ${n(roster?.errors?.length)}`);
lines.push("", "## Crawler", "", crawl ? "```json" : "No crawl report.");
if (crawl) { lines.push(JSON.stringify(crawl, null, 2).slice(0, 2500), "```"); }
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(lines.join("\n"));
