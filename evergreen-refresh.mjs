#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const live = process.argv.includes("--live");
const dryRun = process.argv.includes("--dry-run") || !live;
const now = new Date().toISOString();
function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit", cwd: root });
  if (result.status !== 0) process.exit(result.status || 1);
}
function writeJson(rel, value) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`);
}
const common = dryRun ? ["--dry-run"] : ["--write", "--update-site", "--promote-official"];
runNode("scripts/cache-portraits.mjs", dryRun ? ["--dry-run"] : ["--live"]);
runNode("scripts/evergreen-crawl.mjs", common);
const reportPath = path.join(root, "data", "refresh-log.json");
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : {};
report.generatedAt = now;
report.mode = dryRun ? "dry-run" : "live";
report.pipeline = [
  "portrait and birthday enrichment",
  "top-200 identity consistency check",
  "24-month public-source discovery crawl",
  "120-day announced future-event scan",
  "source-gated publication queue",
  "static build after validation"
];
report.websiteNote = "The website displays approved records only. Discovery leads remain in data/evergreen until source-gated approval.";
writeJson("data/refresh-log.json", report);
console.log(`Nightly refresh ${dryRun ? "dry-run" : "live"} complete.`);
