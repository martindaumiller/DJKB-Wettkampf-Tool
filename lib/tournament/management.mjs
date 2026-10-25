import {groupBelts} from '../../public/zentrum/belts.js';
import {entryCents} from './fees.mjs';
import * as C from './core.mjs';
import {combinationPreview} from '../../public/zentrum/group-combine62.js';

export const feeRates = {individualCents:1500, teamCents:3000};

export function canViewFees(user, context={}) {
  return !!(user?.role==='admin' && (C.norm(user.name)==='leitung' || context.ownerId && user.id===context.ownerId));
}

export function groupOverview(state) {
  const queue=C.playlist(state);
  return state.groups.map(group=>{
    const entries=state.entries.filter(e=>e.group===group.code);
    const active=entries.filter(e=>e.active && group.active);
    const bouts=state.bouts.filter(b=>b.group===group.code);
    const people=new Set(active.flatMap(e=>e.kind==='person'?[e.personId]:(C.person(state,e)?.memberIds||[])));
    const pendingTeams=active.filter(e=>e.kind==='team' && !C.person(state,e)?.verified).length;
    const routes=queue.filter(q=>q.group===group.code && q.status!=='done');
    return {
      code:group.code, belts:groupBelts(state,group), starts:active.length, individuals:active.filter(e=>e.kind==='person').length,
      teams:active.filter(e=>e.kind==='team').length, people:people.size, pendingTeams,
      withdrawn:entries.filter(e=>!e.active).length,
      dojos:new Set(active.map(e=>C.person(state,e)?.dojo).filter(Boolean)).size,
      started:!!group.ratified || bouts.some(b=>b.started), live:bouts.some(b=>b.status==='live'),
      tatamis:[...new Set(routes.map(q=>q.tatami))].sort(),
      status:!group.active?(group.mergedInto?'merged':'cancelled'):bouts.some(b=>b.status==='live')?'live':group.ratified?'finished':bouts.some(b=>b.started)?'started':group.draw?'drawn':active.length?'registered':'empty'
    };
  });
}

export function feeOverview(state) {
  const canonical=new Map();
  for(const name of [...state.dojos.map(d=>d.name), ...state.entries.map(e=>C.person(state,e)?.dojo), ...state.imports.map(i=>i.dojo)].filter(Boolean))if(!canonical.has(C.norm(name)))canonical.set(C.norm(name),String(name).trim());
  const names=[...canonical.values()];
  const rows=names.map(dojo=>{
    const entries=state.entries.filter(e=>C.norm(C.person(state,e)?.dojo)===C.norm(dojo));
    const active=entries.filter(e=>e.active && state.groups.find(g=>g.code===e.group)?.active);
    const individualStarts=active.filter(e=>e.kind==='person').length;
    const teamStarts=active.filter(e=>e.kind==='team').length;
    const individualCents=active.filter(e=>e.kind==='person').reduce((n,e)=>n+entryCents(e),0);
    const teamCents=active.filter(e=>e.kind==='team').reduce((n,e)=>n+entryCents(e),0);
    const imports=state.imports.filter(i=>C.norm(i.dojo)===C.norm(dojo)).map(i=>({
      id:i.id, received:i.received||null,
      declaredCents:i.raw?.fee_eur!==undefined && i.raw?.fee_eur!==null && i.raw?.fee_eur!=='' && Number.isFinite(Number(i.raw.fee_eur))?Math.round(Number(i.raw.fee_eur)*100):null,
      calculatedCents:Number.isFinite(i.fee)?Math.round(i.fee*100):null,
      individualStarts:(i.raw?.participants||[]).reduce((n,p)=>n+(p.starts||[]).length,0),
      teamStarts:(i.raw?.teams||[]).length
    }));
    return {dojo,individualStarts,teamStarts,individualCents,teamCents,totalCents:individualCents+teamCents,
      withdrawn:entries.filter(e=>!e.active).length,imports,
      groups:[...new Set(active.map(e=>e.group))].map(code=>({code,starts:active.filter(e=>e.group===code).length}))};
  }).sort((a,b)=>a.dojo.localeCompare(b.dojo,'de'));
  return {rates:feeRates,rows,totalCents:rows.reduce((n,r)=>n+r.totalCents,0),individualStarts:rows.reduce((n,r)=>n+r.individualStarts,0),teamStarts:rows.reduce((n,r)=>n+r.teamStarts,0)};
}

