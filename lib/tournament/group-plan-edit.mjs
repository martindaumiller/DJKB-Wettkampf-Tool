import {publicGroupPlan} from './group-plan.mjs';
import {combinationPreview} from '../../public/zentrum/group-combine62.js';

export function editGroupPlan(s,a){
 const id=String(a.id||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Ungültiger Vorschlag');
 const edits=s.groupPlanEdits||[],previous=edits.find(p=>p.id===id),known=[...publicGroupPlan(s).proposals,...publicGroupPlan(s).options].find(p=>p.id===id);
 if(a.op==='reset'){if(!previous)return {changed:0};const restored=previous.hidden&&previous.manual?{...previous,editedAt:new Date().toISOString()}:null;if(restored)delete restored.hidden;s.groupPlanEdits=[...edits.filter(p=>p.id!==id),...(restored?[restored]:[])];return {changed:1};}
 let next;
 if(a.op==='hide'){if(!known&&!previous)throw Error('Vorschlag fehlt');next={...(previous||{}),id,hidden:true};}
 else if(a.op==='save'){
  if(!Array.isArray(a.groups)||a.groups.length<2||a.groups.length>12||new Set(a.groups).size!==a.groups.length||!a.groups.includes(a.target))throw Error('Zwei bis zwölf unterschiedliche Gruppen und eine Zielgruppe wählen');
  const gs=a.groups.map(code=>s.groups.find(g=>g.code===code));if(gs.some(g=>!g?.active)||gs.some(g=>g.type!==gs[0].type))throw Error('Nur aktive Gruppen derselben Disziplin wählen');
  if(gs.some(g=>g.ratified||s.bouts.some(b=>b.group===g.code&&b.started)))throw Error('Begonnene Gruppen bleiben geschützt');
  for(const [key,max] of [['title',200],['note',1200],['description',1600]])if(typeof a[key]!=='string'||!a[key].trim()||a[key].length>max)throw Error('Bezeichnung, Hinweis und gemeinsames Wettkampfprogramm vollständig angeben');
  if(!['proposal','option'].includes(a.kind))throw Error('Vorschlag oder Option wählen');
  const p=combinationPreview(s,a.groups,a.description);if(!p.mixedAllowed)throw Error('Mixed ist hier nur für Kata und Kihon-Ippon vorgesehen. Gemeinsames Programm prüfen.');
  next={id,groups:[...a.groups],target:a.target,title:a.title.trim(),note:a.note.trim(),description:a.description.trim(),option:a.kind==='option',manual:true};
 }
 else throw Error('Unbekannte Planänderung');
 const stable=p=>JSON.stringify(p&&Object.fromEntries(Object.entries(p).filter(([k])=>k!=='editedAt')));
 if(stable(previous)===stable(next))return {changed:0};
 s.groupPlanEdits=[...edits.filter(p=>p.id!==id),{...next,editedAt:new Date().toISOString()}];return {changed:1,id};
}
