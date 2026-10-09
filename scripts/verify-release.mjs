import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url),tests=fs.readdirSync(new URL('../tests/',import.meta.url)).filter(x=>/\.(?:mjs|cjs)$/.test(x)).sort();
for(const [script,args]of [['scripts/sync-rule-authority.mjs',['--check']],['scripts/sync-official-runtime.mjs',['--check']],...tests.map(x=>['tests/'+x,[]])]){
 const result=spawnSync(process.execPath,[script,...args],{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
console.log('RELEASE GATE: '+tests.length+' suites passed; none skipped');
