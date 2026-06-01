import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const appPath = path.join(root, 'src', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');
if (!app.includes('const alerts = (data.alerts')) {
  app = app.replace(`  const eventUniverse = (data.eventUniverse || data.influenceEventCatalog || []).map((e) => ({ ...e }));`, `  const eventUniverse = (data.eventUniverse || data.influenceEventCatalog || []).map((e) => ({ ...e }));\n  const alerts = (data.alerts || []).map((e) => ({ ...e }));\n  const topicTags = (data.topicTags || []).map((e) => ({ ...e }));\n  const organizationProfiles = (data.organizationProfiles || []).map((e) => ({ ...e }));\n  const topicMigrations = (data.topicMigrations || []).map((e) => ({ ...e }));\n  const influenceTimeline = (data.influenceTimeline || []).map((e) => ({ ...e }));`);
}
if (!app.includes('rankAlerts: qs("#rank-alerts")')) {
  app = app.replace(`      rankConnectors: qs("#rank-connectors"),`, `      rankConnectors: qs("#rank-connectors"),\n      rankAlerts: qs("#rank-alerts"),\n      rankTopics: qs("#rank-topics"),\n      rankRecurring: qs("#rank-recurring"),\n      orgProfiles: qs("#org-profiles"),\n      overlapMatrix: qs("#overlap-matrix"),\n      orgPenetration: qs("#org-penetration"),\n      topicMigration: qs("#topic-migration"),\n      influenceTimeline: qs("#influence-timeline"),\n      powerGeography: qs("#power-geography"),`);
}
if (!app.includes('renderAdvancedIntelligence();')) {
  app = app.replace(`    renderConnectorProfiles();\n  }`, `    renderConnectorProfiles();\n    renderAdvancedIntelligence();\n  }`);
}
app = app.replaceAll(`bounds.push([display.lat, display.lng]);`, `bounds.push([item.anchor.lat, item.anchor.lng]);`);
if (!app.includes('function renderAdvancedIntelligence()')) {
  const advanced = fs.readFileSync('/mnt/data/advanced_functions_v400.txt', 'utf8');
  app = app.replace(`  function agendaRowHtml(agenda) {`, `${advanced}\n\n  function agendaRowHtml(agenda) {`);
}
fs.writeFileSync(appPath, app);
console.log('Patched app.js for v4.0 intelligence layer.');
