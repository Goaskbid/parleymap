import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "demo.json"), "utf8"));
const modules = data.intelligenceModules || {};
const families = ["Davos","Bilderberg","Munich","FII","Jackson Hole","IMF / World Bank","G20","G7","NATO","COP","OPEC","BIS","ECB Sintra","Sun Valley","Milken","Raisina","Shangri-La","APEC","BRICS","UNGA","Boao","Ambrosetti","CERAWeek","ADIPEC","Paris Air Show","Farnborough","WTO","CES"];
const topics = (modules.topics || data.topicTags || []).map((t) => t.label || t.topic || t.id).filter(Boolean);
const orgs = (modules.organizationProfiles || data.organizationProfiles || []).map((o) => o.name).filter(Boolean);
const alertTypes = (modules.alertTypes || []).map((a) => a.kind).filter(Boolean);
const jobs = [];
for (const fam of families) {
  jobs.push({ type: "agenda-change-watch", eventFamily: fam, sourceTargets: ["official agenda", "speaker list", "participant list", "PDF programme", "livestream metadata"], alertTypes: alertTypes.length ? alertTypes : ["new attendee announced", "agenda published", "speaker added", "event moved", "registration opens"] });
  for (const topic of topics) jobs.push({ type: "topic-extraction", eventFamily: fam, topic, fields: ["session title", "speaker", "organization", "year", "source URL"] });
}
for (const org of orgs) jobs.push({ type: "organization-penetration", organization: org, eventFamilies: families, output: ["representative", "role", "event", "year", "source URL"] });
const out = { generatedAt: new Date().toISOString(), alerts: alertTypes.length, topicTags: topics.length, organizations: orgs.length, eventFamilies: families.length, plannedJobs: jobs.length, jobs };
fs.mkdirSync(path.join(root, "data", "crawler"), { recursive: true });
fs.writeFileSync(path.join(root, "data", "crawler", "alert-theme-graph-plan-v4.0.0.json"), JSON.stringify(out, null, 2));
console.log(`Alert/theme graph planner: ${jobs.length} jobs for ${families.length} event families, ${topics.length} topics and ${orgs.length} organizations.`);
