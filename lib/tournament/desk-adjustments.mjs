import * as C from './core.mjs';
import {drawConstraints} from './seeding.mjs';
import {mark} from './stream.mjs';
import {assertDeskWrite,correctionImpact} from './desk-control.mjs';
function freshCall(b){const logs=(b?.actions||[]).filter(x=>!x.undone);return b?.status==='live'&&logs.length===1&&logs[0].action==='start'&&!b.timer.since&&!b.kata&&!b.exchanges?.length&&!b.teamFights?.length&&['aka','shiro'].every(side=>!b.score[side]&&!b.penalties[side]?.length);}
function validate(s,b,p){
 if(!b||!freshCall(b)&&(b.started||b.status!=='ready'))throw Error('Nur noch nicht begonnene, bereite Begegnungen ändern. Laufende Begegnung zuerst durch Leitung korrigieren.');
 if(p.op==='swap'){
  const x=s.bouts.find(x=>x.id===p.other);if(!x||x.id===b.id||x.group!==b.group||x.started||x.status!=='ready'||b.sources?.length||x.sources?.length||!['aka','shiro'].includes(p.side)||!['aka','shiro'].includes(p.otherSide)||!b[p.side]||!x[p.otherSide])throw Error('Zwei belegte Startplätze in unbegonnenen Begegnungen derselben Gruppe wählen');
  if(x.version!==p.otherVersion)throw Error('Andere Begegnung wurde inzwischen geändert');
  if([...correctionImpact(s,b),...correctionImpact(s,x)].some(y=>y.started&&!(y.id===b.id&&freshCall(b))))throw Error('Betroffene Folgebegegnung wurde bereits begonnen');return x;
 }
 if(p.op==='move'){
  if(![1,2,3,4,5].includes(p.tatami)||p.tatami===C.tatami(s,b))throw Error('Andere Tatami 1–5 wählen');
  const job=C.playlist(s).find(q=>q.id===C.jobId(s.groups.find(g=>g.code===b.group),b));
  if(!job||s.bouts.some(x=>C.jobId(s.groups.find(g=>g.code===x.group),x)===job.id&&x.started&&!(x.id===b.id&&freshCall(b))))throw Error('Nur einen vollständig unbegonnenen Pool verlegen');return job;
 }
 if(p.op!=='kiken'||!['aka','shiro'].includes(p.side)||!b[p.side])throw Error('Zulässige Änderung wählen');
}
export function proposeAdjustment(s,u,b,a){
 assertDeskWrite(s,u,b);if(!a.message?.trim())throw Error('Fehlenden Starter und Änderung begründen');const p={op:a.op,side:a.side,other:a.other,otherSide:a.otherSide,otherVersion:a.otherVersion,tatami:Number(a.tatami)};const other=validate(s,b,p);
 const label=id=>C.ent(s,id)?.name||'–';
 const description=p.op==='swap'?label(b[p.side])+' ↔ '+label(other[p.otherSide])+' (Startplätze tauschen)':p.op==='move'?'Pool / Finalrunde von Tatami '+C.tatami(s,b)+' nach Tatami '+p.tatami:label(b[p.side])+' fehlt nach drei Aufrufen: Kiken, '+label(b[p.side==='aka'?'shiro':'aka'])+' kommt weiter';
 const r={id:C.uid(),category:'desk-adjustment',targetType:'bout',target:b.id,dojo:'Tisch '+C.tatami(s,b),tatami:C.tatami(s,b),by:u.name,status:'submitted',at:new Date().toISOString(),message:a.message.trim(),description,change:p,boutVersion:b.version,drawAt:s.groups.find(g=>g.code===b.group).draw?.at,run:s.runId||null,queueRevision:s.queueRevision||0};s.requests.push(r);return {request:r.id};
}
export function applyAdjustment(s,u,r){
 const b=s.bouts.find(b=>b.id===r.target),g=s.groups.find(g=>g.code===b?.group);
 if(!b||b.version!==r.boutVersion||g.draw?.at!==r.drawAt||(s.runId||null)!==r.run||C.tatami(s,b)!==r.tatami)throw Error('Starterfeld wurde seit dem Antrag geändert. Bitte neu anfordern.');
 const p=r.change,x=validate(s,b,p);assertDeskWrite(s,{role:'table',tatami:r.tatami},b);
 s.corrections??=[];s.corrections.push({id:C.uid(),at:new Date().toISOString(),by:u.name,reason:r.message,request:r.id,group:g.code,bouts:structuredClone(p.op==='swap'?[b,x]:[b])});
 if(freshCall(b)){b.status='ready';b.started=null;delete b.startedTatami;b.timer={remaining:(b.final?g.finalDuration:g.duration)*1000,since:null};b.version++;}
 if(p.op==='swap'){
  assertDeskWrite(s,{role:'table',tatami:C.tatami(s,x)},x);[b[p.side],x[p.otherSide]]=[x[p.otherSide],b[p.side]];b.version++;x.version++;
  for(const y of [b,x]){delete y.akaOrder;delete y.shiroOrder;}
  // Keep the authoritative slot list in sync, so printed and backup draws agree.
  const first=s.corrections.at(-1).bouts[0][p.side],second=s.corrections.at(-1).bouts[1][p.otherSide];if(g.draw?.slots){g.draw.slots=g.draw.slots.map(id=>id===first?second:id===second?first:id);g.draw.constraints=drawConstraints(s.entries.filter(e=>e.active&&e.group===g.code).map(e=>C.ent(s,e.id)),g.draw.slots);}
 }else if(p.op==='move'){
  if((s.queueRevision||0)!==r.queueRevision)throw Error('Tatami-Planung wurde geändert. Neuen Antrag stellen');C.moveQueue(s,{job:x.id,tatami:p.tatami});
 }else{b.started=new Date().toISOString();b.startedTatami=C.tatami(s,b);C.finish(s,b,p.side==='aka'?'shiro':'aka','Kiken');b.version++;}
 mark(s,u,b,p.op==='kiken'?'finish':'correction','Genehmigte Änderung: '+r.description);
 r.status='applied';r.decision='Durch Leitung freigegeben und übernommen: '+r.description;
}
