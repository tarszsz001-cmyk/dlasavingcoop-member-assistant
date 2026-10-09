import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));let server,url=process.env.MEMBER_APP_URL;
if(!url){server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!file.startsWith(root)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'application/json');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port+'/';}
const browser=await chromium.launch({headless:true,...(process.env.MEMBER_CHROMIUM_PATH?{executablePath:process.env.MEMBER_CHROMIUM_PATH}:{}),args:['--no-sandbox']});
let pass=0;
try{
 for(const width of [390,1365]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(url,{waitUntil:'domcontentloaded'});
  const ask=async q=>{await page.locator('#homeBtn').click();await page.locator('#q').fill(q);await page.locator('#q').press('Enter');await page.waitForFunction(()=>!!document.querySelector('#out .body')?.textContent);return page.locator('#out .body').textContent();};
  assert.match(await ask('ตอนนี้กู้สามัญผ่อนได้กี่งวด'),/240 งวด/);pass++;
  assert.match(await ask('กู้ฉุกเฉิน ณ วันที่ 30 กันยายน 2569 ต้องเป็นสมาชิกกี่เดือน'),/6 เดือน/);pass++;
  assert.match(await ask('เงินเดือน 32,000 บาท ปัจจุบันต้องถือหุ้นเดือนละเท่าไร'),/ประกาศอัตรา|ตาราง/);assert.doesNotMatch(await page.locator('#out .body').textContent(),/1,600|1600/);pass++;
  assert.match(await ask('สมาชิกเกษียณอายุราชการแล้วสามารถค้ำประกันเงินกู้ได้หรือไม่'),/ต้องตรวจ|ยืนยัน/);assert.ok(await page.locator('#out a[href*="contact"]').count());pass++;
  await ask('กรณีเพิ่มกู้เงินพัฒนาคุณภาพชีวิตมา สามารถกู้ฉุกเฉินต่อได้เลยไหม');
  let lineOut=await page.locator('#out').textContent();
  assert.match(lineOut,/ชำระแล้วกี่งวด/);
  assert.doesNotMatch(lineOut,/แบบฟอร์มเงินกู้สามัญ|งานเงินกู้สามัญ 083-928-8638/);
  assert.ok(await page.getByRole('button',{name:'3 งวด',exact:true}).count());
  await page.getByRole('button',{name:'3 งวด',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#out .body')?.textContent.includes('ผ่านเงื่อนไขจำนวนงวด'));
  lineOut=await page.locator('#out').textContent();
  assert.doesNotMatch(lineOut,/แบบฟอร์มเงินกู้สามัญ|งานเงินกู้สามัญ 083-928-8638/);pass++;
  assert.match(await ask('ส่งพัฒนาคุณภาพชีวิตครบ 3 งวด แต่ถ้ากู้สามัญใหญ่เพื่อปิดกู้พัฒนาคุณภาพชีวิต สามารถยื่นเอกสารได้เลยใช่ไหม'),/เฉพาะเงินกู้ฉุกเฉิน/);pass++;
  assert.match(await ask('ถ้าสามัญใหญ่ส่งครบ 12 งวด สามารถยื่นได้ แจ้งความประสงค์หักกลบสัญญาเพื่อพัฒนาคุณภาพชีวิต เนื่องจากตามหลักเกณฑ์ไม่หักกลบสัญญาเพื่อพัฒนาคุณภาพชีวิต ใช่ไหม'),/เฉพาะเงินกู้ฉุกเฉิน/);pass++;
  await ask('กรอกคำขอเปลี่ยนแปลงแล้ว ต้องแนบเอกสารอะไรเพิ่มเติมหรือไม่ และส่งเอกสารไปที่ไหน');assert.match(await page.locator('#out').textContent(),/111\/1.*คลองหลวง 8/);pass++;
  // Synthetic new publication exists only in this test page, never in production data.
  await page.evaluate(()=>{const r=COOP_APP.getSourceRegistry();r.documents.push({id:'browser-test-new-shares',title:'ระเบียบว่าด้วยหุ้น แก้ไขเพิ่มเติม (เอกสารจำลองเพื่อทดสอบ)',type:'AMENDMENT',originalUrl:'https://drive.google.com/file/d/test-browser-fixture/view',officialIndexUrl:'https://www.dlasavingcoop.com/show.php?Category=procedure',linkVerified:true,status:'PENDING',mayAffectRules:true,affects:['shares'],effectiveDate:null});COOP_APP.applySourceMonitor(r);});
  assert.match(await ask('หุ้นรายเดือนตอนนี้ต้องส่งเท่าไร'),/พบเอกสารทางการ.*ยืนยัน/);pass++;
  assert.match(await ask('ตอนนี้กู้สามัญผ่อนได้กี่งวด'),/240 งวด/);pass++;
  await ask('ยอดหุ้นของผมเท่าไร');assert.ok(await page.locator('#out a[href="https://member.dlasavingcoop.com/coop/"]').count());pass++;
  await page.reload({waitUntil:'domcontentloaded'});await ask('ผมกู้สามัญได้ไหม');
  await page.evaluate(()=>{const r=COOP_APP.getSourceRegistry();r.documents.push({id:'browser-test-loan-change',title:'หลักเกณฑ์เงินกู้สามัญ (เอกสารจำลอง)',type:'CRITERIA',originalUrl:'https://drive.google.com/file/d/test-loan-fixture/view',officialIndexUrl:'https://www.dlasavingcoop.com/show.php?No=774',linkVerified:true,status:'PENDING',mayAffectRules:true,affects:['ordinaryLoan']});COOP_APP.applySourceMonitor(r);});
  await page.getByRole('textbox',{name:'ตอบข้อมูลเพิ่มเติม',exact:true}).fill('12 เดือน');await page.getByRole('button',{name:'ส่ง',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#out .body')?.textContent.includes('พบเอกสารทางการ'));pass++;
  assert.deepEqual(errors,[]);assert.ok(await page.locator('.brand-logo').isVisible());
  console.log('FRESHNESS BROWSER '+width+'px: 12 PASS, current/history/pending/privacy/conversation PASS');await page.close();
 }
 console.log('FRESHNESS BROWSER:',pass,'PASS / 0 FAIL');
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
