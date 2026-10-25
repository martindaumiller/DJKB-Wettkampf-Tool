import * as C from './core.mjs';
import {lastField} from './field-presentation.mjs';
const fail=(m,status=400)=>Object.assign(Error(m),{status});
export function releaseStatus(s,q){return C.jobReleased(s,q);}
export function dispatchState(s){return C.playlist(s).map(q=>({...q,released:releaseStatus(s,q)}));}
export function releaseJob(s,u,a){
 if(u?.role!=='admin')throw fail('Nur die Wettkampfleitung darf Pools ausrufen und freigeben',403);
 const q=C.playlist(s).find(q=>q.id===a.job),g=s.groups.find(g=>g.code===q?.group);
 if(!q||q.status==='done'||!g?.draw)throw fail('Einen ausgelosten, offenen Pool oder eine Finalrunde wählen');
 if(a.tatami!==q.tatami||a.drawAt!==g.draw.at)throw fail('Planung oder Auslosung wurde geändert. Bitte neu laden.',409);
 s.releases??={};
 if(a.released===false){if(s.bouts.some(b=>b.started&&C.jobId(g,b)===q.id))throw fail('Begonnene Pools bleiben freigegeben. Zum Anhalten Tatami pausieren.');delete s.releases[q.id];return;}
 s.releases[q.id]={job:q.id,tatami:q.tatami,drawAt:g.draw.at,run:s.runId||null,early:a.early===true,by:u.name,at:new Date().toISOString()};
 return {released:q.id,tatami:q.tatami};
}
export function assertReleased(s,u,b){
 if(u.role!=='table')return;
 const g=s.groups.find(g=>g.code===b.group),id=C.jobId(g,b),q=C.playlist(s).find(q=>q.id===id);
 if(q?.held)throw fail('Pool durch die Leitung zurückgestellt',403);
 if(!q||!releaseStatus(s,q))throw fail('Warte auf Ausruf und Freigabe dieses Pools durch die Wettkampfleitung.',403);
 const priority=s.tatamis.find(t=>t.id===C.tatami(s,b))?.boutPriority;if(priority?.bout===b.id&&priority.version===b.version&&priority.run===(s.runId||null))return;
 const field=lastField(s,q.tatami),mat=s.tatamis.find(t=>t.id===q.tatami);
 if(field?.complete&&field.job!==q.id&&mat.reviewedField!==field.key)throw fail('Zuerst die Abschlussübersicht der vorherigen Gruppe prüfen und bestätigen.',403);
 const previous=C.playlist(s).find(x=>x.tatami===q.tatami&&x.id!==q.id&&x.status!=='done'&&!x.held&&s.bouts.some(b=>b.started&&C.jobId(s.groups.find(g=>g.code===b.group),b)===x.id&&C.tatami(s,b)===q.tatami));
 if(previous)throw fail('Zuerst den laufenden Pool '+previous.group+' abschließen. Die Vorabfreigabe gilt anschließend.',403);
}
