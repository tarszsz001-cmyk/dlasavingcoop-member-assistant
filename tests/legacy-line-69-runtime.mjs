import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadMemberEngine} from './helpers/load-member-engine.mjs';
export function runLegacy69(app=loadMemberEngine()){
 const corpus=JSON.parse(fs.readFileSync(new URL('../data/legacy-line-69-corpus.json',import.meta.url),'utf8'));
 assert.equal(corpus.records.length,69);
 const products={qualityOfLifeCurrent:'กู้รวมหนี้ ',specialHousingCurrent:'กู้เคหะ ',emergencyLoanCurrent:'กู้ฉุกเฉิน ',ordinaryLoanCurrent:'กู้สามัญ ',education:'กู้เพื่อการศึกษา ',disaster:'กู้ภัยพิบัติ '};
 const report=[];let patterns=0;
 for(const row of corpus.records){
  const errors=[];const results=[];
  for(const [index,q]of row.question_patterns.entries()){
   patterns++;
   try{
    let r=app.answer(q);
    assert.ok(r?.answer?.trim(),'empty response');
    // Unscoped variants retain the product from the member's conversation.
    const hasProduct=/รวมหนี้|คุณภาพชีวิต|เคหะ|กู้บ้าน|กู้ปลูกบ้าน|กู้ปลูกสร้าง|ฉุกเฉิน|สามัญ|การศึกษา|กู้เรียน|ภัยพิบัติ|กู้พิบัติ/.test(q);
    if(row.expected_rule&&!hasProduct){
     const contextual=app.contextualize(q,row.expected_rule);
     assert.notEqual(contextual,q,'product follow-up context lost');
     r=app.answer(contextual);
    }
    // Row 48 intentionally contains no product: ask the single missing fact, then resume.
    if(row.id===48){assert.equal(app.answer(q).decision,'NEED_INFO');r=app.answer(products.ordinaryLoanCurrent+q);}
    const all=[r.answer,...(r.details||[])].join(' ');
    assert.ok(r.intent!=='fallback','intent fell through to fallback');
    if(row.expected_rule){
     assert.equal(r.domain,row.expected_rule,'wrong product domain');
     assert.ok((r.sources||[]).some(s=>s.url===row.expected_source),'missing exact current primary evidence');
     for(const text of row.pattern_assertions[index])assert.ok(all.includes(text),'missing current answer: '+text);
     if(/เหลือ|รายได้/.test(q)&&r.concern==='income'){
      assert.ok(!/5,?000|30\s*%|25\s*%/.test(r.answer),'superseded income rule');
     }
     if(r.decision==='NEED_RULE_EXTRACTION')assert.match(all,/Evidence Lock|ยังไม่ได้ยืนยัน/,'unverified rule must state evidence lock');
    }else{
     assert.equal(r.intent,row.intent==='membership'?'member_apply':row.intent,'wrong service domain');
     if(row.expected_source)assert.ok((r.actions||[]).some(a=>a[1]===row.expected_source),'wrong service action');
     for(const text of row.pattern_assertions[index])assert.ok(all.includes(text),'missing actionable answer: '+text);
    }
    assert.ok((r.actions||[]).some(a=>/^https:|#ask:/.test(a[1]))||r.followups?.length,'staff-only dead end');
    assert.ok(!(r.sources||[]).some(s=>/facebook|line\.me|board_content/.test(s.url)),'non-authority source used as rule');
    assert.ok(!/อนุมัติแล้ว|กู้ได้แน่นอน/.test(r.answer),'invented member approval');
    results.push({question:q,intent:r.intent,answer:r.answer,decision:r.decision||null});
   }catch(e){errors.push({question:q,rootCause:e.message});}
  }
  report.push({id:row.id,status:errors.length?(errors.length===row.question_patterns.length?'FAIL':'PARTIAL'):'PASS',errors,results});
 }
 const counts=report.reduce((a,r)=>(a[r.status]++,a),{PASS:0,PARTIAL:0,FAIL:0});
 return {counts,patterns,report};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const result=runLegacy69();fs.writeFileSync(process.env.LEGACY69_REPORT||new URL('../docs/legacy-69-execution.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log('Real LINE runtime:',result.counts,'patterns:',result.patterns);
 for(const r of result.report)if(r.errors.length)console.error(r.id,r.status,JSON.stringify(r.errors));
 if(result.counts.PARTIAL||result.counts.FAIL)process.exit(1);
}
