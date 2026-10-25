// Candidate athletes for one scheduled pool. Separate pools may run in parallel;
// unknown finalists conservatively include everyone who could still qualify.
export function jobEntryIds(s,g,job){
 const active=s.entries.filter(e=>e.active&&e.group===g.code),allowed=new Set(active.map(e=>e.id));
 if(job.pool){
  if(g.draw?.slots){const size=g.draw.slots.length/(g.pools||1);return g.draw.slots.slice((job.pool-1)*size,job.pool*size).filter(id=>allowed.has(id));}
  return active.filter((e,i)=>i%(g.pools||1)===job.pool-1).map(e=>e.id);
 }
 const bouts=(job.pending||[]).filter(b=>b.status!=='done');
 if(!job.anticipated&&bouts.length&&bouts.every(b=>b.aka&&(b.kind==='points'||b.shiro)))return [...new Set(bouts.flatMap(b=>[b.aka,b.shiro]).filter(id=>allowed.has(id)))];
 return active.map(e=>e.id);
}
export function jobAthletes(s,g,job){
 const entries=new Map(s.entries.map(e=>[e.id,e])),teams=new Map(s.teams.map(t=>[t.id,t]));
 return [...new Set(jobEntryIds(s,g,job).flatMap(id=>{const e=entries.get(id);return !e?[]:e.kind==='person'?[e.personId]:(teams.get(e.personId)?.memberIds||[]);} ))];
}
