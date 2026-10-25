import * as C from './core.mjs';
import {releaseStatus} from './dispatch.mjs';
export function callerState(s,tatami){
 const bs=s.bouts.filter(b=>C.tatami(s,b)===tatami),jobs=C.playlist(s),ranks=new Map(jobs.map((j,i)=>[j.id,i]));
 const rank=b=>ranks.get(C.jobId(s.groups.find(g=>g.code===b.group),b))??1e9;
 const live=bs.find(b=>b.status==='live'),ready=C.readyOnTatami(s,tatami),focus=live||ready[0];
 const person=id=>{const e=C.ent(s,id);if(!e)return null;return {name:e.name,dojo:e.dojo,...(e.kind==='team'?{members:[...(C.person(s,e).members||[])]}:{})};};
 let roster=null;
 if(focus){const g=s.groups.find(g=>g.code===focus.group),id=C.jobId(g,focus),job=jobs.find(j=>j.id===id),own=bs.filter(b=>C.jobId(s.groups.find(g=>g.code===b.group),b)===id),ids=[...new Set(own.flatMap(b=>[b.shiro,b.aka]).filter(Boolean))];
  roster={id:id+'|'+(g.draw?.seed||'')+'|'+ids.join(','),group:g.code,description:g.description,pool:focus.pool||null,final:!!focus.final,started:own.some(b=>b.started&&b.reason!=='Freilos'),released:C.phasePermitted(s,focus)&&releaseStatus(s,job),people:ids.map(person).filter(Boolean)};
 }
 const completed=bs.filter(b=>b.status==='done'&&b.ended&&b.reason!=='Freilos').sort((a,b)=>b.ended.localeCompare(a.ended)),last=completed[0];
 const result=last?{id:last.id,group:last.group,pool:last.pool||null,reason:last.reason,points:last.kind==='points',winner:person(last.winner),athlete:person(last.aka)}:null;
 const podiums=s.groups.filter(g=>!g.tie&&g.podium?.length&&bs.some(b=>b.group===g.code)&&s.bouts.filter(b=>b.group===g.code).every(b=>b.status==='done')).map(g=>({group:g.code,confirmed:!!g.ratified,places:g.podium.filter(p=>p.place<=3).map(p=>({place:p.place,athlete:person(p.entry)})).filter(p=>p.athlete)}));
 return {roster,result,podiums};
}
