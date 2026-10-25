import * as C from './core.mjs';
import groups from './groups.json' with {type:'json'};

export function resetCounts(s){return {people:s.people.length,teams:s.teams.length,starts:s.entries.filter(e=>e.active).length,dojos:s.dojos.length,groups:s.groups.filter(g=>g.active).length,draws:s.groups.filter(g=>g.draw).length,bouts:s.bouts.length,live:s.bouts.filter(b=>b.status==='live').length,done:s.bouts.filter(b=>b.status==='done').length,markers:s.streamMarkers?.length||0};}
export function validateRestart(a,restore=false){if(a.acknowledged!==true||String(a.confirmation||'').trim().toUpperCase()!==(restore?'WIEDERHERSTELLEN':'NEU STARTEN'))throw Error('Neustart ausdrücklich bestätigen und Bestätigungstext vollständig eingeben');if(!restore&&!['empty','keep'].includes(a.mode))throw Error('Art des Neustarts wählen');}
export function archiveTournament(s,u,mode,now=Date.now()){const model=structuredClone(s);for(const b of model.bouts){if(b.timer){b.timer.remaining=C.left(b,now);b.timer.since=null;}for(const f of b.teamFights||[])if(f.timer){f.timer.remaining=C.left(f,now);f.timer.since=null;}}
 return {id:C.uid(),at:new Date(now).toISOString(),actor:u.name,mode,revision:s.revision,counts:resetCounts(s),model};
}
export function archiveMetadata(backups=[]){return backups.map(({model,...meta})=>meta).reverse();}
export function restartTournament(s,a){validateRestart(a);const next=C.init(groups);next.event={...structuredClone(s.event),stage:0,published:false};if(s.billingSettings)next.billingSettings=structuredClone(s.billingSettings);next.tatamis=next.tatamis.map(t=>({...t,stream:s.tatamis.find(old=>old.id===t.id)?.stream||''}));
 if(a.mode==='keep'){
  for(const key of ['people','teams','entries','dojos','imports','registrationReceipts','registrationStatus'])if(s[key]!==undefined)next[key]=structuredClone(s[key]);
  next.groups=structuredClone(s.groups);for(const g of next.groups){g.draw=null;g.podium=[];g.ratified=false;g.tie=false;g.pools=1;g.qualifiersPerPool=4;g.finalists=4;g.poolTatamis=[];for(const key of ['prelimTieOrder','tieDecision','tieStage','poolConfigured','closedPools'])delete g[key];}C.applyDayPlan(next);
 }
 next.revision=s.revision;next.queueRevision=(s.queueRevision||0)+1;next.runId=C.uid();next.resetInfo={at:new Date().toISOString(),mode:a.mode};return next;
}
export function restoreTournament(current,backup,a){validateRestart(a,true);if(!backup?.model)throw Error('Sicherung nicht gefunden');const next=structuredClone(backup.model);next.revision=current.revision;next.queueRevision=Math.max(current.queueRevision||0,next.queueRevision||0)+1;next.runId=C.uid();next.event.published=false;
 for(const b of next.bouts){b.version=Math.max(b.version||0,current.bouts.find(old=>old.id===b.id)?.version||0)+1;if(b.timer)b.timer.since=null;for(const f of b.teamFights||[])if(f.timer)f.timer.since=null;}
 for(const t of next.tatamis){delete t.recordingId;delete t.boutPriority;if(t.production){for(const key of ['scene','capture','replay','ceremony','replayError','changedAt'])delete t.production[key];t.production.scene='camera';}}for(const h of next.highlights||[])h.available=false;next.resetInfo={at:new Date().toISOString(),mode:'restore',backup:backup.id};return next;
}
