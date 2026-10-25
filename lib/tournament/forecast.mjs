import * as C from './core.mjs';
import {jobAthletes} from './job-athletes.mjs';
const bounded=(v,f,min,max)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
export function forecast(s,{fromStart=false,callSeconds=45,bufferPercent,now=Date.now()}={}){
 const copy=structuredClone(s);if(fromStart)copy.event.stage=0;copy.event.buffer=bounded(bufferPercent,(copy.event.buffer||1.15)*100,100,200)/100;
 const call=bounded(callSeconds,45,0,300)/60,queue=C.playlist(copy),byJob=new Map(queue.map(q=>[q.id,q])),byBout=new Map(copy.bouts.map(b=>[b.id,b]));
 const rows=C.schedule(copy,{fromStart,now}),peopleFree=new Map(),matFree=new Map(),finished=new Map(),jobs=[];let previousPhase=-1,phaseFloor=0;
 if(!fromStart)for(const b of copy.bouts.filter(b=>b.status==='done'&&b.ended))for(const id of [b.aka,b.shiro].flatMap(id=>C.members(copy,id)))peopleFree.set(id,Math.max(peopleFree.get(id)||0,Date.parse(b.ended)+(copy.event.rest||0)*60000));
 for(const row of rows){
  if(row.type==='break'){
   if(!rows.some(j=>j.tatami&&j.phase>row.phase))continue;
   const start=Math.max(Date.parse(row.start),...matFree.values()),end=start+(row.minutes||0)*60000;for(const t of copy.tatamis)matFree.set(t.id,end);jobs.push({...row,start:new Date(start).toISOString(),end:new Date(end).toISOString()});continue;
  }
  if(row.phase!==previousPhase){previousPhase=row.phase;if(!copy.event.continuous)phaseFloor=Math.max(0,...matFree.values());}
  const g=copy.groups.find(g=>g.code===row.group),q=byJob.get(row.job)||row,pending=copy.bouts.filter(b=>b.group===g.code&&b.status!=='done'&&C.jobId(g,b)===q.id),ids=jobAthletes(copy,g,{...q,pending});
  const deps=new Set(pending.flatMap(b=>b.sources||[]).map(id=>byBout.get(id)).filter(Boolean).map(b=>C.jobId(g,b)).filter(id=>id!==q.id));
  if(q.anticipated||!q.pool)for(const j of queue.filter(j=>j.group===g.code&&j.pool&&j.id!==q.id&&j.phase<=q.phase))deps.add(j.id);
  const prior=Math.max(Date.parse(row.start),matFree.get(row.tatami)||0,phaseFloor,...[...deps].map(id=>finished.get(id)||0)),athleteFloor=Math.max(0,...ids.map(id=>peopleFree.get(id)||0)),start=Math.max(prior,athleteFloor),minutes=row.minutes+call,end=start+minutes*60000;
  jobs.push({...row,start:new Date(start).toISOString(),end:new Date(end).toISOString(),minutes:Math.round(minutes*10)/10,athleteWaitMinutes:Math.round(Math.max(0,athleteFloor-prior)/6000)/10,poolAssignmentEstimated:!g.draw&&(g.pools||1)>1});matFree.set(row.tatami,end);finished.set(q.id,end);
  for(const id of ids)peopleFree.set(id,end+(copy.event.rest||0)*60000);
 }
 const work=jobs.filter(j=>j.tatami),start=work.length?Math.min(...work.map(j=>Date.parse(j.start))):null,end=work.length?Math.max(...work.map(j=>Date.parse(j.end))):null;
 const tatamis=copy.tatamis.map(t=>{const own=work.filter(j=>j.tatami===t.id),last=own.length?Math.max(...own.map(j=>Date.parse(j.end))):null;return {tatami:t.id,closed:!!t.deskClosed,paused:!!t.paused,jobs:own.length,workMinutes:Math.round(own.reduce((n,j)=>n+j.minutes,0)),end:last?new Date(last).toISOString():null};});
 return {sourceRevision:s.revision,fromStart,jobs,start:start?new Date(start).toISOString():null,end:end?new Date(end).toISOString():null,minutes:start?Math.round((end-start)/60000):0,tatamis,assumptions:{bufferPercent:Math.round(copy.event.buffer*100),callSeconds:Math.round(call*60),restMinutes:copy.event.rest||0,minutes:copy.event.minutes,conservativeAthleteBlocks:true,parallelPools:true,estimatedUndrawnPools:jobs.some(j=>j.poolAssignmentEstimated)}};
}
