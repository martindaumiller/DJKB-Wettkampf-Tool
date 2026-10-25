import {groupBelts} from '../../public/zentrum/belts.js';
import {groupProgram,combinationPreview,programName,suggestedGroupDescription} from '../../public/zentrum/group-combine62.js';

// Candidates are assessed on every read against the accepted, active roster.
// This does not change registrations, rules, draws or results.
const plans=[
 ['a1w',['A1 W','B1 W'],'B1 W','Kata weiblich · 7–10 Jahre','Gemeinsame beherrschte Kata und Altersausnahme mit den Coaches abstimmen.'],
 ['a2w',['A2 W','B2 W'],'B2 W','Kihon-Ippon weiblich · 7–10 Jahre','Kihon-Ippon bleibt erhalten; Altersausnahme mit den Coaches abstimmen.'],
 ['a3m',['A3 M','B1 M'],'B1 M','Kata männlich · 7–10 Jahre','Gemeinsames Kata-Programm und Altersausnahme abstimmen.'],
 ['a4m',['A4 M','B2 M'],'B2 M','Kihon-Ippon männlich · 7–10 Jahre','Kihon-Ippon bleibt erhalten; Altersausnahme mit den Coaches abstimmen.'],
 ['e1w',['E1 W','E3 W'],'E1 W','Kata weiblich · 15–16 Jahre · 7.–5. Kyu','Erweiterte Graduierung und gemeinsames Programm Heian 1–3 mit Leitung und Coaches abstimmen.'],
 ['e3m',['E3 M','F1 M','F3 M'],'E3 M','Kata männlich · 16–18 Jahre · 7.–5. Kyu','Erweiterte Alters- und Graduierungsgrenze sowie Heian 1–3 mit Leitung und Coaches abstimmen. E3 M könnte mit eigenen Gegnern auch eigenständig bleiben.'],
 ['e4m',['E4 M','F4 M'],'E4 M','Jiyu-Ippon männlich · 16–18 Jahre','Gleiche Kampfform; alternativ steht die unten genannte Sonderklasse zur Abstimmung.'],
 ['i3w',['I3 W','I5 W'],'I3 W','Kata-Team weiblich · ab 15 Jahren','Teammitglieder und Alterszuordnungen vor der endgültigen Einteilung bestätigen.']
];
const alternatives=[
 ['e2w',['E2 W','E4 W'],'E2 W','Kihon-Ippon weiblich · Sonderklasse','Kihon-Ippon für alle; Kampfform vorab mit den betroffenen Coaches abstimmen.'],
 ['e4m-alt',['E4 M','F4 M','F2 M'],'E4 M','Kihon-Ippon männlich · 16–18 Jahre · 7.–5. Kyu','Alternative zu E4 M + F4 M, nicht zusätzlich: Alle wechseln zu Kihon-Ippon. Nur nach ausdrücklicher Zustimmung der betroffenen Coaches und der Leitung; sonst für F2 M einen passenden Gegner suchen.']
];
export function publicGroupPlan(s){
 const groups=s.groups.map(g=>{const es=s.entries.filter(e=>e.active&&e.group===g.code&&g.active);return {code:g.code,starts:es.length,teams:es.filter(e=>e.kind==='team').length,belts:groupBelts(s,g)};});
 const begun=code=>s.groups.find(g=>g.code===code)?.ratified||s.bouts.some(b=>b.group===code&&b.started);
 const proposal=(row,option=false)=>{
  const [id,codes,target,title,note]=row,gs=codes.map(code=>s.groups.find(g=>g.code===code));if(gs.some(g=>!g))return null;
  const applied=gs.filter(g=>g.code!==target).every(g=>!g.active&&g.mergedInto===target),counts=codes.map(code=>groups.find(g=>g.code===code)?.starts||0);
  if(!applied){
   if(gs.some(g=>!g.active||begun(g.code))||counts.some(n=>n===0)||!counts.includes(1))return null;
   // Regional A candidates only fit B1/B2 when the actual child is seven and
   // still within the target's grades. Never widen an advanced child's class silently.
   if(id.startsWith('a')){const g=gs.find(g=>g.code===target);for(const e of s.entries.filter(e=>e.active&&codes.includes(e.group)&&e.kind==='person')){const p=s.people.find(p=>p.id===e.personId);if(!p||p.kyu<g.maxKyu||p.kyu>g.minKyu)return null;if(e.group!==target){const date=s.event.date||'2026-10-24',age=Number(date.slice(0,4))-Number(p.birth?.slice(0,4))-(date.slice(5)<String(p.birth).slice(5)?1:0);if(age!==7)return null;}}}
   const limits=({e1w:[15,16,5,7],e3m:[16,18,5,7],e4m:[16,18,5,6],e2w:[15,16,5,7],'e4m-alt':[16,18,5,7]})[id];
   if(limits)for(const e of s.entries.filter(e=>e.active&&codes.includes(e.group)&&e.kind==='person')){const p=s.people.find(p=>p.id===e.personId),date=s.event.date||'2026-10-24',age=p?Number(date.slice(0,4))-Number(p.birth?.slice(0,4))-(date.slice(5)<String(p.birth).slice(5)?1:0):NaN;if(!p||!Number.isFinite(age)||age<limits[0]||age>limits[1]||p.kyu<limits[2]||p.kyu>limits[3])return null;}
  }
  return {id,groups:codes,target,title,note,option,counts,total:counts.reduce((a,b)=>a+b,0),status:applied?'applied':'provisional',...(id==='e4m-alt'?{replaces:['e4m']}:{} )};
 };
 let proposals=plans.map(p=>proposal(p)).filter(Boolean),options=alternatives.map(p=>proposal(p,true)).filter(Boolean);
 const occupied=groups.filter(g=>g.starts>0),solo=occupied.filter(g=>g.starts===1);
 const mixed=new Map();
 for(const single of solo){const a=s.groups.find(g=>g.code===single.code),program=groupProgram(a);if(!['kata','kata-team','kihon'].includes(program)||begun(a.code)||a.gender==='x')continue;
  const partners=s.groups.filter(b=>b.active&&b.code!==a.code&&!begun(b.code)&&groups.find(g=>g.code===b.code)?.starts>0&&b.type===a.type&&b.gender!==a.gender&&b.gender!=='x'&&groupProgram(b)===program&&((a.minKyu===b.minKyu&&a.maxKyu===b.maxKyu)||(a.code.startsWith('A')&&b.code.startsWith('A')))&&((a.minAge===b.minAge&&a.maxAge===b.maxAge)||(Math.max(a.minAge,b.minAge)-Math.min(a.maxAge,b.maxAge)<=1&&Math.max(a.maxAge,b.maxAge)-Math.min(a.minAge,b.minAge)<=3))).sort((b,c)=>(Math.abs(a.minAge-b.minAge)+Math.abs(a.maxAge-b.maxAge))-(Math.abs(a.minAge-c.minAge)+Math.abs(a.maxAge-c.maxAge))||b.code.localeCompare(c.code));
  const b=partners[0];if(!b)continue;const codes=[a.code,b.code].sort(),id='mixed-'+codes.join('-').replaceAll(' ','');if(mixed.has(id))continue;
  const p=combinationPreview(s,codes),replaces=proposals.filter(x=>x.groups.some(c=>codes.includes(c))).map(x=>x.id),age=p.maxAge>=99?'ab '+p.minAge+' Jahren':p.minAge===0?'bis '+p.maxAge+' Jahre':p.minAge+'–'+p.maxAge+' Jahre';
  mixed.set(id,{id,groups:codes,target:codes[0],title:programName(program)+' Mixed · '+age,note:'Gemeinsame Wertung weiblich / männlich. Gemeinsames Programm sowie Alter und Graduierung mit Leitung und Coaches abstimmen. Alternative zu überlappenden Vorschlägen, nicht zusätzlich.',description:suggestedGroupDescription(s,codes),option:true,mixed:true,counts:p.counts,total:p.total,status:'provisional',replaces});
 }
 options.push(...mixed.values());
 for(const edit of s.groupPlanEdits||[]){
  const sameAutomatic=p=>!p.manual&&edit.groups?.length===p.groups.length&&p.groups.every(c=>edit.groups.includes(c));
  proposals=proposals.filter(p=>p.id!==edit.id&&!sameAutomatic(p));options=options.filter(p=>p.id!==edit.id&&!sameAutomatic(p));if(edit.hidden)continue;
  if(!edit.option)proposals=proposals.filter(p=>p.manual||!p.groups.some(c=>edit.groups.includes(c)));
  const gs=edit.groups.map(c=>s.groups.find(g=>g.code===c));if(gs.some(g=>!g))continue;
  const p=combinationPreview(s,edit.groups,edit.description),applied=gs.filter(g=>g.code!==edit.target).every(g=>!g.active&&g.mergedInto===edit.target),attention=applied?'':gs.some(g=>!g.active||begun(g.code))?'Gruppenstatus geändert · erneut prüfen':p.counts.some(n=>n===0)?'Partnergruppe ohne Meldung · erneut prüfen':!p.mixedAllowed?'Programm geändert · erneut prüfen':'';
  const row={...edit,counts:p.counts,total:p.total,mixed:p.mixed,status:applied?'applied':'provisional',attention};(edit.option?options:proposals).push(row);
 }
 for(const p of proposals)if(!p.attention&&p.status!=='applied'&&proposals.some(other=>other!==p&&other.status!=='applied'&&other.groups.some(c=>p.groups.includes(c))))p.attention='Prüfvorschläge überlappen · einen davon als Alternative kennzeichnen';
 for(const option of options)option.replaces=proposals.filter(p=>p.groups.some(c=>option.groups.includes(c))).map(p=>p.id);
 const small=occupied.filter(g=>g.starts<=2).map(g=>{const main=proposals.find(p=>!p.attention&&p.groups.includes(g.code)),option=options.find(p=>!p.attention&&p.groups.includes(g.code));let note=main?'Prüfvorschlag oben · Zustimmung noch offen':option?'Alternative mit Zustimmung · siehe Optionen':g.starts===1?'Noch kein passender Gegner · Nachmeldung / Einzelfall mit Leitung klären':'Eigene Gegner vorhanden · eigenständig belassen';if(['B4 W','C6 W'].includes(g.code)&&!main)note='Eigenständig belassen: jeweils eigene Gegner. Zusammenlegung würde die Kampfform von C6 W ändern.';return {code:g.code,starts:g.starts,status:g.starts===1?'solo':'opponents',note};});
 return {sourceRevision:s.revision,acceptedAt:s.registrationStatus?.lastApplied||null,regularUntil:s.event.regularUntil||'2026-10-21T23:59:59+02:00',provisional:!s.event.published,groups,proposals,options,small,totals:{starts:occupied.reduce((a,g)=>a+g.starts,0),teams:occupied.reduce((a,g)=>a+g.teams,0),occupied:occupied.length,solo:solo.length}};
}
