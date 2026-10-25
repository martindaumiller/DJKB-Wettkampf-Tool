import {forecast} from './forecast.mjs';
import * as C from './core.mjs';
import {groupBelts} from '../../public/zentrum/belts.js';

const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,structuredClone(o[k])]));
const number=(v,f,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;

// A new, anonymised rehearsal. No references to the live model are retained.
export function currentTournamentCopy(source,options={}){
 const s=C.init(source.groups),warnings=[],dojoNames=new Map(source.dojos.map((d,i)=>[d.name,'Testdojo '+(i+1)]));
 const dojo=name=>{if(!dojoNames.has(name))dojoNames.set(name,'Testdojo '+(dojoNames.size+1));return dojoNames.get(name);};
 s.event={...s.event,...pick(source.event,['date','startTime','earlyLetters','rest','awardsBreak','minutes','buffer','continuous','kihonScoring','kataJudges','kataTeamJudges','teamPairing','kumiteBronze','repeatKihon','repeatJiyuIppon']),name:'Simulation des aktuellen Turniers',demo:true,published:true,stage:6};
 delete s.event.contact;
 s.event.buffer=number(options.bufferPercent,(s.event.buffer||1.15)*100,100,200)/100;
 const invalidBirths=new Set();s.people=source.people.map((p,i)=>{let age;try{age=C.age(p.birth);}catch{invalidBirths.add(p.id);age=20;}return {id:p.id,first:'Teststarter',last:String(i+1).padStart(3,'0'),birth:(2026-age)+'-01-01',birthVerified:true,gender:p.gender,kyu:p.kyu,dojo:dojo(p.dojo),cadre:!!p.cadre,seed:p.seed||0,blocked:!!p.blocked};});
 s.entries=source.entries.map(e=>({...pick(e,['id','personId','group','kind','active','originalGroup']),exception:e.exception?'Übernommene Ausnahme':''}));
 s.teams=source.teams.map((t,i)=>({id:t.id,name:'Testteam '+(i+1),dojo:dojo(t.dojo),memberIds:[...(t.memberIds||[])],members:[],verified:true}));
 s.groups=source.groups.map(g=>({...pick(g,['code','type','description','gender','minAge','maxAge','minKyu','maxKyu','active','phase','tatami','order','finalists','pools','qualifiersPerPool','poolTatamis','kataMode','duration','finalDuration','bronze','scoring','finalTiming','sourceGroups','mergedInto','poolConfigured','bronzeConfigured','judgeCount']),draw:null,podium:[],ratified:false,...(g.statusReason?{statusReason:'Übernommene Gruppenänderung'}:{})}));
 s.queue=structuredClone(source.queue||[]);s.tatamis=s.tatamis.map(t=>({...t,orientation:source.tatamis.find(x=>x.id===t.id)?.orientation||0}));
 const held=new Set(Object.keys(source.medicalHolds||{}));
 for(const g of s.groups.filter(g=>g.active)){
  const es=s.entries.filter(e=>e.group===g.code&&e.active);if(!es.length)continue;
  const ids=es.flatMap(e=>e.kind==='team'?s.teams.find(t=>t.id===e.personId)?.memberIds||[]:[e.personId]);
  if(ids.some(id=>invalidBirths.has(id))){warnings.push(g.code+': ungültiges Geburtsdatum. Gruppe in der Simulation ausgelassen.');for(const e of es)e.active=false;continue;}
  if(ids.some(id=>held.has(id)||source.people.find(p=>p.id===id)?.blocked)){
   warnings.push(g.code+': ärztliche oder sonstige Teilnahmesperre. Gruppe in der Simulation ausgelassen.');for(const e of es)e.active=false;continue;
  }
  const pending=es.filter(e=>e.kind==='team'&&(!source.teams.find(t=>t.id===e.personId)?.verified||source.teams.find(t=>t.id===e.personId)?.memberIds?.length!==3));if(pending.length)warnings.push(g.code+': '+pending.length+' Teams noch ungeprüft / unvollständig. Fehlende Mitglieder sind Test-Platzhalter; mögliche Überschneidungen bleiben unbekannt.');
  for(const e of es.filter(e=>e.kind==='team')){
   const t=s.teams.find(t=>t.id===e.personId);if(!t)continue;
   while(t.memberIds.length<3){const p={id:C.uid(),simulationPlaceholder:true,first:'Testmitglied',last:String(s.people.length+1),birth:(2026-g.minAge)+'-01-01',birthVerified:true,gender:g.gender==='x'?'w':g.gender,kyu:g.minKyu,dojo:t.dojo,cadre:false};s.people.push(p);t.memberIds.push(p.id);}
   t.members=t.memberIds.map(id=>{const p=s.people.find(p=>p.id===id);return p?p.first+' '+p.last:'Testmitglied';});
  }
  const original=source.groups.find(x=>x.code===g.code);
  try{C.draw(s,g.code,'simulation-'+source.revision+'-'+g.code,original.draw?.slots||null);}
  catch(e){warnings.push(g.code+': nicht simulierbar – '+String(e.message).replace(/Teststarter \d+/g,'Athlet'));s.bouts=s.bouts.filter(b=>b.group!==g.code);g.draw=null;for(const e of es)e.active=false;}
 }
 s.dojos=[...dojoNames.values()].map(name=>({id:C.uid(),name}));
 if(source.deferredJobs&&Object.keys(source.deferredJobs).length)warnings.push('Zurückgestellte Pools werden in der Simulation regulär eingeplant.');
 return {model:s,warnings,sourceRevision:source.revision};
}

export function simulationForecast(s,{warnings=[],sourceRevision=null,callSeconds=45}={}){
 const copy=structuredClone(s),f=forecast(copy,{fromStart:true,callSeconds}),jobs=f.jobs;
 return {...f,sourceRevision,created:new Date().toISOString(),warnings,groups:copy.groups.filter(g=>g.active&&g.draw).map(g=>({code:g.code,type:g.type,description:g.description,starts:copy.entries.filter(e=>e.active&&e.group===g.code).length,pools:g.pools,tatamis:[...new Set(jobs.filter(j=>j.group===g.code).map(j=>j.tatami))],belts:groupBelts(copy,g),sourceGroups:g.sourceGroups||[],finalTiming:g.finalTiming||'block'})),changed:copy.groups.filter(g=>!g.active||g.sourceGroups?.length).map(g=>pick(g,['code','active','mergedInto','sourceGroups'])),complete:false,simulated:0};
}
