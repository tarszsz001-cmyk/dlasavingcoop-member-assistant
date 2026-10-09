import fs from 'node:fs';
const path=new URL('../index.html',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('../data/official-rule-master.json',import.meta.url),'utf8'));
const html=fs.readFileSync(path,'utf8'),start='    // BEGIN GENERATED RULE AUTHORITY',end='    // END GENERATED RULE AUTHORITY';
const block=start+'\n    ruleAuthority:'+JSON.stringify(data)+',\n'+end;
const a=html.indexOf(start),b=html.indexOf(end);if(a<0||b<a)throw Error('Rule authority markers missing');
const next=html.slice(0,a)+block+html.slice(b+end.length);
if(process.argv.includes('--check')){if(next!==html)throw Error('Canonical Rule Master and runtime differ');console.log('Canonical authority synchronized');}else fs.writeFileSync(path,next);
