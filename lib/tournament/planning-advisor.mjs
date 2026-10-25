import * as C from './core.mjs';
import {forecast} from './forecast.mjs';
import {currentTournamentCopy} from './current-simulation.mjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export const planningVariants=[{id:'balanced',name:'Gleichmäßiger verteilen'},{id:'direct',name:'Finals direkt anschließend'},{id:'balanced-direct',name:'Verteilen + Finals direkt'}];
const time=n=>n?Date.parse(n):0;
const routes=(s,g)=>{const queue=C.playlist(s);return {finalTiming:g.finalTiming||'block',finalTatami:queue.find(q=>q.group===g.code&&!q.pool&&q.status!=='done')?.tatami||g.tatami,poolTatamis:Array.from({length:g.pools||1},(_,i)=>queue.find(q=>q.group===g.code&&q.pool===i+1)?.tatami||g.poolTatamis?.[i]||g.tatami)};};
function settings(o={}){return {respectManual:o.respectManual!==false,callSeconds:typeof o.callSeconds==='number'&&Number.isFinite(o.callSeconds)?Math.min(300,Math.max(0,o.callSeconds)):45,...(typeof o.bufferPercent==='number'&&Number.isFinite(o.bufferPercent)?{bufferPercent:Math.min(200,Math.max(100,o.bufferPercent))}:{})};}
function summary(f){const loads=f.tatamis.filter(t=>!t.closed).map(t=>t.workMinutes);return {...f,spreadMinutes:loads.length?Math.max(...loads)-Math.min(...loads):0};}
const better=(a,b)=>time(a.end)<time(b.end)||time(a.end)===time(b.end)&&a.spreadMinutes<b.spreadMinutes;
function estimatedModel(s){
 const prepared=structuredClone(s),snapshot=currentTournamentCopy(s);
 for(const g of prepared.groups.filter(g=>g.active&&!g.draw)){const drawn=snapshot.model.groups.find(x=>x.code===g.code);if(!drawn?.draw)continue;g.draw=structuredClone(drawn.draw);g.finalists=drawn.finalists;prepared.bouts.push(...structuredClone(snapshot.model.bouts.filter(b=>b.group===g.code)));}
 return prepared;
}
// Batch only route/timing changes, preserving slots, results and unrelated jobs.
// Validation and construction finish on a copy before anything is assigned back.
export function routeChanges(s,changes,{actor='Planvorschau',reason='Planungsvariante'}={}){
 const next=structuredClone(s),old=C.playlist(s),codes=new Set();
 for(const c of changes){
  const g=next.groups.find(g=>g.code===c.group),a=c.after;
  if(!g?.active||g.ratified||next.bouts.some(b=>b.group===g.code&&b.started))throw fail('Begonnene Gruppe bleibt unverändert: '+c.group,409);
  if(codes.has(c.group)||!a||!['block','immediate'].includes(a.finalTiming)||![1,2,3,4,5].includes(a.finalTatami)||!Array.isArray(a.poolTatamis)||a.poolTatamis.length!==(g.pools||1)||a.poolTatamis.some(t=>![1,2,3,4,5].includes(t)))throw fail('Ungültige Planänderung');
  codes.add(g.code);g.finalTiming=a.finalTiming;g.tatami=a.finalTatami;g.poolTatamis=[...a.poolTatamis];g.queueConfigured=true;
 }
 let jobs=C.playlist({...next,queue:old.filter(q=>!codes.has(q.group))}).map(q=>{
  if(!codes.has(q.group))return {...q,order:old.find(x=>x.id===q.id)?.order??q.order};
  const g=next.groups.find(g=>g.code===q.group),previous=old.find(x=>x.group===q.group&&x.pool===q.pool);
  return {...q,tatami:q.pool?g.poolTatamis[q.pool-1]:g.tatami,order:previous?.order??Math.min(...old.filter(x=>x.group===g.code).map(x=>x.order))+.9};
 }).sort((a,b)=>a.phase-b.phase||a.order-b.order||a.id.localeCompare(b.id));
 for(const c of changes.filter(c=>c.after.finalTiming==='immediate'))for(const f of jobs.filter(q=>q.group===c.group&&!q.pool)){
  jobs=jobs.filter(q=>q.id!==f.id);let at=jobs.findLastIndex(q=>q.group===c.group&&q.phase===f.phase);if(at<0)at=jobs.findLastIndex(q=>q.tatami===f.tatami&&q.phase===f.phase);jobs.splice(at+1,0,f);
 }
 next.queue=jobs.map(({id,group,phase,pool,tatami})=>({id,group,phase,pool,tatami}));
 for(const b of next.bouts.filter(b=>codes.has(b.group)&&!b.started&&b.status!=='done'))b.version++;
 next.queueRevision=(s.queueRevision||0)+(changes.length?1:0);
 if(changes.length){next.planChanges??=[];next.planChanges.push(...changes.map(c=>({at:new Date().toISOString(),by:actor,group:c.group,reason,...c.after,before:c.before})));next.planChanges=next.planChanges.slice(-100);}
 return next;
}
function context(s,opts){
 const estimated=estimatedModel(s),baseline=summary(forecast(estimated,opts)),begun=new Set(s.bouts.filter(b=>b.started).map(b=>b.group)),work=new Set(baseline.jobs.filter(j=>j.tatami).map(j=>j.group)),occupied=g=>s.entries.some(e=>e.group===g.code&&e.active);
 return {source:s,estimated,baseline,candidates:s.groups.filter(g=>g.active&&work.has(g.code)&&occupied(g)&&!begun.has(g.code)&&!g.ratified&&(!opts.respectManual||!g.queueConfigured)),mats:s.tatamis.filter(t=>!t.deskClosed&&!t.paused).map(t=>t.id),skipped:{begun:begun.size,manual:s.groups.filter(g=>g.active&&occupied(g)&&g.queueConfigured&&!begun.has(g.code)).length}};
}
function optimise(ctx,id,opts,seed=[]){
 if(!planningVariants.some(v=>v.id===id))throw fail('Planungsvariante wählen');
 let changes=new Map(seed.map(c=>[c.group,structuredClone(c)])),best=summary(forecast(routeChanges(ctx.estimated,[...changes.values()]),opts));
 const evaluate=(g,after)=>{
  const before=routes(ctx.source,g),draft=new Map(changes);if(JSON.stringify(before)===JSON.stringify(after))draft.delete(g.code);else draft.set(g.code,{group:g.code,before,after,starts:ctx.source.entries.filter(e=>e.active&&e.group===g.code).length});
  const f=summary(forecast(routeChanges(ctx.estimated,[...draft.values()]),opts));return {draft,f};
 };
 if(id!=='direct'&&ctx.mats.length>1){
  // Bounded search: move the latest/heaviest groups first; retain only measurable improvements.
  for(let pass=0;pass<2;pass++){
   const latest=g=>Math.max(0,...best.jobs.filter(j=>j.group===g.code).map(j=>time(j.end))),ordered=[...ctx.candidates].sort((a,b)=>latest(b)-latest(a)||a.code.localeCompare(b.code)).slice(0,7);
   let chosen=null;
   for(const g of ordered)for(const t of ctx.mats){const current=changes.get(g.code)?.after||routes(ctx.source,g);if(current.finalTatami===t&&current.poolTatamis.every(x=>x===t))continue;const r=evaluate(g,{...current,finalTatami:t,poolTatamis:current.poolTatamis.map(()=>t)});if(better(r.f,chosen?.f||best))chosen=r;}
   if(!chosen)break;changes=chosen.draft;best=chosen.f;
  }
 }
 if(id.includes('direct')){
  const ordered=[...ctx.candidates].sort((a,b)=>Math.max(0,...best.jobs.filter(j=>j.group===b.code&&!j.pool).map(j=>time(j.end)))-Math.max(0,...best.jobs.filter(j=>j.group===a.code&&!j.pool).map(j=>time(j.end)))||a.code.localeCompare(b.code));
  for(const g of ordered){const current=changes.get(g.code)?.after||routes(ctx.source,g);if(current.finalTiming==='immediate'||!best.jobs.some(j=>j.group===g.code&&!j.pool&&j.phase!==C.basePhase(g)))continue;const r=evaluate(g,{...current,finalTiming:'immediate'});if(better(r.f,best)){changes=r.draft;best=r.f;}}
 }
 return {id,name:planningVariants.find(v=>v.id===id).name,forecast:best,changes:[...changes.values()],skipped:ctx.skipped,closedTatamis:ctx.source.tatamis.filter(t=>t.deskClosed||t.paused).map(t=>t.id),savedMinutes:Math.round((time(ctx.baseline.end)-time(best.end))/60000)};
}
export function planningAdvice(s,options={}){
 const opts=settings(options),ctx=context(s,opts),warnings=[],teams=s.entries.filter(e=>e.active&&e.kind==='team'&&s.groups.find(g=>g.code===e.group)?.active),pending=teams.filter(e=>!s.teams.find(t=>t.id===e.personId)?.verified||s.teams.find(t=>t.id===e.personId)?.memberIds?.length!==3);
 if(pending.length)warnings.push(pending.length+' Teams sind noch ungeprüft oder unvollständig. Ihre späteren Doppelstarts können die Zeiten ändern.');
 if(!s.event.continuous)warnings.push('Die eingestellten Zeitblöcke und Mittagspause bleiben erhalten.');
 const balanced=optimise(ctx,'balanced',opts),direct=optimise(ctx,'direct',opts),combined=optimise(ctx,'balanced-direct',opts,balanced.changes),variants=[balanced,direct,combined],ranking=variants.filter(v=>v.changes.length).sort((a,b)=>time(a.forecast.end)-time(b.forecast.end)||a.forecast.spreadMinutes-b.forecast.spreadMinutes||a.changes.length-b.changes.length);
 return {sourceRevision:s.revision,queueRevision:s.queueRevision||0,runId:s.runId||null,created:new Date().toISOString(),options:opts,baseline:ctx.baseline,variants,recommended:ranking[0]?.id||null,warnings};
}
export function applyPlanningAdvice(s,u,a){
 if(u?.role!=='admin')throw fail('Nur Wettkampfleitung',403);
 if(a.expectedRevision!==s.revision||a.expectedQueueRevision!==(s.queueRevision||0))throw fail('Meldestand oder Zeitplan wurde geändert. Varianten erneut vergleichen.',409);
 if(!a.reason?.trim())throw fail('Änderung kurz begründen');
 const opts=settings(a.options),ctx=context(s,opts),balanced=a.variant==='balanced-direct'?optimise(ctx,'balanced',opts):null,p=optimise(ctx,a.variant,opts,balanced?.changes||[]);
 if(!p.changes.length)throw fail('Diese Variante enthält keine Änderungen');
 const next=routeChanges(s,p.changes,{actor:u.name,reason:a.reason});Object.assign(s,next);return {groups:p.changes.length,variant:p.id,message:p.changes.length+' Gruppen umgeplant. Geänderte Pools erneut ausrufen und freigeben.'};
}
