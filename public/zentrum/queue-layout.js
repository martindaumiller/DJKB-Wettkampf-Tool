export const disciplineStyles=[
 {key:'kata',label:'Kata Einzel'},
 {key:'kumite',label:'Kumite Einzel'},
 {key:'kata-team',label:'Kata-Team'},
 {key:'kumite-team',label:'Kumite-Team'}
];
export const genderStyles={m:{key:'male',label:'Männlich'},w:{key:'female',label:'Weiblich'},x:{key:'mixed',label:'Mixed'}};
export const queuePeriod=phase=>phase<3?'morning':'afternoon';
// Return a server-compatible insertion point. Completed jobs never participate.
export function queuePlacement(jobs,job,tatami,phase,target=null,after=false){
 const source=jobs.find(q=>q.id===job);if(!source||source.status==='done'||source.phase!==Number(phase)||![1,2,3,4,5].includes(Number(tatami)))return null;
 const oldPeers=jobs.filter(q=>q.tatami===source.tatami&&q.phase===source.phase&&q.status!=='done'),oldNext=oldPeers[oldPeers.findIndex(q=>q.id===job)+1]?.id||null;
 if(target===job)return {job,tatami:source.tatami,before:oldNext,noop:true};
 const peers=jobs.filter(q=>q.tatami===Number(tatami)&&q.phase===source.phase&&q.status!=='done'&&q.id!==job);let before=null;
 if(target){const index=peers.findIndex(q=>q.id===target);if(index<0)return null;before=after?peers[index+1]?.id||null:target;}
 return {job,tatami:Number(tatami),before,noop:source.tatami===Number(tatami)&&before===oldNext};
}
