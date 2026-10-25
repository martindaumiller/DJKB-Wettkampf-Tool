import * as C from './core.mjs';
export const tieKey=bs=>JSON.stringify(bs.map(b=>[b.id,b.aka,b.judges]).sort((a,b)=>a[0].localeCompare(b[0])));
export function kataTieCompare(g,bs,a,b){
 let d=C.compare(a.result,b.result);if(d)return d;
 for(const r of g.kataTieRounds||[]){if(r.base!==tieKey(bs))continue;const x=r.performances.find(p=>p.entry===a.aka),y=r.performances.find(p=>p.entry===b.aka);if(x&&y){d=C.compare(C.kataScore(x.judges),C.kataScore(y.judges));if(d)return d;}}
 return 0;
}
export function tieGroups(s,g){
 const bs=s.bouts.filter(b=>b.group===g.code&&b.kind==='points'&&b.aka&&b.final===(g.tieStage!=='prelim')&&b.reason!=='Kiken'&&[5,7].includes(b.judges?.length)),scored=bs.map(b=>({...b,result:C.kataScore(b.judges)}));
 const buckets=[];for(const b of scored){let row=buckets.find(xs=>(g.tieStage!=='prelim'||xs[0].pool===b.pool)&&kataTieCompare(g,bs,xs[0],b)===0);if(row)row.push(b);else buckets.push([b]);}return {bs,groups:buckets.filter(xs=>xs.length>1)};
}
export function recordKataTie(s,u,a){
 const g=s.groups.find(g=>g.code===a.group);if(!g?.tie)throw Error('Keine offene Stichkata');const {bs,groups}=tieGroups(s,g),ids=a.performances?.map(p=>p.entry)||[],tied=groups.find(xs=>xs.length===ids.length&&xs.every(b=>ids.includes(b.aka)));
 if(!tied||new Set(ids).size!==ids.length)throw Error('Eine vollständige Gruppe punktgleicher Starter werten');
 if(u.role==='table'&&(s.tatamis.find(t=>t.id===u.tatami)?.deskClosed||g.ratified||tied.some(b=>C.tatami(s,b)!==u.tatami||g.closedPools?.[b.pool?'pool-'+b.pool:'final'])))throw Object.assign(Error('Stichkata nur am zugehörigen offenen Tisch'),{status:403});
 if(a.base!==tieKey(bs))throw Object.assign(Error('Kata-Wertungen wurden inzwischen geändert. Neu prüfen.'),{status:409});
 for(const p of a.performances){if(!p.kata?.trim()||p.kata.length>80)throw Error('Ausgeführte Stichkata eintragen');C.kataScore(p.judges);}
 const rounds=g.kataTieRounds??=[];rounds.push({base:a.base,at:new Date().toISOString(),by:u.name,performances:structuredClone(a.performances)});g.tieDecision={reason:'Stichkata mit Einzelwertungen gemäß DJKB',at:new Date().toISOString()};C.refresh(s,g.code);return {remaining:!!g.tie};
}
