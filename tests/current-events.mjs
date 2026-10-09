import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync(new URL('../data/current-events.json',import.meta.url),'utf8'));
const errors=[];
const now=new Date();

if(data.schemaVersion!==1) errors.push('schemaVersion must be 1');
if(data.mode!=='official-auto') errors.push('mode must be official-auto');
if(!Array.isArray(data.events)) errors.push('events must be an array');
if((data.events||[]).length>3) errors.push('homepage current events must be <= 3');
if(!data.lastCheckedAt||Number.isNaN(Date.parse(data.lastCheckedAt))) errors.push('lastCheckedAt missing/invalid');

const ids=new Set(),urls=new Set();
for(const e of data.events||[]){
  if(!e.id||ids.has(e.id)) errors.push('duplicate/missing id: '+e.id);
  ids.add(e.id);
  if(!e.title||!e.summary||!e.statusLabel) errors.push('missing display fields: '+e.id);
  if(!/^https:\/\/(www\.)?dlasavingcoop\.com\//i.test(e.url||'')) errors.push('non-official URL: '+e.url);
  if(/board_(?:content|post)\.php/i.test(e.url||'')) errors.push('member board must not be promoted as official current event: '+e.url);
  if(urls.has(e.url)) errors.push('duplicate URL: '+e.url);
  urls.add(e.url);
  if(!e.ask) errors.push('missing internal ask route: '+e.id);
  const currentThaiYear=new Date().getFullYear()+543;
  const years=[...String(e.title||'').matchAll(/25\d{2}/g)].map(m=>Number(m[0]));
  if(years.some(y=>y<currentThaiYear)) errors.push('prior-year headline must not be current: '+e.id);
  if(e.expiresAt){
    const d=new Date(e.expiresAt);
    if(Number.isNaN(d.getTime())) errors.push('invalid expiresAt: '+e.id);
    if(d<=now) errors.push('expired event must not be published: '+e.id);
  }
}

if(!data.sourceHealth||!['ok','error'].includes(data.sourceHealth.homepage)||!['ok','error'].includes(data.sourceHealth.notices)){
  errors.push('sourceHealth invalid');
}
if(data.sourceHealth?.homepage==='error'&&data.sourceHealth?.notices==='error') errors.push('both official sources unavailable');

if(errors.length){
  console.error(JSON.stringify({ok:false,errors},null,2));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,events:data.events.length,lastCheckedAt:data.lastCheckedAt},null,2));
