import fs from 'node:fs/promises';

const HOME='https://www.dlasavingcoop.com/';
const NOTICES='https://www.dlasavingcoop.com/list.php?Category=notice';
const OUT=new URL('../data/current-events.json',import.meta.url);

const TH_MONTHS={
  'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,
  'กรกฎาคม':7,'กรกฏาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12
};

function decode(s=''){
  return s
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;|&#34;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/\s+/g,' ')
    .trim();
}

function resolveUrl(href,base){
  try{
    const u=new URL(href,base);
    if(!/^(www\.)?dlasavingcoop\.com$/i.test(u.hostname)) return null;
    if(/board_(?:content|post)\.php/i.test(u.pathname)) return null;
    if(!/(?:show|list)\.php$/i.test(u.pathname)) return null;
    u.protocol='https:';
    return u.toString();
  }catch{return null}
}

function idFrom(url,title){
  try{
    const u=new URL(url);
    const no=u.searchParams.get('No');
    if(no) return 'official-'+no;
  }catch{}
  return 'title-'+title.replace(/[^ก-๙a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,60);
}

function scoreTitle(title){
  const currentThaiYear=new Date().getFullYear()+543;
  const years=[...title.matchAll(/25\d{2}/g)].map(m=>Number(m[0]));
  if(years.some(y=>y<currentThaiYear)) return 0;
  let score=0;
  const tests=[
    [/ยืนยันยอด/i,100],
    [/ประชุมใหญ่สามัญ/i,95],
    [/ปันผล|เฉลี่ยคืน/i,93],
    [/ซื้อหุ้นเพิ่ม|หุ้นเพิ่ม/i,90],
    [/ส่งเอกสาร|เอกสาร.*ไม่ครบ|เอกสารไม่ครบ/i,88],
    [/เรียกเก็บ|เงินสมทบ|สมนาคุณ|ค่าบำรุง/i,82],
    [/ประกัน/i,80],
    [/ทุนการศึกษา|สวัสดิการ/i,72],
    [/ผลการอนุมัติ|ผลอนุมัติ/i,68],
    [/คืนสู่เหย้า|กลับเข้าเป็นสมาชิก/i,66],
    [/สรรหา|ลงคะแนน/i,64],
    [/สัญจร/i,48]
  ];
  for(const [re,n] of tests) if(re.test(title)) score=Math.max(score,n);
  if(/รับสมัครบริษัท|รับสมัครบุคคล|สอบแข่งขันเป็นเจ้าหน้าที่|รายชื่อผู้สอบ/i.test(title)) score=0;
  if(/ข่าวการประชุม.*อนุกรรมการ|คณะอนุกรรมการ/i.test(title)) score=0;
  return score;
}

function eventMeta(title){
  if(/ยืนยันยอด/i.test(title)) return {status:'action',statusLabel:'ต้องดำเนินการ',ask:'หนังสือยืนยันยอด 2569'};
  if(/ปันผล|เฉลี่ยคืน/i.test(title)) return {status:'money',statusLabel:'เรื่องการเงิน',ask:'ปันผลปี 69'};
  if(/ประชุมใหญ่/i.test(title)) return {status:'notice',statusLabel:'ประกาศใหม่',ask:'ประชุมใหญ่'};
  if(/หุ้นเพิ่ม|ซื้อหุ้น/i.test(title)) return {status:'action',statusLabel:'สิทธิสมาชิก',ask:'ซื้อหุ้นเพิ่ม'};
  if(/ประกัน/i.test(title)) return {status:'action',statusLabel:'ต้องตรวจสอบ',ask:'เรื่องประกันสหกรณ์'};
  if(/สวัสดิการ|ผลการอนุมัติ|เอกสารไม่ครบ|เลขทะเบียน/i.test(title)) return {status:'result',statusLabel:'ติดตามผล',ask:'ติดตามผลและสถานะเอกสาร'};
  if(/สมาชิก|คืนสู่เหย้า/i.test(title)) return {status:'notice',statusLabel:'สมาชิก',ask:'เรื่องสมาชิก'};
  return {status:'notice',statusLabel:'ประกาศใหม่',ask:'ข่าวและประกาศล่าสุด'};
}

function parsePublishedNear(html,end){
  const rowEnd=html.indexOf('</tr>',end);
  const stop=rowEnd>0&&rowEnd-end<1600?rowEnd:end+800;
  const s=decode(html.slice(end,stop));
  const m=s.match(/(20\d{2}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  return m ? new Date(m[1]+'T'+m[2]+'+07:00').toISOString() : null;
}

function thaiDateToISO(day,month,year){
  const mon=TH_MONTHS[month];
  let y=Number(year);
  if(y<100) y+=2500;
  if(y>2400) y-=543;
  if(!mon||!day||!y) return null;
  return `${y}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function findImportantDate(text){
  const cleaned=decode(text);
  const deadline=cleaned.match(/ภายในวันที่\s*(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|กรกฏาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{2,4})/i);
  if(deadline){
    const d=thaiDateToISO(deadline[1],deadline[2],deadline[3]);
    return d?{date:d,kind:'deadline'}:null;
  }
  const meeting=cleaned.match(/(?:วัน(?:จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์|อาทิตย์)ที่|วันที่)\s*(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|กรกฏาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{2,4})/i);
  if(meeting){
    const d=thaiDateToISO(meeting[1],meeting[2],meeting[3]);
    return d?{date:d,kind:'event'}:null;
  }
  return null;
}

function plusOneDayIso(date){
  const d=new Date(date+'T00:00:00+07:00');
  d.setUTCDate(d.getUTCDate()+1);
  return d.toISOString();
}

function prettyDate(iso){
  if(!iso) return '';
  const d=new Date(iso+'T00:00:00+07:00');
  return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'}).format(d);
}

async function fetchText(url){
  const r=await fetch(url,{headers:{'user-agent':'DLASavingCoop-Member-Assistant/1.0 (+official monitoring)'}});
  if(!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}

function anchors(html,base,source){
  const out=[];
  const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=re.exec(html))){
    const title=decode(m[2]);
    const url=resolveUrl(m[1],base);
    if(!url||title.length<6) continue;
    const score=scoreTitle(title);
    if(score<60) continue;
    out.push({
      id:idFrom(url,title),title,url,score,source,
      publishedAt:parsePublishedNear(html,re.lastIndex)
    });
  }
  return out;
}

async function enrich(item){
  let body='';
  try{body=await fetchText(item.url)}catch{return item}
  const date=findImportantDate(body);
  const meta=eventMeta(item.title);
  let expiresAt=null,eventDate=null;
  if(date){
    eventDate=date.date;
    expiresAt=plusOneDayIso(date.date);
  }
  let summary='';
  if(/ยืนยันยอด/i.test(item.title)) summary='ตรวจสอบ → ติ๊กเลือก → ส่งคืน';
  else if(/ประชุมใหญ่/i.test(item.title)&&eventDate) summary=`กำหนด ${prettyDate(eventDate)} — เปิดดูสถานที่/กำหนดการจากประกาศทางการ`;
  else if(/ปันผล|เฉลี่ยคืน/i.test(item.title)&&eventDate) summary=`กำหนดดำเนินการภายใน ${prettyDate(eventDate)}`;
  else if(/หุ้นเพิ่ม/i.test(item.title)) summary='ตรวจเงื่อนไขและช่วงเวลาจากประกาศล่าสุดก่อนดำเนินการ';
  else if(/ผลการอนุมัติ/i.test(item.title)) summary='เปิดตรวจผลจากประกาศทางการ';
  else summary='เปิดดูรายละเอียดจากประกาศทางการ';

  return {
    contentKind:'NEWS',rulePromotion:false,
    id:item.id,title:item.title.replace(/^\s*\[[^\]]+\]\s*/,''),summary,
    status:meta.status,statusLabel:meta.statusLabel,priority:item.score,
    url:item.url,ask:meta.ask,source:item.source,publishedAt:item.publishedAt,
    eventDate,expiresAt
  };
}

function unique(items){
  const map=new Map();
  for(const x of items){
    const key=x.url.replace(/^https:\/\/(www\.)?/,'https://');
    if(!map.has(key)||x.score>map.get(key).score) map.set(key,x);
  }
  return [...map.values()];
}

const now=new Date();
let existing={schemaVersion:1,events:[]};
try{existing=JSON.parse(await fs.readFile(OUT,'utf8'))}catch{}

const sourceHealth={homepage:'error',notices:'error'};
let found=[];
let homepageHtml='';
try{
  const h=await fetchText(HOME);
  homepageHtml=h;
  sourceHealth.homepage='ok';
  found.push(...anchors(h,HOME,'homepage'));
}catch(e){console.error('homepage:',e.message)}
try{
  const h=await fetchText(NOTICES);
  sourceHealth.notices='ok';
  found.push(...anchors(h,NOTICES,'official-notice'));
}catch(e){console.error('notices:',e.message)}

if(sourceHealth.homepage==='error'&&sourceHealth.notices==='error'){
  console.error('Both official sources failed; retaining current-events.json');
  process.exit(0);
}

let candidates=unique(found)
  .sort((a,b)=>b.score-a.score)
  .slice(0,10);

const enriched=[];
for(const item of candidates) enriched.push(await enrich(item));

const active=enriched.filter(x=>{
  if(x.priority<75) return false;
  if(x.expiresAt && new Date(x.expiresAt)<=now) return false;
  if(!x.eventDate && x.publishedAt){
    const ageMs=now-new Date(x.publishedAt);
    if(ageMs>30*24*60*60*1000) return false;
  }
  return true;
});

// Preserve the official confirmation banner only when the current homepage still contains evidence of it.
if(!active.some(x=>/ยืนยันยอด/.test(x.title))){
  const homepageEvidence=/ยืนยันยอด|show\.php\?No=4910/i.test(decode(homepageHtml)) || /show\.php\?No=4910/i.test(homepageHtml);
  const old=(existing.events||[]).find(x=>x.id==='official-4910'||x.id==='balance-confirmation-2569'||/ยืนยันยอด/.test(x.title));
  if(old&&sourceHealth.homepage==='ok'&&homepageEvidence) active.push(old);
}

const top=active
  .sort((a,b)=>b.priority-a.priority)
  .slice(0,3);

const output={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  lastCheckedAt:new Date().toISOString(),
  mode:'official-auto',
  sourceHealth,
  rules:{
    maxItems:3,
    source:'official dlasavingcoop.com only',
    selection:'actionable member news only',
    expiry:'explicit deadlines/event dates expire automatically'
  },
  events:top
};

await fs.mkdir(new URL('../data/',import.meta.url),{recursive:true});
await fs.writeFile(OUT,JSON.stringify(output,null,2)+'\n','utf8');
console.log(`current events updated: ${top.length} item(s)`);
