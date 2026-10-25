import * as C from './core.mjs';
import {configureDraw} from './pool-draw.mjs';
import {releaseStatus} from './dispatch.mjs';
const fail=(m,status=400)=>Object.assign(Error(m),{status});
const period=p=>p<3?0:1;

export function planningState(s){
 const jobs=C.playlist(s),ready=s.bouts.filter(b=>b.status==='ready');
 return s.tatamis.map(t=>{
  const live=s.bouts.find(b=>b.status==='live'&&C.tatami(s,b)===t.id);
  const own=jobs.filter(q=>q.tatami===t.id&&q.status!=='done'&&!q.held);
  const candidates=jobs.filter(q=>q.status!=='done'&&!q.held&&q.drawn&&period(q.phase)===period(s.event.stage)).map(q=>{
   const bs=ready.filter(b=>C.jobId(s.groups.find(g=>g.code===b.group),b)===q.id);
   const available=bs.find(b=>!C.collision(s,b)),blocked=bs.length?C.collision(s,bs[0]):'Vorrunde oder Qualifikation noch offen';
   const occupied=s.bouts.some(b=>b.status==='live'&&C.jobId(s.groups.find(g=>g.code===b.group),b)===q.id);
   return {...q,available:!!available&&!occupied,reason:occupied?'Dieser Pool läuft noch':available?(q.phase>s.event.stage?'Starter verfügbar · vorzeitig freigeben':'Starter verfügbar'):blocked,released:releaseStatus(s,q)};
  }).sort((a,b)=>Number(b.available)-Number(a.available)||Number(b.tatami===t.id)-Number(a.tatami===t.id));
  return {tatami:t.id,paused:!!t.paused,closed:!!t.deskClosed,live:live?{id:live.id,group:live.group}:null,next:own[0]||null,candidates:candidates.slice(0,8)};
 });
}

// Planning edits run on a copy: an invalid final route cannot partially redraw a pool.
export function changePlanning(s,u,a){
 if(u?.role!=='admin')throw fail('Nur Wettkampfleitung',403);
 if(a.expectedQueueRevision!==(s.queueRevision||0))throw fail('Planung wurde inzwischen geändert. Neu laden und erneut prüfen.',409);
 const next=structuredClone(s),g=next.groups.find(g=>g.code===a.group);
 if(!g?.active)throw fail('Aktive Gruppe wählen');
 if(!a.reason?.trim())throw fail('Änderung kurz begründen');
 const begun=next.bouts.some(b=>b.group===g.code&&b.started),wasDrawn=!!g.draw;
 const timing=a.finalTiming??g.finalTiming??'block';
 if(!['block','immediate'].includes(timing))throw fail('Finale im Finalblock oder direkt anschließend wählen');
 if(timing!==(g.finalTiming||'block')&&next.bouts.some(b=>b.group===g.code&&b.final&&b.started))throw fail('Finalrunde bereits begonnen; nur ihre noch offenen Begegnungen umplanen');
 const settings=a.settings;
 let redrawn=false;
 if(settings){
  if(begun&&Number(settings.pools)!==(g.pools||1))throw fail('Poolzahl dieser Gruppe ist nach dem ersten Start verbindlich. Bestehende Pools lassen sich weiterhin auf andere Tatamis verteilen.');
  if(begun&&([0,2].includes(g.type)&&Number(settings.finalists)!==g.finalists||settings.kataMode&&settings.kataMode!==g.kataMode))throw fail('Qualifikation nach dem ersten Start verbindlich; Anzahl Finalplätze und Wertungssystem beibehalten');
  const structural=Number(settings.pools)!==(g.pools||1)||[0,2].includes(g.type)&&(Number(settings.finalists)!==g.finalists||settings.kataMode!==g.kataMode);
  if(!begun&&structural){if(wasDrawn&&a.confirmRedraw!==true)throw fail('Neue Poolzahl / Auslosung ausdrücklich bestätigen');configureDraw(next,g,settings);if(wasDrawn){C.draw(next,g.code,C.uid());redrawn=true;}}
 }
 const oldJobs=C.playlist(next),oldPhase=new Map(next.bouts.map(b=>[b.id,C.phase(next.groups.find(g=>g.code===b.group),b)]));
 for(const b of next.bouts.filter(b=>b.started)){b.startedTatami??=C.tatami(next,b);b.startedPhase??=oldPhase.get(b.id);}
 g.finalTiming=timing;
 // Preserve the queue for other groups, and migrate this group's final job into
 // its preliminary phase. A changed job needs a new release on its new mat.
 const other=oldJobs.filter(q=>q.group!==g.code),own=C.playlist({...next,queue:other}).filter(q=>q.group===g.code),groupOrder=Math.min(...oldJobs.filter(q=>q.group===g.code).map(q=>q.order));
 const routes=Array.isArray(a.poolTatamis)?a.poolTatamis:settings?.poolTatamis||g.poolTatamis;
 const finalTatami=Number(a.finalTatami||settings?.tatami||g.tatami);
 if(![1,2,3,4,5].includes(finalTatami)||!Array.isArray(routes)||routes.length!==(g.pools||1)||routes.some(t=>![1,2,3,4,5].includes(Number(t))))throw fail('Für jeden Pool und das Finale eine Tatami wählen');
 g.tatami=finalTatami;g.poolTatamis=routes.map(Number);g.queueConfigured=true;
 for(const q of own){const previous=oldJobs.find(x=>x.id===q.id);q.tatami=q.pool?Number(routes[q.pool-1]):finalTatami;q.order=previous?.order??groupOrder+.9;}
 // Keep unrelated positions. Insert the final immediately after all pools of
 // this group in its phase, before the next group on the final tatami.
 let all=[...other,...own].sort((a,b)=>a.phase-b.phase||(a.order??oldJobs.findIndex(x=>x.id===a.id))-(b.order??oldJobs.findIndex(x=>x.id===b.id)));
 if(timing==='immediate')for(const f of own.filter(q=>!q.pool)){
  all=all.filter(q=>q.id!==f.id);let at=all.findLastIndex(q=>q.group===g.code&&q.phase===f.phase);if(at<0)at=all.findLastIndex(q=>q.tatami===f.tatami&&q.phase===f.phase);all.splice(at+1,0,f);
 }
 next.queue=all.map(({id,group,phase,pool,tatami})=>({id,group,phase,pool,tatami}));
 for(const b of next.bouts.filter(b=>b.group===g.code&&!b.started&&b.status!=='done'))b.version++;
 next.queueRevision=(s.queueRevision||0)+1;
 next.planChanges??=[];next.planChanges.push({at:new Date().toISOString(),by:u.name,group:g.code,reason:a.reason,finalTiming:timing,poolTatamis:g.poolTatamis,finalTatami});next.planChanges=next.planChanges.slice(-100);
 Object.assign(s,next);return {group:g.code,redrawn};
}

