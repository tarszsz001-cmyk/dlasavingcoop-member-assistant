import fs from 'node:fs';
import assert from 'node:assert/strict';
import F from './official-freshness.js';
import {loadMemberEngine} from '../tests/helpers/load-member-engine.mjs';
export function impactedQuestions(corpus,extra,domains){
 const set=new Set(domains),rows=[];
 for(const record of [...corpus.records,...extra.records]){
  for(const q of record.question_patterns||[record.question]){
   const ds=F.queryDomains(q);const ruleDomain=record.expected_rule&&({'ordinaryLoanCurrent':'ordinaryLoan','emergencyLoanCurrent':'emergencyLoan','qualityOfLifeCurrent':'qualityOfLife','specialHousingCurrent':'specialHousing','redeemMortgageCurrent':'redeemMortgage','education':'educationLoan','disaster':'disasterLoan'})[record.expected_rule];
   if(ruleDomain&&!ds.includes(ruleDomain))ds.push(ruleDomain);
   if((record.domains||[]).some(x=>set.has(x))||ds.some(x=>set.has(x)))rows.push({id:record.id,question:q,expectedRule:record.expected_rule||record.ruleId||null,valueField:record.valueField||null});
  }
 }
 return rows;
}
export function compareImpacted(rows,before,after,registry){
 return rows.map(row=>{
  const q=row.expectedRule?before.contextualize(row.question,row.expectedRule):row.question;
  const a=before.answer(q),b=after.answer(q),check=after.freshnessStatus(q);
  assert.ok(b.answer?.trim(),'Affected question returned no answer');
  if(!check.allowed)assert.equal(b.decision,'EVIDENCE_LOCK','Pending document must stop old answers');
  if(check.allowed&&row.valueField){const time=F.asOf(q),v=F.versionAt(registry,row.expectedRule,time.date);if(v){const value=v.values[row.valueField];assert.ok(value!==undefined);assert.ok(b.answer.includes(String(value))||b.answer.includes(Number(value).toLocaleString('th-TH')),'Answer must use dated CURRENT value');}}
  assert.ok(b.actions?.length||b.followups?.length,'Affected question must have a next action');
  assert.ok(!b.sources?.some(s=>/facebook|line\.me|board_content/.test(s.url)),'Discovery source used as authority');
  return {...row,before:{answer:a.answer,decision:a.decision||null},after:{answer:b.answer,decision:b.decision||null},status:'PASS',expectedVersion:row.expectedRule?F.versionAt(registry,row.expectedRule,check.date)?.id||null:null};
 });
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
 const report=read('docs/official-source-sync-report.json'),corpus=read('data/legacy-line-69-corpus.json'),extra=read('data/member-freshness-questions.json'),snapshot=read('data/official-source-monitor.json');
 const rows=impactedQuestions(corpus,extra,report.impactedDomains),before=loadMemberEngine(),after=loadMemberEngine();after.applySourceMonitor(snapshot);
 const results=compareImpacted(rows,before,after,after.getSourceRegistry());
 const out={checkedAt:report.checkedAt,impactedDomains:report.impactedDomains,permanentLineRecords:corpus.records.length,rerunQuestions:results.length,PASS:results.length,FAIL:0,results};
 fs.writeFileSync(new URL('../docs/impacted-regression.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log('IMPACTED REGRESSION:',out.rerunQuestions,'PASS / 0 FAIL; LINE records retained:',out.permanentLineRecords);
}
