import * as C from './core.mjs';
import {dispatchState} from './dispatch.mjs';
import {b64,validateSubscription,sendPush} from './web-push.mjs';
const fail=(m,status=400)=>Object.assign(Error(m),{status}),enc=new TextEncoder(),prepared=new WeakSet();
const hash=async s=>b64(await crypto.subtle.digest('SHA-256',enc.encode(s)));
export function pushConfig(env){try{const c=JSON.parse(env.SDM_PUSH_VAPID||'null');return c?.publicKey&&c?.privateKey?.d?c:null;}catch{return null;}}
export async function pushTables(db){if(prepared.has(db))return;for(const sql of [
 'CREATE TABLE IF NOT EXISTS tournament_push_subs (id TEXT PRIMARY KEY, endpoint_hash TEXT UNIQUE NOT NULL, secret_hash TEXT NOT NULL, subscription TEXT NOT NULL, filters TEXT NOT NULL, run TEXT NOT NULL, expires INTEGER NOT NULL, ip TEXT NOT NULL, created INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS tournament_push_events (id TEXT PRIMARY KEY, run TEXT NOT NULL, data TEXT NOT NULL, at INTEGER NOT NULL, expires INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS tournament_push_delivery (id TEXT PRIMARY KEY, sub TEXT NOT NULL, event TEXT NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL, next INTEGER NOT NULL, lease TEXT, error INTEGER)',
 'CREATE INDEX IF NOT EXISTS push_events_time ON tournament_push_events(expires)',
 'CREATE INDEX IF NOT EXISTS push_delivery_pending ON tournament_push_delivery(state,next)'
])await db.prepare(sql).run();prepared.add(db);}
const run=s=>s.runId||'initial';
async function signature(env,value){const config=pushConfig(env);if(!config)throw fail('Benachrichtigungen werden eingerichtet',503);const key=await crypto.subtle.importKey('raw',enc.encode(config.privateKey.d),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}
// A short-lived, same-origin form token protects the unauthenticated opt-in.
export async function notificationConfig(env){const config=pushConfig(env);if(!config)return {available:false};const nonce=Date.now()+'.'+crypto.randomUUID(),sig=await signature(env,nonce);return {available:true,publicKey:config.publicKey,csrf:nonce+'.'+sig};}
async function validCsrf(env,value){const p=String(value||'').split('.');if(p.length!==3||!Number.isFinite(Number(p[0]))||Date.now()-Number(p[0])>1800000||Number(p[0])>Date.now()+10000||p[2]!==await signature(env,p[0]+'.'+p[1]))throw fail('Benachrichtigungsseite neu laden',403);}
export function callEvents(s){
 if(!s.event.published)return [];const out=[],jobs=dispatchState(s),ranks=new Map(jobs.map((q,i)=>[q.id,i]));

 for(let t=1;t<=5;t++){
  const settings=s.tatamis.find(m=>m.id===t);if(settings?.paused||settings?.deskClosed)continue;
  const own=jobs.filter(q=>q.tatami===t&&q.status!=='done'&&!q.held),live=s.bouts.find(b=>b.status==='live'&&C.tatami(s,b)===t);
  const ready=C.readyOnTatami(s,t,jobs).filter(b=>C.phasePermitted(s,b,jobs));
  for(const q of own.filter(q=>q.released)){const g=s.groups.find(g=>g.code===q.group),ids=new Set(s.bouts.filter(b=>b.group===q.group&&C.jobId(g,b)===q.id).flatMap(b=>[b.aka,b.shiro]).filter(Boolean)),es=s.entries.filter(e=>e.active&&ids.has(e.id)).map(e=>C.ent(s,e.id)),members=[...new Set(es.flatMap(e=>C.members(s,e.id)))];out.push({id:run(s)+'|call|'+q.id+'|'+t+'|'+(s.groups.find(g=>g.code===q.group).draw?.at||''),run:run(s),kind:'group',group:q.group,tatami:t,people:members,dojos:[...new Set(es.map(e=>e.dojo))],title:q.group+' · Aufruf auf Tatami '+t,body:(q.pool?'Pool '+q.pool:'Finalrunde')+' ist freigegeben. Bitte an Tatami '+t+' bereithalten.',url:'index.html?tatami='+t+'&gruppe='+encodeURIComponent(q.group)+'#lists'});}
  const next=ready.find(b=>jobs.find(q=>q.id===C.jobId(s.groups.find(g=>g.code===b.group),b))?.released);
  for(const [kind,b]of [['next',next],['live',live]])if(b){const es=[b.shiro,b.aka].filter(Boolean).map(id=>C.ent(s,id)),names=es.map(e=>e.name).join(' / ');out.push({id:run(s)+'|'+kind+'|'+b.id+'|'+t+'|'+(kind==='live'?b.started:''),run:run(s),kind,group:b.group,tatami:t,people:[...new Set([b.aka,b.shiro].flatMap(id=>C.members(s,id)))],dojos:[...new Set(es.map(e=>e.dojo))],title:(kind==='next'?'Als Nächstes':'Jetzt gestartet')+' · Tatami '+t,body:names+' · '+b.group,url:'index.html?tatami='+t+'&gruppe='+encodeURIComponent(b.group)+'#lists'});}
 }
 return out;
}
export const matches=(filters,event)=>(filters.groups||[]).includes(event.group)||(filters.dojos||[]).some(d=>event.dojos.includes(d))||(filters.athletes||[]).some(id=>event.people.includes(id));
export function changedCalls(before,after){const old=new Set(before.map(e=>e.id));return after.filter(e=>!old.has(e.id));}
export function eventStatements(db,events,generation){return events.map(e=>db.prepare("INSERT OR IGNORE INTO tournament_push_events(id,run,data,at,expires) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM tournament_state WHERE id='main' AND generation=?)").bind(e.id,e.run,JSON.stringify(e),Date.now(),Date.now()+120000,generation));}
export async function subscribe(request,env,s,a,{fetcher=fetch}={}){
 await validCsrf(env,a.csrf);const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)throw fail('Fremder Ursprung',403);
 const db=env.DB;await pushTables(db);const now=Date.now(),expires=Date.parse(s.event.date+'T23:59:59+02:00')+86400000;
 if(['remove','test'].includes(a.op)){
  const row=await db.prepare('SELECT * FROM tournament_push_subs WHERE id=?').bind(String(a.id||'')).first();if(!row){if(a.op==='test')throw fail('Gerät erneut aktivieren',404);return {ok:true};}if(row.secret_hash!==await hash(String(a.secret||'')))throw fail('Gerätezugang ungültig',403);
  if(a.op==='test'){
   if(row.run!==run(s)||row.expires<=now)throw fail('Benachrichtigungen für diesen Wettkampf erneut aktivieren',409);
   const id=row.id+'|self-test|'+Math.floor(now/30000),claimed=await db.prepare("INSERT OR IGNORE INTO tournament_push_delivery(id,sub,event,state,attempts,next) VALUES(?,?,?,'sent',1,?)").bind(id,row.id,'self-test',now).run();if(!claimed.meta.changes)throw fail('In 30 Sekunden erneut testen',429);
   const result=await sendPush(pushConfig(env),JSON.parse(row.subscription),{title:'SDM · Push-Test',body:'Gerätebenachrichtigung aktiv. Echte Aufrufe enthalten Gruppe, Tatami und Direktlink.',tag:'sdm-self-test',url:'index.html#notify'},fetcher);
   if(result.gone){await db.prepare('DELETE FROM tournament_push_subs WHERE id=?').bind(row.id).run();throw fail('Browserzuordnung abgelaufen. Erneut aktivieren.',410);}if(!result.ok)throw fail('Push-Dienst derzeit nicht erreichbar. Erneut versuchen.',503);return {accepted:true};
  }
  await db.prepare('DELETE FROM tournament_push_subs WHERE id=?').bind(a.id).run();await db.prepare('DELETE FROM tournament_push_delivery WHERE sub=?').bind(a.id).run();return {ok:true};
 }
 if(expires<now)throw fail('Wettkampf ist beendet');
 if(!s.event.published)throw fail('Öffentliche Meldelisten noch nicht freigegeben',403);
 const subscription=await validateSubscription(a.subscription),endpointHash=await hash(subscription.endpoint),old=await db.prepare('SELECT id,secret_hash FROM tournament_push_subs WHERE endpoint_hash=?').bind(endpointHash).first();
 if(old&&old.secret_hash!==await hash(String(a.secret||'')))throw fail('Gerätezuordnung zurücksetzen und erneut aktivieren',409);
 const filters={};for(const[k,allowed]of Object.entries({groups:s.groups.filter(g=>g.active).map(g=>g.code),dojos:s.dojos.map(d=>d.name),athletes:s.people.map(p=>p.id)})){
  const input=a.filters?.[k]||[];if(!Array.isArray(input)||input.length>100||input.some(v=>typeof v!=='string'||!allowed.includes(v)))throw fail('Abo-Auswahl ungültig');filters[k]=[...new Set(input)];
 }
 if(!Object.values(filters).some(xs=>xs.length))throw fail('Mindestens ein Dojo, eine Gruppe oder einen Athleten auswählen');
 const ip=await hash(request.headers.get('cf-connecting-ip')||'unknown'),n=await db.prepare('SELECT COUNT(*) AS n FROM tournament_push_subs WHERE ip=? AND created>?').bind(ip,now-3600000).first();if(!old&&n.n>=20)throw fail('Zu viele neue Geräte. Später erneut versuchen.',429);
 const id=old?.id||crypto.randomUUID(),secret=old?a.secret:crypto.randomUUID()+crypto.randomUUID();
 await db.prepare('INSERT INTO tournament_push_subs(id,endpoint_hash,secret_hash,subscription,filters,run,expires,ip,created) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(endpoint_hash) DO UPDATE SET filters=excluded.filters,subscription=excluded.subscription,run=excluded.run,expires=excluded.expires').bind(id,endpointHash,await hash(secret),JSON.stringify(subscription),JSON.stringify(filters),run(s),expires,ip,now).run();
 // Do not replay old calls after someone subscribes or changes their selection.
 for(const e of callEvents(s))await db.prepare('INSERT INTO tournament_push_delivery(id,sub,event,state,attempts,next) VALUES(?,?,?,\'sent\',0,?) ON CONFLICT(id) DO UPDATE SET state=\'sent\'').bind(id+'|'+e.id,id,e.id,now).run();
 return {ok:true,id,secret,expires};
}
export async function flushPush(env,s,{fetcher=fetch,limit=30}={}){
 const config=pushConfig(env);if(!config)return {available:false};const db=env.DB;await pushTables(db);const now=Date.now();
 const current=new Set(callEvents(s).map(e=>e.id)),subs=(await db.prepare('SELECT * FROM tournament_push_subs WHERE expires>? AND run=?').bind(now,run(s)).all()).results,events=(await db.prepare('SELECT * FROM tournament_push_events WHERE expires>? AND run=? ORDER BY at').bind(now,run(s)).all()).results.filter(e=>current.has(e.id));
 let remaining=limit,sent=0,failed=0;const tasks=[];
 for(const sub of subs){const filters=JSON.parse(sub.filters);for(const row of events){if(remaining<=0)break;const event=JSON.parse(row.data);if(!matches(filters,event))continue;
  const id=sub.id+'|'+row.id;await db.prepare("INSERT OR IGNORE INTO tournament_push_delivery(id,sub,event,state,attempts,next) VALUES(?,?,?,'pending',0,?)").bind(id,sub.id,row.id,now).run();
  const lease=crypto.randomUUID(),claim=await db.prepare("UPDATE tournament_push_delivery SET state='sending',lease=?,next=?,attempts=attempts+1 WHERE id=? AND next<=? AND (state='pending' OR state='sending')").bind(lease,now+15000,id,now).run();if(!claim.meta.changes)continue;remaining--;
  tasks.push(async()=>{try{const payload={title:event.title,body:event.body,tag:event.id,url:event.url,tatami:event.tatami,group:event.group},r=await sendPush(config,JSON.parse(sub.subscription),payload,fetcher);
   if(r.gone){await db.prepare('DELETE FROM tournament_push_subs WHERE id=?').bind(sub.id).run();await db.prepare("UPDATE tournament_push_delivery SET state='gone' WHERE id=? AND lease=?").bind(id,lease).run();}
   else if(r.ok){sent++;await db.prepare("UPDATE tournament_push_delivery SET state='sent',error=NULL WHERE id=? AND lease=?").bind(id,lease).run();}
   else{failed++;await db.prepare("UPDATE tournament_push_delivery SET state='pending',next=?,error=? WHERE id=? AND lease=?").bind(Date.now()+r.retryAfter*1000,r.status,id,lease).run();}
  }catch{failed++;await db.prepare("UPDATE tournament_push_delivery SET state='pending',next=?,error=0 WHERE id=? AND lease=?").bind(Date.now()+10000,id,lease).run();}});
 }}
 // Bound provider concurrency and request duration. A failed provider is retried
 // by any active table/leadership browser, without delaying score submission.
 for(let i=0;i<tasks.length;i+=10)await Promise.all(tasks.slice(i,i+10).map(f=>f()));
 await db.prepare('DELETE FROM tournament_push_subs WHERE expires<? OR run<>?').bind(now,run(s)).run();
 await db.prepare('DELETE FROM tournament_push_events WHERE expires<?').bind(now-3600000).run();
 await db.prepare('DELETE FROM tournament_push_delivery WHERE next<?').bind(now-86400000).run();return {available:true,sent,failed};
}
