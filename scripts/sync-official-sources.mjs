import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import F from './official-freshness.js';

export const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
// Curl honors the execution host's HTTPS proxy. CI can use native fetch; no credentials are read.
export async function curlFetch(url,options={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'official-sync-'));
 try{
  const args=['--silent','--show-error','--max-time','25','--max-filesize','12582912','--dump-header',path.join(dir,'headers'),'--output',path.join(dir,'body')];
  for(const [key,value]of Object.entries(options.headers||{}))args.push('--header',key+': '+value);
  args.push('--url',url);await promisify(execFile)('curl',args,{timeout:28000,maxBuffer:2000});
  const blocks=(await fs.readFile(path.join(dir,'headers'),'latin1')).trim().split(/\r?\n\r?\n/),last=blocks.at(-1),rows=last.split(/\r?\n/),status=+rows[0].split(' ')[1],headers=new Headers();
  for(const row of rows.slice(1)){const i=row.indexOf(':');if(i>0)headers.append(row.slice(0,i),row.slice(i+1).trim());}
  const body=[204,304].includes(status)?null:await fs.readFile(path.join(dir,'body'));
  return new Response(body,{status,headers});
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
const strip=s=>s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();
export function classify(title){
 if(/สรุป|ประชาสัมพันธ์|อินโฟกราฟิก|infographic/.test(title))return 'DISCOVERY';
 if(/ข้อบังคับ/.test(title))return 'BYLAW';
 if(/แก้ไขเพิ่มเติม|ฉบับที่/.test(title))return 'AMENDMENT';
 if(/ระเบียบ/.test(title))return 'REGULATION';
 if(/หลักเกณฑ์/.test(title))return 'CRITERIA';
 if(/ประกาศ/.test(title)&&!/ผลอนุมัติ|รายชื่อ|ประชุม|สรรหา|รับสมัคร|เอกสารไม่ครบ/.test(title))return 'ANNOUNCEMENT';
 return 'NEWS';
}
export function extractLinks(html,base){
 const out=[],re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
 while((m=re.exec(html))){
  let url;try{url=F.canonical(new URL(m[1].replace(/&amp;/g,'&'),base).toString());}catch{continue;}
  const u=new URL(url);if(!F.officialPage(url)&&u.hostname!=='drive.google.com')continue;
  if(!/\/file\/d\/|\.(?:pdf)$|show\.php/.test(u.pathname))continue;
  const before=html.slice(0,m.index),p=before.lastIndexOf('<p'),start=p>=0&&m.index-p<1800?p:Math.max(0,m.index-260);
  let title=strip(m[2]);
  if(/^(?:คลิกที่นี่|คลิก|ดาวน์โหลด|อ่านต่อ)?$/.test(title)||title.length<5)title=strip(html.slice(start,m.index)).replace(/^\d+\.\s*/,'');
  if(!title||title.length>600)continue;
  title=title.slice(-500);
  const type=classify(title),affects=F.domains(title);
  const year=title.match(/พ\.?\s*ศ\.?\s*(25\d{2})/),amendment=title.match(/ฉบับที่\s*(\d+)/);
  const doc={id:'doc-'+hash(url).slice(0,20),title,type,originalUrl:url,officialIndexUrl:base,linkVerified:true,announcementDate:null,effectiveDate:null,version:year?year[1]:null,amendment:amendment?+amendment[1]:null,affects,status:'PENDING',lastCheckedAt:null,mayAffectRules:!['DISCOVERY','NEWS'].includes(type),fingerprint:hash(url+'\n'+title)};
  if(!out.some(x=>x.originalUrl===url))out.push(doc);
 }
 // The notice index includes its full archive in one response. Only the newest 40 entries are tracked.
 if(new URL(base).searchParams.get('Category')==='notice')return out.filter(d=>{const n=Number(new URL(d.originalUrl).searchParams.get('No'));return n>1000;}).slice(0,40);
 return out;
}
// Only whitelisted official pages or exact Drive attachments linked by them; no arbitrary redirects.
export async function fetchResource(url,{headers={},fetcher=fetch}={}){
 let target=url;
 for(let i=0;i<5;i++){
  const u=new URL(target);
  if(!F.officialPage(target)&&!['drive.google.com','drive.usercontent.google.com'].includes(u.hostname))throw Error('Disallowed source/redirect');
  const response=await fetcher(target,{redirect:'manual',headers:{'user-agent':'DLASavingCoop-Official-Sync/1.0',...headers},signal:AbortSignal.timeout(25000)});
  if([301,302,303,307,308].includes(response.status)){target=new URL(response.headers.get('location'),target).toString();continue;}
  if(response.status===304)return {unchanged:true,response};
  if(!response.ok)throw Error('Official source HTTP '+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>12*1024*1024)throw Error('Source exceeds byte budget');
  return {response,bytes,text:new TextDecoder().decode(bytes),hash:hash(bytes)};
 }
 throw Error('Too many redirects');
}
export function ingest(registry,monitor,links,now,{baseline=false}={}){
 const changes=[];
 for(const doc of links){
  const known=registry.documents.find(x=>F.canonical(x.originalUrl)===doc.originalUrl);
  if(known){
   known.indexFingerprints=known.indexFingerprints||{};
   const previous=known.indexFingerprints[monitor.id];
   if(previous&&previous!==doc.fingerprint&&F.primary(doc)){
    known.status='PENDING';known.mayAffectRules=true;known.pendingReason='OFFICIAL_LINK_METADATA_CHANGED';known.fingerprint=doc.fingerprint;changes.push(known.id);
   }
   known.indexFingerprints[monitor.id]=doc.fingerprint;
   if(!known.fingerprint)known.fingerprint=doc.fingerprint;
   known.lastCheckedAt=now;
   if(!known.officialIndexUrl)known.officialIndexUrl=monitor.url;
   known.linkVerified=true;
  }else{
   doc.indexFingerprints={[monitor.id]:doc.fingerprint};
   doc.lastCheckedAt=now;
   // First inventory distinguishes previously unencoded documents from newly observed publications.
   if(baseline){doc.mayAffectRules=false;doc.pendingReason='BASELINE_INVENTORY_NOT_RULE_PROMOTION';}
   else if(doc.mayAffectRules){doc.pendingReason='NEW_OFFICIAL_DOCUMENT';if(!doc.affects.length)doc.affects=[...monitor.domains];changes.push(doc.id);}
   registry.documents.push(doc);
  }
 }
 return changes;
}
export async function sync(registry,{fetcher=fetch,now=new Date().toISOString(),maxDocumentChecks=8,baseline=false}={}){
 const next=F.clone(registry),changes=[],errors=[];let unchanged=0,processed=0;
 for(const monitor of next.monitors){
  try{
   const resource=await fetchResource(monitor.url,{fetcher,headers:{...(monitor.etag?{'if-none-match':monitor.etag}:{}),...(monitor.lastModified?{'if-modified-since':monitor.lastModified}:{})}});
   if(resource.unchanged)unchanged++;
   else{
    const links=extractLinks(resource.text,monitor.url),fingerprint=hash(JSON.stringify(links.map(d=>[d.originalUrl,d.title]).sort()));
    if(!links.length)throw Error('Official page has no parseable document links; do not mark fresh');
    if(fingerprint!==monitor.fingerprint){
     if(!baseline&&monitor.documentIds&&monitor.id!=='notices'){
      const present=new Set(links.map(d=>F.canonical(d.originalUrl)));
      for(const doc of next.documents.filter(d=>monitor.documentIds.includes(d.id)&&F.primary(d)&&/drive\.google\.com/.test(d.originalUrl)&&!present.has(F.canonical(d.originalUrl)))){doc.status='PENDING';doc.mayAffectRules=true;doc.pendingReason='PRIMARY_LINK_REMOVED';changes.push(doc.id);}
     }
     changes.push(...ingest(next,monitor,links,now,{baseline}));processed++;
    }else{changes.push(...ingest(next,monitor,links,now,{baseline}));unchanged++;}
    monitor.documentIds=links.map(d=>next.documents.find(x=>F.canonical(x.originalUrl)===d.originalUrl)?.id).filter(Boolean);
    monitor.fingerprint=fingerprint;monitor.etag=resource.response.headers.get('etag');monitor.lastModified=resource.response.headers.get('last-modified');
   }
   monitor.lastSuccessfulCheck=now;monitor.lastError=null;
  }catch(e){monitor.lastError=String(e.message);errors.push({monitor:monitor.id,error:monitor.lastError});}
 }
 const candidates=next.documents.filter(d=>F.primary(d)&&d.linkVerified&&/drive\.google\.com\/file\/d\//.test(d.originalUrl)).sort((a,b)=>(a.lastContentCheck||'').localeCompare(b.lastContentCheck||''));
 for(const doc of candidates.slice(0,maxDocumentChecks)){
  try{
   const id=new URL(doc.originalUrl).pathname.match(/\/file\/d\/([^/]+)/)[1];
   const r=await fetchResource('https://drive.google.com/uc?export=download&id='+id,{fetcher,headers:doc.etag?{'if-none-match':doc.etag}:{}});
   if(r.unchanged)unchanged++;
   else{
    if(new TextDecoder().decode(r.bytes.slice(0,5))!=='%PDF-')throw Error('Attachment is not a PDF; login/HTML cannot verify evidence');
    if(doc.contentHash&&doc.contentHash!==r.hash){doc.status='PENDING';doc.mayAffectRules=true;doc.pendingReason='PRIMARY_DOCUMENT_BYTES_CHANGED';changes.push(doc.id);}
    if(doc.contentHash===r.hash)unchanged++;else processed++;
    doc.contentHash=r.hash;doc.etag=r.response.headers.get('etag');
   }
   doc.lastContentCheck=now;doc.contentError=null;
  }catch(e){doc.contentError=String(e.message);errors.push({document:doc.id,error:doc.contentError});}
 }
 next.lastSyncAt=now;
 const changedDocs=next.documents.filter(d=>changes.includes(d.id));
 return {registry:next,report:{checkedAt:now,processed,unchanged,changes:[...new Set(changes)],impactedDomains:[...new Set(changedDocs.flatMap(d=>d.affects))],errors,policy:'Detection never promotes or rewrites Rule Master'}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const path=new URL('../data/official-source-registry.json',import.meta.url),registry=JSON.parse(await fs.readFile(path,'utf8'));
 const result=await sync(registry,{fetcher:process.argv.includes('--curl')?curlFetch:fetch,baseline:process.argv.includes('--baseline'),maxDocumentChecks:Number(process.env.OFFICIAL_SYNC_DOCUMENT_BUDGET||8)});
 await fs.writeFile(new URL('../data/official-source-monitor.json',import.meta.url),JSON.stringify(result.registry,null,2)+'\n');
 await fs.writeFile(new URL('../docs/official-source-sync-report.json',import.meta.url),JSON.stringify(result.report,null,2)+'\n');
 console.log(JSON.stringify(result.report,null,2));
 // Partial failures are recorded; unaffected monitors remain usable, failed domains age into Evidence Lock.
 if(result.registry.monitors.every(m=>m.lastSuccessfulCheck!==result.report.checkedAt))process.exitCode=1;
}
