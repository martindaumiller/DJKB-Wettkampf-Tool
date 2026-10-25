import {isKata,kataReviewed} from './kata-review.mjs';
import * as C from './core.mjs';
export const poolKey=b=>b.pool?'pool-'+b.pool:'final';
export function canCorrect(s,u,b){
 if(u?.role==='admin')return true;
 if(u?.role!=='table'||C.tatami(s,b)!==u.tatami)return false;
 const g=s.groups.find(g=>g.code===b.group),t=s.tatamis.find(t=>t.id===u.tatami);
 if(t?.deskClosed||g?.ratified||g?.closedPools?.[poolKey(b)])return false;
 if(!b.started)return true;
 const active=s.bouts.find(x=>x.status==='live'&&C.tatami(s,x)===u.tatami);
 if(active&&(active.group!==b.group))return false;
 // Once a different pool was started later on this mat, only leadership may revise the old one.
 return !s.bouts.some(x=>x.started&&C.tatami(s,x)===u.tatami&&x.group!==b.group&&x.started>(b.ended||b.started||''));
}
export function assertDeskWrite(s,u,b){
 const g=s.groups.find(g=>g.code===b.group),t=s.tatamis.find(t=>t.id===u?.tatami);
 if(u?.role==='table'&&(C.tatami(s,b)!==u.tatami||t?.deskClosed||g?.ratified||g?.closedPools?.[poolKey(b)]))throw Object.assign(Error('Pool oder Tatami abgeschlossen. Die Wettkampfleitung kann korrigieren.'),{status:403});
}
export function closeDeskScope(s,u,a){
 if(!['admin','table'].includes(u?.role))throw Object.assign(Error('Nur Tisch oder Wettkampfleitung'),{status:403});
 if(a.kind==='tatami'){
  const t=s.tatamis.find(t=>t.id===(u.role==='table'?u.tatami:a.tatami));if(!t)throw Error('Tatami fehlt');
  if(a.closed===false&&u.role!=='admin')throw Object.assign(Error('Nur die Leitung kann die Tatami wieder freigeben'),{status:403});
  if(a.closed!==false&&s.bouts.some(b=>C.tatami(s,b)===t.id&&b.status==='live'))throw Error('Laufende Begegnung zuerst abschließen');
  t.deskClosed=a.closed!==false;t.deskClosedAt=new Date().toISOString();t.deskClosedBy=u.name;return;
 }
 const g=s.groups.find(g=>g.code===a.group);if(!g)throw Error('Gruppe fehlt');
 const bs=s.bouts.filter(b=>b.group===g.code&&poolKey(b)===a.pool);if(!bs.length)throw Error('Pool fehlt');
 if(u.role==='table'&&bs.some(b=>C.tatami(s,b)!==u.tatami))throw Object.assign(Error('Pool gehört zu anderer Tatami'),{status:403});
 if(a.closed===false&&u.role!=='admin')throw Object.assign(Error('Nur die Leitung kann den Pool wieder freigeben'),{status:403});
 if(a.closed!==false&&bs.some(b=>b.status!=='done'))throw Error('Pool ist noch nicht vollständig entschieden');
 if(a.closed!==false&&isKata(g)&&!kataReviewed(s,g,bs))throw Error('Kata-Abschlussliste zuerst prüfen, Stechen entscheiden und mit dem Ombudsmann abgleichen.');
 g.closedPools??={};if(a.closed===false)delete g.closedPools[a.pool];else g.closedPools[a.pool]={at:new Date().toISOString(),by:u.name};
}
export function correctionImpact(s,b){
 const ids=new Set([b.id]);let changed=true;
 while(changed){changed=false;for(const x of s.bouts.filter(x=>x.group===b.group))if(!ids.has(x.id)&&(x.sources?.some(id=>ids.has(id))||b.kind==='points'&&!b.final&&x.final)){ids.add(x.id);changed=true;}}
 return s.bouts.filter(x=>ids.has(x.id));
}
export function reopenForCorrection(s,u,b,a){
 assertDeskWrite(s,u,b);if(b.status!=='done')throw Error('Nur beendete Begegnungen erneut öffnen');
 if(!canCorrect(s,u,b))throw Object.assign(Error('Ein anderer Pool wurde bereits aufgerufen. Bitte Wettkampfleitung hinzuziehen.'),{status:403});
 if(!a.reason?.trim())throw Error('Korrektur begründen');
 const impact=correctionImpact(s,b),started=impact.filter(x=>x.id!==b.id&&x.started);
 if(started.length&&a.confirmImpact!==true)throw Error(started.length+' Folgebegegnung(en) wurden bereits begonnen. Zurücksetzen ausdrücklich bestätigen.');
 if(u.role==='table'&&impact.some(x=>x.id!==b.id&&(x.started||s.groups.find(g=>g.code===x.group)?.closedPools?.[poolKey(x)]||s.tatamis.find(t=>t.id===C.tatami(s,x))?.deskClosed)&&!canCorrect(s,u,x)))throw Object.assign(Error('Korrektur betrifft einen anderen oder abgeschlossenen Pool. Bitte Wettkampfleitung hinzuziehen.'),{status:403});
 if(s.bouts.some(x=>x.status==='live'&&C.tatami(s,x)===C.tatami(s,b)&&!impact.some(y=>y.id===x.id)))throw Error('Andere Begegnung läuft auf dieser Tatami. Zuerst abschließen.');
 s.corrections??=[];s.corrections.push({id:C.uid(),at:new Date().toISOString(),by:u.name,reason:a.reason,group:b.group,bouts:structuredClone(impact)});
 // Keep the complete previous results for review; replacement bouts must not retain old scores or fighters.
 const generatedFinal=b.kind==='points'&&!b.final;
 if(generatedFinal)s.bouts=s.bouts.filter(x=>!(impact.some(y=>y.id===x.id)&&x.id!==b.id&&x.final));
 for(const x of impact.filter(x=>s.bouts.includes(x))){const fresh=C.newBout(x.group,x.kind);if(x.id===b.id){Object.assign(x,{status:'live',winner:null,loser:null,ended:null,timer:{remaining:C.left(x),since:null}});}
  else{for(const key of ['score','penalties','judges','kata','winner','loser','reason','started','ended','timer','actions'])x[key]=structuredClone(fresh[key]);x.status='waiting';x.aka=null;x.shiro=null;for(const key of ['teamFights','fights','teamSummary','decider','akaOrder','shiroOrder','saishiai','sections','exchanges','techHistory','techPlan','startedTatami'])delete x[key];}
  x.version++;
 }
 const g=s.groups.find(g=>g.code===b.group);
 if(u.role==='admin'&&g.ratified){g.closedPools??={};for(const x of s.bouts.filter(x=>x.group===g.code))g.closedPools[poolKey(x)]??={at:new Date().toISOString(),by:u.name,reason:'Leitungskorrektur nach Ergebnisbestätigung'};}
 g.ratified=false;g.podium=[];g.tie=false;delete g.prelimTieOrder;delete g.tieDecision;delete g.kataTieRounds;
}
