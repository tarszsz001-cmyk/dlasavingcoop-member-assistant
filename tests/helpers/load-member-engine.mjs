import fs from 'node:fs';
import vm from 'node:vm';
export function loadMemberEngine(html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8')){
 const noop=()=>{};
 const element=()=>({value:'',innerHTML:'',textContent:'',className:'',classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,querySelectorAll:()=>[],scrollIntoView:noop});
 const document={getElementById:()=>element(),querySelectorAll:()=>[],querySelector:()=>element(),addEventListener:noop};
 const sandbox={console,document,window:{},location:{hash:''},setTimeout:f=>{f();return 1},clearTimeout:noop,URL,Date,Math};
 vm.createContext(sandbox);vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),sandbox);
 if(!sandbox.COOP_APP)throw Error('Engine not exposed');
 return sandbox.COOP_APP;
}
