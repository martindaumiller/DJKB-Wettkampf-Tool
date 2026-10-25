import {fieldPresentation} from './field-presentation.mjs';
import {networkState} from './network.mjs';
import * as C from './core.mjs';
import {callerState} from './caller-state.mjs';
import {dispatchState,releaseStatus} from './dispatch.mjs';
const fail=(m,status=400)=>Object.assign(Error(m),{status});
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
const prepared=new WeakSet();
async function tables(db){if(prepared.has(db))return;for(const sql of [
 'CREATE TABLE IF NOT EXISTS tournament_screens (key TEXT PRIMARY KEY, scope TEXT NOT NULL, run TEXT NOT NULL, tatami INTEGER NOT NULL, actor TEXT NOT NULL, expires INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS tournament_cameras (key TEXT PRIMARY KEY, actor TEXT NOT NULL, client TEXT NOT NULL, expires INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS tournament_camera_peers (id TEXT PRIMARY KEY, camera TEXT NOT NULL, offer TEXT NOT NULL, answer TEXT, seen INTEGER NOT NULL)',
 'CREATE INDEX IF NOT EXISTS camera_peers_camera ON tournament_camera_peers(camera)'
])await db.prepare(sql).run();prepared.add(db);}
const run=s=>s.runId||'initial';
function desk(u,tatami){if(!['admin','table','stream'].includes(u?.role)||u.role==='table'&&u.tatami!==tatami)throw fail('Nur zugehöriger Tisch oder Wettkampfleitung',403);if(![1,2,3,4,5].includes(tatami))throw fail('Tatami 1 bis 5 wählen');}
export function iceServers(env){let extra=[];try{extra=JSON.parse(env.SDM_RTC_ICE_SERVERS||'[]');}catch{}return [{urls:'stun:stun.l.google.com:19302'},...extra.filter(x=>x&&typeof x.urls!=='undefined')];}
export async function createScreen(db,s,u,a,scope='live'){
 const t=u?.role==='table'?u.tatami:Number(a.tatami);desk(u,t);await tables(db);const raw=hex(crypto.getRandomValues(new Uint8Array(32))),key=await hash(raw),expires=a.production===true&&u.role==='admin'?Math.max(Date.now()+43200000,Math.min(Date.now()+14*86400000,Date.parse(s.event.date+'T23:59:59+02:00')+86400000)):Date.now()+43200000;
 await db.prepare('DELETE FROM tournament_screens WHERE expires<?').bind(Date.now()).run();
 if(a.replace===true)await db.prepare('DELETE FROM tournament_screens WHERE scope=? AND run=? AND actor=? AND tatami=?').bind(scope,run(s),u.id,t).run();
 const n=await db.prepare('SELECT COUNT(*) AS n FROM tournament_screens WHERE scope=? AND actor=?').bind(scope,u.id).first();if(n.n>=30)throw fail('Zu viele aktive Zuschauerlinks; bestehende Links weiterverwenden');
 await db.prepare('INSERT INTO tournament_screens(key,scope,run,tatami,actor,expires) VALUES(?,?,?,?,?,?)').bind(key,scope,run(s),t,u.id,expires).run();return {screen:raw,tatami:t,expires};
}
async function screen(db,s,token,scope){if(!/^[a-f0-9]{64}$/.test(token||''))throw fail('Zuschauerlink ungültig',404);await tables(db);const row=await db.prepare('SELECT * FROM tournament_screens WHERE key=? AND scope=? AND run=? AND expires>?').bind(await hash(token),scope,run(s),Date.now()).first();if(!row)throw fail('Zuschauerlink abgelaufen oder Wettkampf neu begonnen. Neuen Link am Tisch öffnen.',404);return row;}
const cameraKey=(s,scope,t)=>scope+':'+run(s)+':'+t;
export function publicGroupLabel(g){const age=g.maxAge>=99?'ab '+g.minAge+' Jahre':g.minAge===g.maxAge?g.minAge+' Jahre':g.minAge+'–'+g.maxAge+' Jahre';return [['Kata Einzel','Kumite Einzel','Kata-Team','Kumite-Team'][g.type],age,{w:'weiblich',m:'männlich',x:'Mixed'}[g.gender]].filter(Boolean).join(' · ');}
function publicBout(s,b){if(!b)return null;const g=s.groups.find(g=>g.code===b.group),f=b.teamFights?.find(f=>f.status==='live'),wins=b.teamSummary?{aka:b.teamSummary.counts.aka.wins,shiro:b.teamSummary.counts.shiro.wins}:Object.fromEntries(['aka','shiro'].map(side=>[side,(b.teamFights||[]).filter(f=>f.status==='done'&&f.winner===side).length]));return {id:b.id,group:g.code,description:g.description,label:publicGroupLabel(g),suspended:!!b.suspended,kind:C.mode(g,b),status:b.status,ended:b.ended,pool:b.pool||null,final:!!b.final,bronze:!!b.bronze,released:C.phasePermitted(s,b)&&releaseStatus(s,C.playlist(s).find(q=>q.id===C.jobId(g,b))||{id:C.jobId(g,b),group:g.code,tatami:C.tatami(s,b)}),aka:C.ent(s,b.aka)?{name:C.ent(s,b.aka).name,dojo:C.ent(s,b.aka).dojo}:null,shiro:C.ent(s,b.shiro)?{name:C.ent(s,b.shiro).name,dojo:C.ent(s,b.shiro).dojo}:null,score:g.type===3&&!f?{aka:wins.aka*2,shiro:wins.shiro*2}:f?.score||b.score,scoreUnit:g.type===3&&!f?'wins':'points',teamWins:g.type===3?wins:null,penalties:f?.penalties||b.penalties,timer:b.timer,judges:b.judges,judgeCount:b.judgeCount,kataPreview:b.status==='live'&&b.kataPreview?.version===b.version?b.kataPreview:null,version:b.version,kata:b.kata,reason:b.reason,winner:b.winner===b.aka?'aka':b.winner===b.shiro?'shiro':null,teamFight:f?{index:f.index,aka:f.akaName,shiro:f.shiroName}:null,teamSummary:b.teamSummary||null,kihonScoring:b.kihonScoring||'techniques',wazaari:Object.fromEntries(['aka','shiro'].map(side=>[side,(b.exchanges||[]).filter(x=>x.winner===side).length])),saishiai:!!b.saishiai,attackStance:b.attackStance||'',technicalRepeats:b.techHistory?.length||0,kataRepeats:b.kataRepeats?.length||0,exchanges:b.exchanges?.length||0};}
export async function screenState(db,s,token,scope='live',env={}){
 const row=await screen(db,s,token,scope),bs=s.bouts.filter(b=>C.tatami(s,b)===row.tatami),live=bs.find(b=>b.status==='live'),next=C.readyOnTatami(s,row.tatami),last=bs.filter(b=>b.status==='done'&&b.ended).sort((a,b)=>b.ended.localeCompare(a.ended))[0],cam=await db.prepare('SELECT expires FROM tournament_cameras WHERE key=? AND expires>?').bind(cameraKey(s,scope,row.tatami),Date.now()).first();

 const announcement=dispatchState(s).filter(q=>q.tatami===row.tatami&&q.released&&q.status!=='done'&&!q.held).map(q=>({...q,at:s.releases?.[q.id]?.at,description:s.groups.find(g=>g.code===q.group)?.description})).filter(q=>q.at).sort((a,b)=>b.at.localeCompare(a.at))[0]||null;
 const field=fieldPresentation(s,row.tatami),caller=callerState(s,row.tatami),roster=caller.roster,calling=field?.phase!=='completed'&&!live&&roster?.released&&!roster.started?{...roster,label:publicGroupLabel(s.groups.find(g=>g.code===roster.group))}:null;
 return {field,medicalPause:!!s.tatamis.find(t=>t.id===row.tatami)?.medicalPause,production:s.tatamis.find(t=>t.id===row.tatami)?.production||{},network:networkState(s,{role:'table'}),calling,announcement,animations:s.event.scoreAnimations!==false,callAnimationSeconds:s.event.callAnimationSeconds??8,broadcast:s.tatamis.find(t=>t.id===row.tatami)?.broadcast||{},caller,orientation:s.tatamis.find(t=>t.id===row.tatami)?.orientation||0,tatami:row.tatami,event:{name:s.event.name,date:s.event.date},current:calling?null:publicBout(s,live||last||next[0]),next:(calling?[]:next).filter(b=>b.id!==(live||last||next[0])?.id).slice(0,1).map(b=>publicBout(s,b)),paused:!!s.tatamis.find(t=>t.id===row.tatami)?.paused,closed:!!s.tatamis.find(t=>t.id===row.tatami)?.deskClosed,camera:!!cam&&networkState(s).video,serverTime:Date.now(),iceServers:iceServers(env)};
}
function description(value,type,feed){if(feed!==undefined&&!['clean','program'].includes(feed))throw fail('Ungültige Videoquelle');if(value?.type!==type||typeof value.sdp!=='string'||value.sdp.length>60000||!value.sdp.startsWith('v=0'))throw fail('Ungültige Video-Verbindungsdaten');return JSON.stringify({type,sdp:value.sdp,...(type==='offer'?{feed:feed||'program'}:{})});}
export async function cameraAPI(db,s,u,a,scope='live',env={}){
 if(!networkState(s).video&&!['stop','leave'].includes(a.op))throw fail('Video im Notfallbetrieb pausiert',503);
 await tables(db);const viewer=['offer','receive','leave'].includes(a.op),t=viewer?(await screen(db,s,a.screen,scope)).tatami:u?.role==='table'?u.tatami:Number(a.tatami);if(!viewer)desk(u,t);const key=cameraKey(s,scope,t),now=Date.now();
 await db.prepare('DELETE FROM tournament_camera_peers WHERE seen<?').bind(now-30000).run();
 const cam=await db.prepare('SELECT * FROM tournament_cameras WHERE key=?').bind(key).first();
 if(viewer){if(!cam||cam.expires<=now)throw fail('Kamera am Tisch ist ausgeschaltet',409);if(!/^[a-f0-9-]{36}$/.test(a.peer||''))throw fail('Videoverbindung ungültig');const peer=await db.prepare('SELECT * FROM tournament_camera_peers WHERE id=? AND camera=?').bind(a.peer,key).first();
  if(a.op==='leave'){if(peer)await db.prepare('DELETE FROM tournament_camera_peers WHERE id=? AND camera=?').bind(a.peer,key).run();return {ok:true};}
  if(a.op==='offer'){const n=await db.prepare('SELECT COUNT(*) AS n FROM tournament_camera_peers WHERE camera=?').bind(key).first();if(!peer&&n.n>=6)throw fail('Livebild ist für sechs Geräte gleichzeitig verfügbar. Die Anzeigetafel bleibt verfügbar.',429);await db.prepare('INSERT INTO tournament_camera_peers(id,camera,offer,seen) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET offer=excluded.offer,answer=NULL,seen=excluded.seen WHERE camera=excluded.camera').bind(a.peer,key,description(a.offer,'offer',a.feed),now).run();return {ok:true,iceServers:iceServers(env)};}
  if(!peer)throw fail('Videoverbindung abgelaufen',404);await db.prepare('UPDATE tournament_camera_peers SET seen=? WHERE id=? AND camera=?').bind(now,a.peer,key).run();return {answer:peer.answer?JSON.parse(peer.answer):null};
 }
 if(!/^[a-f0-9-]{36}$/.test(a.client||''))throw fail('Kameragerät ungültig');
 if(a.op==='start'){
  if(cam&&cam.expires>now&&(cam.client!==a.client||cam.actor!==u.id)&&a.takeover!==true)throw fail('Eine Kamera sendet bereits auf dieser Tatami. Übernahme bestätigen.',409);
  if(!cam||cam.client!==a.client)await db.prepare('DELETE FROM tournament_camera_peers WHERE camera=?').bind(key).run();
  const r=await db.prepare('INSERT INTO tournament_cameras(key,actor,client,expires) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET actor=excluded.actor,client=excluded.client,expires=excluded.expires WHERE expires<? OR (client=? AND actor=?) OR ?=1').bind(key,u.id,a.client,now+20000,now,a.client,u.id,a.takeover===true?1:0).run();if(!r.meta.changes)throw fail('Andere Kamera wurde inzwischen gestartet',409);return {ok:true,iceServers:iceServers(env)};
 }
 if(!cam||cam.actor!==u.id||cam.client!==a.client||cam.expires<=now)throw fail('Kamera ist ausgeschaltet oder an einem anderen Gerät gestartet',409);
 if(a.op==='stop'){await db.prepare('DELETE FROM tournament_cameras WHERE key=? AND client=?').bind(key,a.client).run();await db.prepare('DELETE FROM tournament_camera_peers WHERE camera=?').bind(key).run();return {ok:true};}
 await db.prepare('UPDATE tournament_cameras SET expires=? WHERE key=? AND client=?').bind(now+20000,key,a.client).run();
 if(a.op==='answer'){await db.prepare('UPDATE tournament_camera_peers SET answer=? WHERE id=? AND camera=?').bind(description(a.answer,'answer'),a.peer,key).run();return {ok:true};}
 if(a.op!=='poll')throw fail('Unbekannte Kameraaktion');const peers=(await db.prepare('SELECT id,offer,answer FROM tournament_camera_peers WHERE camera=?').bind(key).all()).results;return {peers:peers.map(p=>{const offer=JSON.parse(p.offer);return {id:p.id,offer:{type:offer.type,sdp:offer.sdp},feed:offer.feed||'program',answered:!!p.answer};}),iceServers:iceServers(env)};
}
