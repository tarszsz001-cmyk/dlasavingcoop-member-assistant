import fs from 'node:fs';
import F from './official-freshness.js';
const base=JSON.parse(fs.readFileSync(new URL('../data/official-source-registry.json',import.meta.url))),monitor=JSON.parse(fs.readFileSync(new URL('../data/official-source-monitor.json',import.meta.url)));
if(JSON.stringify(base.ruleVersions)!==JSON.stringify(monitor.ruleVersions))throw Error('Monitor changed rule versions');
for(const d of monitor.documents){
 if(d.status==='CURRENT'&&!base.documents.some(x=>x.id===d.id&&x.status==='CURRENT'&&(!x.contentHash||x.contentHash===d.contentHash)))throw Error('Automatic CURRENT promotion prohibited');
 if(d.mayAffectRules&&d.status!=='PENDING')throw Error('Unresolved rule impact must stay PENDING');
 if(d.mayAffectRules&&(!F.primary(d)||!d.affects?.length))throw Error('Rule lock lacks primary lineage or impact domains');
}
F.mergeMonitor(base,monitor);
console.log('Monitor safety PASS: no rule promotion; unresolved impacts retained');
