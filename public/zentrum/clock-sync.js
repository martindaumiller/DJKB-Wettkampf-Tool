// Server epoch anchored to a monotonic clock. Prefer the least delayed sample.
export class ClockSync {
 constructor(mono=()=>performance.now(),wall=()=>Date.now()){this.mono=mono;this.wall=wall;this.samples=[];this.anchor=null;}
 observe(serverTime,sent,received=this.mono()){if(!Number.isFinite(serverTime)||received<sent)return;this.samples.push({rtt:received-sent,offset:serverTime-(sent+received)/2,at:received});this.samples=this.samples.filter(s=>received-s.at<60000).slice(-30);const best=this.samples.reduce((a,b)=>a.rtt<=b.rtt?a:b);this.anchor=best.offset;this.uncertainty=best.rtt/2;}
 now(){return this.anchor===null?this.wall():this.mono()+this.anchor;}
}
export const remainingAt=(timer,now)=>Math.max(0,(timer?.remaining||0)-(timer?.since?Math.max(0,now-timer.since):0));
export function timerButtons(timer,now,enabled=true){return {start:!!enabled&&!timer?.since&&remainingAt(timer,now)>0,stop:!!enabled&&!!timer?.since};}
export function previewTimer(timer,running,at){return {...timer,remaining:remainingAt(timer,at),since:running?at:null};}
