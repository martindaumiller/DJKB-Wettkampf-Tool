export const registrationMultiplier=(s,at)=>{const time=Date.parse(at||'');return Number.isFinite(time)&&time>Date.parse(s.event.regularUntil||'2026-10-21T23:59:59+02:00')?(s.event.lateMultiplier||2):1;};
export const entryCents=e=>(e.kind==='team'?3000:1500)*([1,1.5,2,2.5,3].includes(e.feeMultiplier)?e.feeMultiplier:1);
