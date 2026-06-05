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
const anchor = readJson("data/diagnostics/anchor-face-repair-report.json");
const audit = readJson("data/diagnostics/final-rescue-audit-report.json");
const roster = readJson("data/diagnostics/roster-current-holder-review.json");
const publish = readJson("data/diagnostics/publish-report.json");
const crawler = readJson("data/crawler/crawl-report.json");

const lines = [];
lines.push("# ParleyMap latest run summary");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Workflow: ${process.env.GITHUB_WORKFLOW || "local"}`);
lines.push(`Run: ${process.env.GITHUB_RUN_NUMBER || "local"}`);
lines.push("");
lines.push("## Safety audit");
lines.push("");
lines.push(`Audit status: ${audit?.status || "n/a"}`);
lines.push(`Audit errors: ${n(audit?.errors?.length)}`);
lines.push(`People count: ${n(audit?.counts?.people)}`);
lines.push(`Roster count: ${n(audit?.counts?.roster)}`);
lines.push(`Appearances count: ${n(audit?.counts?.appearances)}`);
lines.push("");
lines.push("## Anchor and face repair");
lines.push("");
lines.push(`Repair status: ${anchor?.status || "n/a"}`);
lines.push(`Runtime guard installed: ${n(anchor?.runtimeGuardInstalled)}`);
if (anchor?.patchesByTarget) {
  for (const [key, value] of Object.entries(anchor.patchesByTarget)) {
    lines.push(`- ${key}: ${value}`);
  }
}
lines.push("");
lines.push("## Roster current-holder review");
lines.push("");
lines.push(`Roster status: ${roster?.status || "n/a"}`);
lines.push(`Candidates: ${n(roster?.candidateCount)}`);
lines.push(`Replacements: ${n(roster?.replacementCount)}`);
lines.push(`Operations: ${n(roster?.operationCount)}`);
lines.push("");
lines.push("## Appearance refresh");
lines.push("");
lines.push(`Publish status: ${publish?.status || "n/a"}`);
lines.push(`Approved: ${n(publish?.approved)}`);
lines.push(`Rejected: ${n(publish?.rejected)}`);
lines.push(`Added: ${n(publish?.added)}`);
lines.push(`Updated: ${n(publish?.updated)}`);
if (crawler) {
  lines.push("");
  lines.push("## Crawler report");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(crawler, null, 2).slice(0, 2500));
  lines.push("```");
}
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(lines.join("\n"));
