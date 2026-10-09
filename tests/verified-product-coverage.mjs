import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadMemberEngine} from './helpers/load-member-engine.mjs';
const app=loadMemberEngine(),master=JSON.parse(fs.readFileSync(new URL('../data/official-rule-master.json',import.meta.url)));
const products=[['กู้สามัญ','ordinaryLoanCurrent'],['กู้ฉุกเฉิน','emergencyLoanCurrent'],['กู้รวมหนี้','qualityOfLifeCurrent'],['กู้เคหะ','specialHousingCurrent'],['กู้ไถ่ถอนจำนอง','redeemMortgageCurrent']];
const concerns=['ต้องเป็นสมาชิกกี่เดือน','ส่งค่าหุ้นกี่งวด','วงเงินสูงสุดเท่าไร','ผ่อนได้กี่งวด','รายได้ต้องคงเหลือเท่าไร','ดอกเบี้ยเท่าไร','ต้องหักจากเงินเดือนหรือไม่','ต้องไม่มีหนี้กับสหกรณ์อื่นไหม','ต้องไม่ค้างชำระกี่งวด','ต้องทำประกันอัคคีภัยไหม','ใครจ่ายค่าประเมิน','ผู้ประเมินเป็นใคร','ต้องตรวจเครดิตบูโรไหม'];
for(const [name,key] of products)for(const concern of concerns){
 const a=app.answer(name+' '+concern);
 assert.equal(a.domain,key,name+' '+concern);
 assert.ok(a.answer.trim());
 assert.doesNotMatch(JSON.stringify(a),/undefined|NaN|null งวด/);
 assert.ok(a.actions.length,'official next action');
 if(!/ดอกเบี้ย/.test(concern))assert.ok(JSON.stringify(a.sources).includes(master.rules[key].source),'exact current primary source');
}
const member=app.answer('กู้ไถ่ถอนจำนองต้องเป็นสมาชิกกี่เดือน');
assert.match(member.answer,/12 เดือน/);
assert.match(member.answer,/ไม่ค้างชำระ.*12 งวด/);
assert.doesNotMatch(member.answer,/ต่อเนื่องไม่น้อยกว่า 12 งวด/,'do not invent a minimum monthly-share duration');
assert.match(app.answer('กู้ไถ่ถอนจำนองวงเงินสูงสุดเท่าไร').answer,/ยอดหนี้จำนองเดิม.*3,000,000/);
assert.match(app.answer('กู้ไถ่ถอนจำนองต้องผ่อนธนาคารเดิมกี่ปี').answer,/3 ปี.*ไม่มีการผิดนัด/);
console.log('VERIFIED PRODUCT COVERAGE: 65 actual inquiries across all five products PASS');
