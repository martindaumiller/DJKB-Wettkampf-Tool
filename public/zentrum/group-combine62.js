export function groupProgram(g){
 if(g.type===0)return 'kata';if(g.type===2)return 'kata-team';if(g.type===3)return 'kumite-team';
 const d=String(g.description||'');if(/Kihon/i.test(d))return /Jiyu/i.test(d)?'different':'kihon';
 return /Jiyu-Ippon/i.test(d)?(/letzten 8/i.test(d)?'jiyu-switch':'jiyu-ippon'):'jiyu';
}
export function combinationPreview(s,codes,description=''){
 const gs=[...new Set(codes)].map(c=>s.groups.find(g=>g.code===c)).filter(Boolean),counts=gs.map(g=>s.groupPlan?.groups.find(r=>r.code===g.code)?.starts??s.entries.filter(e=>e.active&&e.group===g.code).length),mixed=new Set(gs.map(g=>g.gender)).size>1||gs.some(g=>g.gender==='x'),programs=[...new Set(gs.map(groupProgram))];
 const program=description&&gs[0]?groupProgram({...gs[0],description}):programs.length===1?programs[0]:'different';
 return {groups:gs.map(g=>g.code),counts,total:counts.reduce((n,x)=>n+x,0),mixed,program,programChange:programs.some(p=>p!==program),minAge:gs.length?Math.min(...gs.map(g=>g.minAge)):0,maxAge:gs.length?Math.max(...gs.map(g=>g.maxAge)):0,minKyu:gs.length?Math.max(...gs.map(g=>g.minKyu)):0,maxKyu:gs.length?Math.min(...gs.map(g=>g.maxKyu)):0,mixedAllowed:!mixed||['kata','kata-team','kihon'].includes(program)};
}
export const programName=p=>({'kata':'Kata','kata-team':'Kata-Team','kihon':'Kihon-Ippon','jiyu-ippon':'Jiyu-Ippon','jiyu-switch':'Jiyu-Ippon / Jiyu-Kumite','jiyu':'Jiyu-Kumite','kumite-team':'Kumite-Team','different':'Unterschiedliche Programme'})[p]||p;
export function suggestedGroupDescription(s,codes){
 const p=combinationPreview(s,codes),base=codes.map(c=>s.groups.find(g=>g.code===c)).filter(Boolean).sort((a,b)=>b.minKyu-a.minKyu||b.maxKyu-a.maxKyu)[0];if(!base)return '';
 const age=p.maxAge>=99?'ab '+p.minAge+' Jahre':p.minAge<=0?'bis '+p.maxAge+' Jahre':p.minAge+'–'+p.maxAge+' Jahre',grade=p.maxKyu===0?'ab '+p.minKyu+'. Kyu':p.minKyu===p.maxKyu?p.minKyu+'. Kyu':p.minKyu+'.–'+p.maxKyu+'. Kyu';
 const program=String(base.description).split('|').at(-1).replace(/\)\s*$/,'').replace(/weiblich|maennlich|männlich|Mädchen|Jungen/gi,p.mixed?'Mixed':'gemeinsame Wertung');
 return programName(groupProgram(base))+(p.mixed?' Mixed':'')+' | '+age+' | '+grade+' | '+program;
}
