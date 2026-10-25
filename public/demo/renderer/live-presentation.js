// The same score interpretation is used by the hall display and the encoded video.
export function kataView(b){
 const preview=b?.status==='live'&&b.kataPreview?.version===b.version?b.kataPreview:null;
 const values=preview?.judges||b?.judges||[],complete=[5,7].includes(values.length)&&values.every(n=>typeof n==='number');
 const sorted=complete?values.map(n=>Math.round(n*10)).sort((a,b)=>a-b):[];
 return {kata:preview?.kata||b?.kata||'',values,complete,provisional:!!preview,total:complete?sorted.slice(1,-1).reduce((a,b)=>a+b,0)/10:null};
}
export const registrationNoticeVisible=(now=Date.now())=>now>=Date.parse('2026-10-19T00:00:00+02:00');
export function presentationChannel(){
 const q=new URLSearchParams(location.search),scope=q.get('test')||q.get('practice')||'live';
 try{return new BroadcastChannel('sdm-presentation:'+scope);}catch{return null;}
}
