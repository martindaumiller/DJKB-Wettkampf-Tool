import * as C from './core.mjs';
import {assertDeskWrite} from './desk-control.mjs';
import {releaseJob} from './dispatch.mjs';
import {mark} from './stream.mjs';
const fail=(m,status=400)=>Object.assign(Error(m),{status});
// Only drafts that belonged to the immediately preceding state may survive a hold.
export function advanceFlowVersion(b){const preview=b.kataPreview;b.version++;if(preview?.version===b.version-1)preview.version=b.version;}
export function assertNoPendingFlow(s,u){if(u?.role==='table'&&s.requests.some(r=>r.category==='desk-flow'&&r.status==='submitted'&&r.tatami===u.tatami))throw fail('Freigabe der Leitung steht aus. Anfrage zuerst zurückziehen oder Entscheidung abwarten.',409);}
export function flowGranted(s,b){const t=s.tatamis.find(t=>t.id===C.tatami(s,b)),p=t?.boutPriority;return !!p&&p.bout===b.id&&p.version===b.version&&p.run===(s.runId||null);}
function stopped(b){b.timer={remaining:C.left(b),since:null};const f=b.teamFights?.find(f=>f.status==='live');if(f)f.timer=structuredClone(b.timer);}
export function proposeFlow(s,u,b,a){
 if(!['admin','table'].includes(u?.role))throw fail('Nur Tisch oder Wettkampfleitung',403);assertDeskWrite(s,u,b);
 const tatami=C.tatami(s,b),live=s.bouts.find(x=>C.tatami(s,x)===tatami&&x.status==='live'),target=s.bouts.find(x=>x.id===a.next),message=String(a.message||'').trim();
 if(a.op==='cancel'){const r=s.requests.find(r=>r.id===a.request&&r.target===b.id&&r.category==='desk-flow'&&r.tatami===tatami&&r.run===(s.runId||null)&&r.status==='submitted');if(!r)throw fail('Anfrage wurde bereits entschieden. Aktuellen Stand prüfen.',409);r.status='cancelled';r.decision='Vom Tisch zurückgezogen; Zeit bleibt angehalten';return {cancelled:r.id};}
 if(!message||message.length>500)throw fail('Grund der Unterbrechung oder Reihenfolge angeben');
 if(!['hold','restart','priority'].includes(a.op))throw fail('Unterbrechen, neu ansetzen oder vorziehen wählen');
 if(a.op==='priority'&&live||a.op!=='priority'&&live?.id!==b.id)throw fail('Aktuelle Begegnung wurde geändert. Bitte neu öffnen.',409);
 if(a.next&&(!target||target.id===live?.id||C.tatami(s,target)!==tatami||target.status!=='ready'))throw fail('Eine bereite Begegnung derselben Tatami wählen');
 if(a.op==='priority'&&!target)throw fail('Begegnung zum Vorziehen wählen');
 if(target)assertDeskWrite(s,u,target);
 // Yame is within the table's existing authority; cancellation/order only change on approval.
 if(live){stopped(live);advanceFlowVersion(live);mark(s,u,live,'correction','Unterbrechung zur Freigabe angefragt');}
 for(const r of s.requests.filter(r=>r.category==='desk-flow'&&r.tatami===tatami&&r.status==='submitted'))r.status='superseded';
 const request={id:C.uid(),category:'desk-flow',dojo:'Tisch '+tatami,tatami,target:b.id,targetType:'bout',status:'submitted',by:u.name,at:new Date().toISOString(),message,run:s.runId||null,
  change:{op:a.op,next:target?.id||null},boutVersion:b.version,nextVersion:target?.version,drawAt:s.groups.find(g=>g.code===b.group)?.draw?.at,nextDrawAt:target?s.groups.find(g=>g.code===target.group)?.draw?.at:null,
  description:(a.op==='hold'?'Unterbrechen, bisherigen Stand behalten':a.op==='restart'?'Abbrechen und neu ansetzen':'Begegnung vorziehen')+(target?' · danach '+target.group+': '+[target.shiro,target.aka].filter(Boolean).map(id=>C.ent(s,id)?.name).join(' / '):'')};
 s.requests.push(request);return {request:request.id};
}
export function applyFlow(s,u,r){
 if(u?.role!=='admin')throw fail('Freigabe nur durch Wettkampfleitung',403);
 const b=s.bouts.find(b=>b.id===r.target),next=r.change.next?s.bouts.find(b=>b.id===r.change.next):null,live=s.bouts.find(b=>C.tatami(s,b)===r.tatami&&b.status==='live');
 if(!b||b.version!==r.boutVersion||(s.runId||null)!==r.run||C.tatami(s,b)!==r.tatami||s.groups.find(g=>g.code===b.group)?.draw?.at!==r.drawAt)throw fail('Begegnung seit der Anfrage geändert. Erneut anfordern.',409);
 if(r.change.op==='priority'?!!live:live?.id!==b.id)throw fail('Aktuelle Begegnung seit der Anfrage geändert',409);
 if(next&&(next.version!==r.nextVersion||next.status!=='ready'||C.tatami(s,next)!==r.tatami||s.groups.find(g=>g.code===next.group)?.draw?.at!==r.nextDrawAt))throw fail('Gewünschte Begegnung wurde geändert. Erneut anfordern.',409);
 assertDeskWrite(s,{role:'table',tatami:r.tatami},b);if(next)assertDeskWrite(s,{role:'table',tatami:r.tatami},next);
 if(next&&C.collision({...s,bouts:s.bouts.filter(x=>x.id!==live?.id)},next))throw fail('Starter der gewünschten Begegnung ist beschäftigt oder benötigt Ruhezeit');
 const nextGroup=next?s.groups.find(g=>g.code===next.group):null,nextJob=next?C.playlist(s).find(q=>q.id===C.jobId(nextGroup,next)):null;if(next&&(!nextJob||nextJob.held))throw fail('Gewünschter Pool ist zurückgestellt');
 const t=s.tatamis.find(t=>t.id===r.tatami);if(t.paused||t.deskClosed)throw fail('Tatami zuerst wieder freigeben');
 if(live){s.corrections??=[];s.corrections.push({id:C.uid(),at:new Date().toISOString(),by:u.name,reason:r.message,request:r.id,group:b.group,bouts:[structuredClone(b)]});stopped(b);
  if(r.change.op==='restart'){const fresh=C.newBout(b.group,b.kind);for(const k of ['score','penalties','judges','kata','winner','loser','reason','ended','actions'])b[k]=structuredClone(fresh[k]);for(const k of ['teamFights','fights','teamSummary','decider','saishiai','sections','exchanges','techHistory','techPlan','kataPreview','kataRepeats','repeatedTechniques'])delete b[k];b.timer={remaining:(b.final?s.groups.find(g=>g.code===b.group).finalDuration:s.groups.find(g=>g.code===b.group).duration)*1000,since:null};b.restartPending=true;}
  b.suspended=true;b.status='ready';b.suspendedAt=new Date().toISOString();advanceFlowVersion(b);mark(s,u,b,'correction','Unterbrechung freigegeben: '+r.description);
 }
 if(next){releaseJob(s,u,{job:nextJob.id,tatami:nextJob.tatami,drawAt:nextGroup.draw.at,early:true});t.boutPriority={bout:next.id,version:next.version,run:s.runId||null,by:u.name,at:new Date().toISOString(),request:r.id};}
 else if(live){const g=s.groups.find(g=>g.code===b.group),q=C.playlist(s).find(q=>q.id===C.jobId(g,b));releaseJob(s,u,{job:q.id,tatami:q.tatami,drawAt:g.draw.at,early:true});t.boutPriority={bout:b.id,version:b.version,run:s.runId||null,by:u.name,at:new Date().toISOString(),request:r.id};}
 else delete t.boutPriority;
 r.status='applied';r.decision='Durch Leitung freigegeben: '+r.description;
 return {next:next?.id||null,suspended:live?.id||null};
}