// Assignment is a planning step, never a new draw or a release to the table.
export function assignFreeTatami(s,u,a){
 if(u?.role!=='admin')throw fail('Nur Wettkampfleitung',403);
 if(a.expectedQueueRevision!==(s.queueRevision||0))throw fail('Planung wurde inzwischen geändert. Neu laden und erneut prüfen.',409);
 const jobs=C.playlist(s),q=jobs.find(q=>q.id===a.job);
 if(!q?.drawn||q.held||q.status==='done')throw fail('Ausgelosten, offenen Pool wählen');
 if(q.started)throw fail('Begonnenen Pool gezielt über „Tatami ändern“ umplanen');
 if(s.bouts.some(b=>b.status==='live'&&C.jobId(s.groups.find(g=>g.code===b.group),b)===q.id))throw fail('Dieser Pool läuft bereits');
 if(!s.bouts.some(b=>b.status==='ready'&&C.jobId(s.groups.find(g=>g.code===b.group),b)===q.id&&!C.collision(s,b)))throw fail('Qualifikation oder Ruhezeit noch offen; zuerst Starterverfügbarkeit prüfen');
 const free=s.tatamis.filter(t=>!t.paused&&!t.deskClosed&&!s.bouts.some(b=>b.status==='live'&&C.tatami(s,b)===t.id)&&!jobs.some(j=>j.id!==q.id&&j.tatami===t.id&&j.status!=='done'&&!j.held&&(j.started||releaseStatus(s,j))));
 const requested=Number(a.tatami||0),candidates=requested?free.filter(t=>t.id===requested):free;
 candidates.sort((a,b)=>jobs.filter(j=>j.tatami===a.id&&j.status!=='done'&&!j.held).length-jobs.filter(j=>j.tatami===b.id&&j.status!=='done'&&!j.held).length||a.id-b.id);
 const t=candidates[0];if(!t)throw fail('Keine freie Tatami verfügbar. Laufende oder bereits freigegebene Pools zuerst abschließen.',409);
 const before=jobs.find(j=>j.id!==q.id&&j.phase===q.phase&&j.tatami===t.id&&j.status!=='done')?.id||null;
 C.moveQueue(s,{job:q.id,tatami:t.id,before});
 // A reassignment always needs a conscious call and release, even on the same mat.
 if(s.releases)delete s.releases[q.id];
 return {job:q.id,tatami:t.id};
}

export function deferJob(s,u,a){
 if(u?.role!=='admin')throw fail('Nur Wettkampfleitung',403);
 const q=C.playlist(s).find(q=>q.id===a.job);
 if(!q||q.status==='done')throw fail('Offenen Pool wählen');
 if(s.bouts.some(b=>b.status==='live'&&C.jobId(s.groups.find(g=>g.code===b.group),b)===q.id))throw fail('Laufende Begegnung zuerst abschließen');
 s.deferredJobs??={};if(a.held===false)delete s.deferredJobs[q.id];else{if(!a.reason?.trim())throw fail('Unterbrechung begründen');s.deferredJobs[q.id]={at:new Date().toISOString(),by:u.name,reason:a.reason};}
 s.queueRevision=(s.queueRevision||0)+1;
}
