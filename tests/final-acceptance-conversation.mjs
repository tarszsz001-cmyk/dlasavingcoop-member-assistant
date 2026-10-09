import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('index.html','utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
if(!script) throw new Error('No inline app script found');
const noop=()=>{};
const element=()=>({value:'',innerHTML:'',textContent:'',className:'',classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,querySelectorAll:()=>[],scrollIntoView:noop});
const document={getElementById:()=>element(),querySelectorAll:()=>[],querySelector:()=>element(),addEventListener:noop};
const sandbox={console,document,window:{},location:{hash:''},setTimeout:(f)=>{f();return 1},clearTimeout:noop,URL,Date,Math};
vm.createContext(sandbox); vm.runInContext(script,sandbox);
const app=sandbox.COOP_APP;
import assert from 'node:assert/strict';
let count=0;
const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const begin=q=>app.conversationTurn(q);
const reply=(turn,q,continuation=true)=>app.conversationTurn(q,turn.state,{continuation});
const text=t=>[t.result.answer,...(t.result.details||[])].join('\n');
const ordinary=()=>{let t=begin('ผมกู้สามัญได้ไหม');for(const v of ['12 เดือน','200000 บาท','12 งวด','30000 บาท','10000 บาท','1 คน','120 งวด','45 ปี'])t=reply(t,v);return t;};
check('F01 raw offered negative answers advance without repeating facts',()=>{
 let t=ordinary();assert.equal(t.result.requiredFact,'arrears12');
 t=reply(t,'ไม่มี');assert.equal(t.result.requiredFact,'otherCoopDebt');assert.equal(t.result.facts.arrears12,false);
 t=reply(t,'ไม่มี');assert.equal(t.result.decision,'ELIGIBLE_CONDITION');assert.equal(t.result.facts.otherCoopDebt,false);assert.match(text(t),/ไม่ใช่|ยังต้องตรวจ/);
});
check('F01 positive and invalid boolean answers stay safe',()=>{
 const t=ordinary();assert.equal(reply(t,'มี').result.decision,'NOT_YET_ELIGIBLE');
 const invalid=reply(t,'ไม่รู้');assert.equal(invalid.result.requiredFact,'arrears12');assert.deepEqual(invalid.result.facts,t.result.facts);
});
for(const [q,re]of [['ผ่อนได้กี่งวด',/240 งวด/],['กู้ใหม่หักกลบสัญญาเดิมต้องส่งกี่งวด',/12 งวด.*หักกลบ/],['กู้ต้องค้ำกี่คน',/500,000.*1 คน/]])check('F02 type choice preserves '+q,()=>{const t=begin(q);assert.equal(t.result.requiredFact,'loanProduct');assert.match(text(reply(t,'กู้สามัญ')),re);});
check('F02 a new complete main-input question replaces the pending question',()=>{const t=reply(begin('ผ่อนได้กี่งวด'),'กู้ฉุกเฉินวงเงินสูงสุดเท่าไร',false);assert.equal(t.result.concern,'amount');assert.match(t.result.answer,/30,000.*60,000/);assert.doesNotMatch(t.result.answer,/ผ่อนได้/);});
check('F03 child welfare asks a specific choice and preserves document question',()=>{
 let t=begin('ขอสวัสดิการบุตรต้องใช้เอกสารอะไร');assert.equal(t.result.requiredFact,'welfareKind');assert.deepEqual(Array.from(t.result.followups),['คลอดบุตร','ทุนการศึกษาบุตร']);
 t=reply(t,'คลอดบุตร');assert.equal(t.result.intent,'welfare_childbirth');assert.ok(t.result.actions.some(x=>/No=775/.test(x[1])));
 const scholarship=reply(begin('ขอสวัสดิการบุตรต้องใช้เอกสารอะไร'),'ทุนการศึกษาบุตร');assert.notEqual(scholarship.result.intent,'fallback');assert.match(text(scholarship),/ทุน|การศึกษา/);
});
check('F03 generic category is actionable rather than a category loop',()=>{const t=reply(begin('ขอรายละเอียดเพิ่มเติม'),'เป็นเรื่องสวัสดิการ');assert.match(text(t),/สวัสดิการ/);assert.ok(t.result.followups.length);assert.ok(t.result.followups.every(x=>!/^เป็นเรื่อง/.test(x)));});
check('F04 corrected repeat-loan fact works through main input',()=>{
 let t=reply(begin('กู้ฉุกเฉินใหม่ได้ไหม'),'2 งวด');assert.equal(t.result.decision,'NOT_YET_ELIGIBLE');
 t=reply(t,'แก้เป็น 3 งวดครับ',false);assert.equal(t.result.decision,'ELIGIBLE_CONDITION');assert.match(text(t),/3 งวด.*หักกลบ/);
 t=reply(t,'เปลี่ยนเป็น 2 งวดครับ',false);assert.equal(t.result.decision,'NOT_YET_ELIGIBLE');
});
check('F04 guided correction rechecks facts without a new flow',()=>{let t=reply(begin('ผมกู้สามัญได้ไหม'),'5 เดือน');assert.equal(t.result.decision,'NOT_YET_ELIGIBLE');t=reply(t,'แก้เป็น 12 เดือนครับ',false);assert.equal(t.result.facts.membershipMonths,12);assert.equal(t.result.requiredFact,'requestAmount');});
check('F05 stock-balance synonyms use official self-service',()=>{for(const q of ['หุ้นของผมมีเท่าไร','หุ้นผมเท่าไหร่','ยอดหุ้นของฉันเท่าไร']){const r=begin(q).result;assert.equal(r.intent,'member_self_service');assert.ok(r.actions.some(x=>x[1]==='https://member.dlasavingcoop.com/coop/'));assert.equal(r.privacy,true);}});
check('F06 multi-domain question answers both with independent sources',()=>{const r=begin('กู้สามัญได้กี่บาทและลาออกต้องทำยังไง').result;assert.equal(r.intent,'multiple_domains');assert.match(r.answer,/2,000,000/);assert.match(r.answer,/ลาออก/);assert.ok(r.actions.some(x=>/member_end/.test(x[1])));assert.ok(r.sources.length>=2);});
check('F06 compound eligibility is not split into isolated approvals',()=>{assert.notEqual(begin('กู้สามัญเงินเดือนเหลือ 5000 บาทและมีผู้ค้ำ 1 คนได้ไหม').result.intent,'multiple_domains');});
check('F07 stock collateral explicitly locks unverified eligibility',()=>{const r=begin('กู้สามัญใช้หุ้นค้ำได้ไหม').result;assert.equal(r.evidenceState,'NEEDS_PRIMARY_EVIDENCE');assert.equal(r.decision,'NEED_RULE_EXTRACTION');assert.match(r.answer,/ทุนเรือนหุ้น.*ยังไม่มีหลักเกณฑ์เฉพาะ/);assert.doesNotMatch(r.answer,/\d/);assert.ok(r.sources.length);});
check('F08 calculator routes by product without inventing payment formula',()=>{for(const [q,wrong]of [['คำนวณกู้ฉุกเฉิน',/เงินกู้สามัญ/],['คำนวณกู้เคหะ',/เงินกู้สามัญ|เงินกู้ฉุกเฉิน/]]){const r=begin(q).result;assert.match(text({result:r}),/การประเมินเบื้องต้น ไม่ใช่ผลอนุมัติ/);assert.match(text({result:r}),/ไม่อนุมานสูตร/);assert.ok(r.actions.every(x=>!wrong.test(x[0])));}});
check('new explicit subject does not inherit a loan prefix',()=>{let t=begin('กู้รวมหนี้ดอกเบี้ยเท่าไหร่');assert.match(text(reply(t,'แล้วผ่อนได้กี่งวด',false)),/360 งวด/);assert.equal(reply(t,'หุ้นของผมมีเท่าไร',false).result.intent,'member_self_service');assert.match(text(reply(t,'ลาออกต้องทำยังไง',false)),/ลาออก/);});
console.log('FINAL ACCEPTANCE CONVERSATION: '+count+' checks PASS');
