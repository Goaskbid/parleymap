import fs from "node:fs";

const OUT = "data/diagnostics/LATEST_RUN_SUMMARY.md";
function readJson(path) { try { return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : null; } catch { return null; } }
const rescue = readJson("data/diagnostics/final-rescue-report.json");
const audit = readJson("data/diagnostics/final-audit-report.json");
const roster = readJson("data/diagnostics/roster-current-holder-review.json");
const publish = readJson("data/diagnostics/publish-report.json");
const lines = ["# ParleyMap latest automated run", "", `Generated: ${new Date().toISOString()}`, `Workflow: ${process.env.GITHUB_WORKFLOW || "local"}`, `Run: ${process.env.GITHUB_RUN_NUMBER || "local"}`, ""];
if (rescue) { lines.push("## Final rescue", "", `Status: ${rescue.status}`, `Restored: ${rescue.restored}`, `Runtime guard installed: ${rescue.runtimeGuardInstalled}`, `Profile/roster fixes: ${rescue.profileFixCount}`, `Appearance fixes: ${rescue.appearanceFixCount}`, `Historical rows hidden: ${rescue.historicalRowsHidden}`, ""); }
if (audit) { lines.push("## Audit", "", `Status: ${audit.status}`, `Failures: ${audit.failures?.length ?? 0}`, ""); }
if (publish) { lines.push("## Appearance refresh", "", `Status: ${publish.status}`, `Approved: ${publish.approved ?? "n/a"}`, `Rejected: ${publish.rejected ?? "n/a"}`, `Added: ${publish.added ?? "n/a"}`, `Updated: ${publish.updated ?? "n/a"}`, ""); }
if (roster) { lines.push("## Roster current-holder review", "", `Status: ${roster.status}`, `Applied: ${roster.applied}`, `Replacements: ${roster.replacementCount}`, `People added: ${roster.peopleAdded}`, `Errors: ${roster.errors?.length ?? 0}`, ""); }
lines.push("## Changed files", "");
try { const { execSync } = await import("node:child_process"); const changed = execSync("git diff --name-only", { encoding: "utf8" }).trim(); lines.push(changed || "No working-tree changes before commit."); } catch { lines.push("Could not read git diff."); }
fs.mkdirSync("data/diagnostics", { recursive: true });
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(lines.join("\n"));
