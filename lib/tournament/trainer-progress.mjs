import * as C from './core.mjs';
export function trainerProgress(s,dojo){
 const own=new Set(s.entries.filter(e=>C.person(s,e).dojo===dojo).map(e=>e.id)),jobs=new Map(C.playlist(s).map((q,i)=>[q.id,i]));
 const brief=id=>{const e=C.ent(s,id);return e?{name:e.name,dojo:e.dojo,own:own.has(id)}:null;};
 const bouts=s.bouts.filter(b=>own.has(b.aka)||own.has(b.shiro)).map(b=>{const g=s.groups.find(g=>g.code===b.group),f=b.teamFights?.find(f=>f.status==='live');return {id:b.id,group:b.group,description:g.description,tatami:C.tatami(s,b),pool:b.pool||0,final:!!b.final,kind:C.mode(g,b),status:b.status,aka:brief(b.aka),shiro:brief(b.shiro),score:f?.score||b.score,judges:b.judges||[],reason:b.reason||'',winner:brief(b.winner),ended:b.ended||'',rank:jobs.get(C.jobId(g,b))??1e9,round:b.round||0,freilos:b.reason==='Freilos'};});
 return {live:bouts.filter(b=>b.status==='live'),next:bouts.filter(b=>b.status==='ready').sort((a,b)=>a.rank-b.rank||a.round-b.round),results:bouts.filter(b=>b.status==='done'&&!b.freilos).sort((a,b)=>b.ended.localeCompare(a.ended)),finalists:s.groups.flatMap(g=>{const ids=[...new Set(s.bouts.filter(b=>b.group===g.code&&b.final&&!b.bronze).flatMap(b=>[b.aka,b.shiro]).filter(id=>own.has(id)))];return ids.map(id=>({group:g.code,tatami:g.tatami,athlete:brief(id),place:g.podium?.find(p=>p.entry===id)?.place||null,ratified:!!g.ratified}));})};
}
