import fs from 'node:fs';
const root=new URL('../',import.meta.url),path=new URL('../index.html',import.meta.url);
const registry=JSON.parse(fs.readFileSync(new URL('../data/official-source-registry.json',import.meta.url),'utf8'));
// Keep the full discovery inventory in JSON. Bundle only evidence needed to answer/lock,
// so archived discoveries do not become current answer sources and mobile HTML stays small.
const needed=new Set(registry.ruleVersions.map(v=>v.documentId));
registry.documents=registry.documents.filter(d=>needed.has(d.id)||d.status==='PENDING'&&d.mayAffectRules);
const code=fs.readFileSync(new URL('./official-freshness.js',import.meta.url),'utf8');
const start='// BEGIN GENERATED OFFICIAL FRESHNESS',end='// END GENERATED OFFICIAL FRESHNESS';
const block=start+'\n'+code+'\nglobalThis.OFFICIAL_SOURCE_REGISTRY='+JSON.stringify(registry).replace(/</g,'\\u003c')+';\n'+end;
const original=fs.readFileSync(path,'utf8');
const html=original.replace(/<!-- BEGIN GENERATED OFFICIAL FRESHNESS -->[\s\S]*?<!-- END GENERATED OFFICIAL FRESHNESS -->\n?/,'');let next;
const a=html.indexOf(start),b=html.indexOf(end);
if(a>=0&&b>a)next=html.slice(0,a)+block+html.slice(b+end.length);
else next=html.replace('<script>\n(function(root,factory){','<script>\n'+block+'\n(function(root,factory){');
if(process.argv.includes('--check')){if(next!==original)throw Error('Freshness runtime/registry differs from canonical source');console.log('Official freshness runtime synchronized');}
else fs.writeFileSync(path,next);
