import {createHash} from 'node:crypto';
import * as C from './core.mjs';
import {kataTieCompare,tieKey} from './kata-ties.mjs';

export const isKata = g => [0,2].includes(g?.type);
export function kataReviewKey(s,g,rows){
 const value=[s.runId||null,g.draw,g.code,g.kataMode,g.qualifiersPerPool,g.finalists,
  rows.map(b=>[b.id,b.version,b.status,b.aka,b.shiro,b.winner,b.loser,b.judges,b.kata,b.reason,C.tatami(s,b),[b.aka,b.shiro].filter(Boolean).map(id=>{const e=C.ent(s,id);return [id,e?.name,e?.dojo,e?.active];})]),g.kataTieRounds||[],g.tieDecision||null];
 return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function kataReviewed(s,g,rows){
 if(!rows.length||rows.some(b=>b.status!=='done'))return false;
 const review=g.kataReviews?.[C.jobId(g,rows[0])];
 return !!review&&review.key===kataReviewKey(s,g,rows)&&review.listChecked===true&&review.ombudsmanChecked===true;
}
export function kataHandoverReady(s,g){
 if(!isKata(g))return true;
 const bs=s.bouts.filter(b=>b.group===g.code);
 if(!bs.length||bs.some(b=>b.status!=='done')||g.tie||!g.podium?.length)return false;
 const final=bs.filter(b=>b.final),jobs=[...new Set((final.length?final:bs).map(b=>C.jobId(g,b)))];
 return jobs.every(job=>kataReviewed(s,g,bs.filter(b=>C.jobId(g,b)===job)));
}
export function assertKataHandover(s,g){
 if(!kataHandoverReady(s,g))throw Error(g.code+': Abschlussliste zuerst am Tisch prüfen, Stechen abschließen und mit dem Ombudsmann abgleichen. Danach an die Wettkampfleitung übergeben.');
}
export function kataRanking(s,g,rows){
 const bs=s.bouts.filter(b=>b.group===g.code&&b.kind==='points'&&b.aka&&!!b.final===!!rows[0]?.final&&b.reason!=='Kiken'&&[5,7].includes(b.judges?.length));
 const compare=(a,b)=>kataTieCompare(g,bs,a,b)||(g.tieDecision?.order?g.tieDecision.order.indexOf(a.aka)-g.tieDecision.order.indexOf(b.aka):0);
 const scored=rows.filter(b=>bs.includes(b)).map(b=>({...b,result:C.kataScore(b.judges)})).sort(compare);
 let place=0;
 return scored.map((b,i)=>{
  if(!i||compare(scored[i-1],b)!==0)place=i+1;
  const e=C.ent(s,b.aka),ties=(g.kataTieRounds||[]).filter(r=>r.base===tieKey(bs)).flatMap(r=>r.performances.filter(p=>p.entry===b.aka));
  return {id:b.aka,bout:b.id,name:e?.name||'',dojo:e?.dojo||'',place,total:b.result.total/10,low:b.result.low/10,high:b.result.high/10,kata:b.kata,judges:[...b.judges],ties:ties.map(p=>({kata:p.kata,judges:[...p.judges],total:C.kataScore(p.judges).total/10}))};
 });
}
