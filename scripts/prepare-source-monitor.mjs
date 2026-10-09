import fs from 'node:fs';
import F from './official-freshness.js';
const path=new URL('../data/official-source-registry.json',import.meta.url),base=JSON.parse(fs.readFileSync(path,'utf8')),prior=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const merged=F.mergeMonitor(base,prior);
// Retain the bounded fetch cache, including baseline inventory, but never import ruleVersions.
for(const doc of prior.documents){
 const known=merged.documents.find(d=>F.canonical(d.originalUrl)===F.canonical(doc.originalUrl));
 if(known){for(const k of ['fingerprint','indexFingerprints','contentHash','etag','lastContentCheck','contentError','lastCheckedAt'])if(doc[k])known[k]=doc[k];}
 else if(F.primary(doc)||['NEWS','DISCOVERY'].includes(doc.type))merged.documents.push({...doc,status:'PENDING'});
}
for(const m of merged.monitors){const old=prior.monitors.find(x=>x.id===m.id&&x.url===m.url);if(old)for(const k of ['fingerprint','documentIds','etag','lastModified'])if(old[k])m[k]=old[k];}
fs.writeFileSync(path,JSON.stringify(merged,null,2)+'\n');
