#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const demo = JSON.parse(fs.readFileSync(path.join(root, "data", "demo.json"), "utf8"));
const intel = JSON.parse(fs.readFileSync(path.join(root, "data", "influence-intelligence-v4.0.0.json"), "utf8"));
const people = demo.people || [];
const roster = [...(demo.roster || []), ...(demo.expansionRoster || [])];
const priorityPeople = [...new Set([...people.map((p)=>p.canonicalName), ...roster.slice(0,340).map((p)=>p.name)])].filter(Boolean).slice(0,340);
const sourceFamilies = ["official schedule", "protocol office", "foreign ministry readout", "central bank speech page", "summit participant list", "event agenda PDF", "speaker list", "university event page", "think tank event", "corporate IR event", "verified social lead", "local media lead", "public gallery or livestream metadata", "organization profile page"];
const languages = ["en","zh","ru","ar","fr","de","es","pt","ja","ko","it","tr"];
const jobs = [];
for (const person of priorityPeople) for (const sourceFamily of sourceFamilies) for (const language of languages) jobs.push({person, sourceFamily, language, output:"person-event edge, alert, topic tag, organization edge", confidenceFloor: sourceFamily.includes("official") || sourceFamily.includes("readout") ? 80 : 60});
const plan = {version:"5.1.0", generatedAt:new Date().toISOString(), priorityPeople: priorityPeople.length, sourceFamilies: sourceFamilies.length, languages: languages.length, plannedJobs: jobs.length, alertTypes:intel.alertTypes, topics:intel.topics, organizationProfiles:intel.organizationProfiles, eventOverlapFamilies:intel.eventOverlapFamilies, currentStaticRecords:{people:people.length, appearances:(demo.appearances||[]).length, eventAgendas:(demo.eventAgendas||[]).length, encounters:(demo.encounters||[]).length, calls:(demo.telephoneCalls||demo.calls||[]).length}, jobs:jobs.slice(0,500)};
fs.mkdirSync(path.join(root,"data","crawler"),{recursive:true});
fs.writeFileSync(path.join(root,"data","crawler","influence-intelligence-plan-v5.1.0.json"), JSON.stringify(plan,null,2));
console.log(`Influence intelligence planner: ${plan.plannedJobs} planned jobs for ${plan.priorityPeople} people across ${plan.sourceFamilies} source families and ${plan.languages} languages.`);