function requireUnstarted(state,group) {
  if(!group)throw Error('Gruppe fehlt');
  if(group.ratified)throw Error('Bestätigte Platzierungen bleiben geschützt. Zuerst die Ergebnisentscheidung gesondert korrigieren.');
  if(state.bouts.some(b=>b.group===group.code && b.started))throw Error('Gruppe bereits begonnen. Für Änderungen den Restwettbewerb neu aufsetzen oder einzelne Starter zurückziehen.');
}
function clearGroups(state,codes) {
  state.bouts=state.bouts.filter(b=>!codes.includes(b.group));
  for(const g of state.groups.filter(g=>codes.includes(g.code))){g.draw=null;g.podium=[];g.ratified=false;g.tie=false;delete g.tieDecision;delete g.prelimTieOrder;}
  state.queue=(state.queue||[]).filter(q=>!codes.includes(q.group));
  state.queueRevision=(state.queueRevision||0)+1;
}

export function mergeGroups(state,action) {
  const codes=[...new Set([action.group,...(action.sources||[])])];
  const target=state.groups.find(g=>g.code===action.group),groups=codes.map(code=>state.groups.find(g=>g.code===code));
  if(codes.length<2 || !action.reason?.trim() || !action.description?.trim())throw Error('Mindestens zwei Gruppen, Begründung und gemeinsame Regelbeschreibung erforderlich');
  if(groups.some(g=>!g?.active) || groups.some(g=>g.type!==target.type))throw Error('Nur aktive Gruppen derselben Disziplin zusammenlegen');
  const preview=combinationPreview(state,codes,action.description);
  if(!preview.mixedAllowed)throw Error('Mixed ist nur für Kata oder Kihon-Ippon vorgesehen');
  if(preview.mixed&&preview.programChange&&action.confirmProgramChange!==true)throw Error('Änderung zur gemeinsamen Kihon-Ippon-Kampfform mit den Coaches bestätigen');
  groups.forEach(g=>requireUnstarted(state,g));
  const entries=state.entries.filter(e=>codes.includes(e.group) && e.active);
  if(new Set(entries.map(e=>e.personId)).size!==entries.length)throw Error('Zusammenlegung erzeugt einen Doppelstart');
  const minAge=Math.min(...groups.map(g=>g.minAge)),maxAge=Math.max(...groups.map(g=>g.maxAge));
  const defaultPhase=target.type===2?(maxAge<=11?0:3):target.type===3?6:target.type===0?(maxAge<=12?1:3):(maxAge<=12?2:4);
  const phase=action.phase===undefined?defaultPhase:Number(action.phase);
  const allowed=target.type===0?[1,3]:target.type===1?[2,4]:target.type===2?[0,3]:[6];
  if(!allowed.includes(phase))throw Error('Passende Wettkampfphase wählen');
  const history=[...(target.sourceGroups||[]),...codes.filter(code=>code!==target.code)];
  clearGroups(state,codes);
  target.minAge=minAge;target.maxAge=maxAge;target.minKyu=Math.max(...groups.map(g=>g.minKyu));target.maxKyu=Math.min(...groups.map(g=>g.maxKyu));
  target.gender=new Set(groups.map(g=>g.gender)).size===1?target.gender:'x';
  target.phase=phase;target.description=action.description.trim();target.mergeReason=action.reason.trim();target.sourceGroups=[...new Set(history)];
  for(const source of groups.filter(g=>g!==target)){source.active=false;source.mergedInto=target.code;source.statusReason=action.reason.trim();}
  for(const entry of state.entries.filter(e=>codes.includes(e.group) && e.group!==target.code)){entry.group=target.code;if(entry.active)entry.exception=action.reason.trim();}
  return {group:target.code,merged:codes.filter(code=>code!==target.code),starts:entries.length};
}

export function setGroupStatus(state,action) {
  const group=state.groups.find(g=>g.code===action.group);
  if(!group || !action.reason?.trim() || typeof action.active!=='boolean')throw Error('Gruppe, Status und Begründung erforderlich');
  if(group.active===action.active)throw Error('Gruppenstatus wurde bereits geändert');
  requireUnstarted(state,group);
  const entries=state.entries.filter(e=>e.group===group.code && e.active);
  if(!action.active && entries.length && action.withdraw!==true)throw Error('Zurückziehen aller Starts ausdrücklich bestätigen oder Gruppe zusammenlegen');
  if(action.active && group.mergedInto)throw Error('Zusammengelegte Quellgruppe bleibt dokumentiert. Zum Aufteilen eine neue Gruppe einrichten.');
  clearGroups(state,[group.code]);
  if(!action.active)for(const entry of entries){entry.active=false;entry.withdrawReason=action.reason.trim();}
  group.active=action.active;group.statusReason=action.reason.trim();
  return {group:group.code,active:group.active,withdrawn:action.active?0:entries.length};
}
