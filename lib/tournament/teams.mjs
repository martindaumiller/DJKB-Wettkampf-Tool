
import {teamMemberIssues,ageOnEvent} from '../../public/zentrum/team-rules.js';
const normal=x=>String(x||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
export function teamGroup(s,t){
  const e=s.entries.find(e=>e.kind==='team'&&e.personId===t.id&&e.active);
  return s.groups.find(g=>g.code===e?.group);
}
export function teamLocked(s,t){
  return s.entries.some(e=>e.personId===t.id&&e.active&&s.bouts.some(b=>b.group===e.group&&b.started));
}
function assignedElsewhere(s,t,id,includePending=true){
  const type=teamGroup(s,t)?.type;
  return s.teams.some(other=>other.id!==t.id&&other.verified&&other.memberIds?.includes(id)&&teamGroup(s,other)?.type===type)
    ||includePending&&s.requests.some(r=>r.status==='submitted'&&r.category==='team'&&r.target!==t.id&&r.change?.memberIds?.includes(id)&&teamGroup(s,s.teams.find(x=>x.id===r.target)||{})?.type===type);
}
export function trainerMaySelect(t,p){
  return p.dojo===t.dojo||t.memberIds?.includes(p.id)||(t.declaredMembers||t.members||[]).some(name=>normal(name)===normal(p.first+' '+p.last));
}
export function teamCandidates(s,t,trainer=false){
  const g=teamGroup(s,t);if(!g?.active||teamLocked(s,t))return [];
  return s.people.filter(p=>(!trainer||trainerMaySelect(t,p))&&!teamMemberIssues(p,g,s.event.date).length&&!assignedElsewhere(s,t,p.id))
    .map(p=>({id:p.id,first:p.first,last:p.last,dojo:p.dojo,ageOnEvent:ageOnEvent(p,s.event.date),kyu:p.kyu,gender:p.gender,birthVerified:!!p.birthVerified}))
    .sort((a,b)=>(a.dojo===t.dojo?0:1)-(b.dojo===t.dojo?0:1)||(a.last+' '+a.first).localeCompare(b.last+' '+b.first,'de'));
}
export function validateTeam(s,t,ids,{trainer=false,includePending=true}={}){
  if(!t)throw Error('Team fehlt');
  const g=teamGroup(s,t);
  if(!g?.active||g.type<2)throw Error('Aktive Teamgruppe fehlt');
  if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3)throw Error('Drei unterschiedliche Teammitglieder wählen');
  const people=ids.map(id=>s.people.find(p=>p.id===id));
  if(people.some(p=>!p))throw Error('Alle Teammitglieder müssen gemeldet sein');
  for(const p of people){
    if(trainer&&!trainerMaySelect(t,p))throw Object.assign(Error('Nur eigene oder bereits gemeldete Gastmitglieder auswählen'),{status:403});
    const issues=teamMemberIssues(p,g,s.event.date);
    if(issues.length)throw Error(p.first+' '+p.last+': '+issues.join(', '));
    if(assignedElsewhere(s,t,p.id,includePending))throw Error(p.first+' '+p.last+': bereits einem anderen Team dieser Disziplin zugeordnet oder vorgeschlagen');
  }
  if(people.filter(p=>p.dojo===t.dojo).length<2)throw Error('2:1-Regel: mindestens zwei Mitglieder aus dem Team-Dojo');
  return {group:g,people};
}
export function teamTasks(s,dojo){
  return s.teams.filter(t=>t.dojo===dojo&&teamGroup(s,t)?.active).map(t=>{
    const g=teamGroup(s,t),r=s.requests.findLast(r=>r.category==='team'&&r.target===t.id&&r.status==='submitted');
    let valid=false;try{validateTeam(s,t,t.memberIds,{includePending:false});valid=true;}catch{}
    return {id:t.id,name:t.name,dojo:t.dojo,members:t.members,memberIds:t.memberIds,group:g.code,verified:!!t.verified&&valid,locked:teamLocked(s,t),pendingRequest:r?.id||null,proposedMemberIds:r?.change.memberIds||[],candidates:teamCandidates(s,t,true)};
  });
}
