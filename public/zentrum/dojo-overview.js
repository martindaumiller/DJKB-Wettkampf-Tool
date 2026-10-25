const norm=x=>String(x??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
export function dojoOverview(s){const rows=new Map(),ensure=(name,id)=>{const key=norm(name);if(!rows.has(key))rows.set(key,{id:id||key,name,starters:new Set(),individualStarts:0,teams:0,pendingTeams:0,starts:0});return rows.get(key);};
 for(const d of s.dojos||[])ensure(d.name,d.id);
 const people=new Map((s.people||[]).map(p=>[p.id,p])),teams=new Map((s.teams||[]).map(t=>[t.id,t])),groups=new Map((s.groups||[]).map(g=>[g.code,g]));
 for(const e of s.entries||[]){if(!e.active||groups.get(e.group)?.active===false)continue;const person=(e.kind==='team'?teams:people).get(e.personId);if(!person)continue;const row=ensure(person.dojo);row.starts++;if(e.kind==='team'){row.teams++;if(!person.verified)row.pendingTeams++;}else{row.starters.add(person.id);row.individualStarts++;}}
 return [...rows.values()].map(r=>({...r,starters:r.starters.size})).sort((a,b)=>b.starts-a.starts||a.name.localeCompare(b.name,'de'));
}
