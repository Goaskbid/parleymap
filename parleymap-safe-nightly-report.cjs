const fs = require('fs');
fs.mkdirSync('data/crawler',{recursive:true});
const now = new Date().toISOString();
const report = {generatedAt: now, status:'safe_nightly_no_synthetic_events', candidates:0, publishable:0, note:'Crawler output is locked to zero until real official source extraction is rebuilt. This prevents fake watch events.'};
fs.writeFileSync('data/crawler/crawl-report.json', JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('data/crawler/candidate-appearances.json', '[]\n');
fs.writeFileSync('data/crawler/publishable-appearances.json', '[]\n');
console.log(JSON.stringify(report,null,2));
