export const initialState=()=>({schema:1,revision:0,mode:'kumite',aka:0,shiro:0,remaining:120000,startedAt:null,status:'ready',scene:'fight',judges:[8.1,8,8.3,8.2,8.1],updated:Date.now()});
export function kataTotal(judges){if(!Array.isArray(judges)||![5,7].includes(judges.length)||judges.some(n=>!Number.isFinite(n)||n<0||n>9.9||Math.abs(n*10-Math.round(n*10))>.00001))throw Error('Fünf oder sieben Noten in Zehnteln von 0,0 bis 9,9 eingeben.');const a=judges.map(n=>Math.round(n*10)).sort((a,b)=>a-b);return a.slice(1,-1).reduce((x,y)=>x+y,0)/10;}
export function validState(s){try{kataTotal(s?.judges);}catch{return false;}return s?.schema===1&&['kumite','kata'].includes(s.mode)&&['ready','running','paused','finished'].includes(s.status)&&['fight','pause','next','ceremony'].includes(s.scene)&&Number.isInteger(s.revision)&&s.revision>=0&&Number.isInteger(s.aka)&&s.aka>=0&&s.aka<=20&&Number.isInteger(s.shiro)&&s.shiro>=0&&s.shiro<=20&&Number.isFinite(s.remaining)&&s.remaining>=0&&s.remaining<=120000&&(s.startedAt===null||Number.isFinite(s.startedAt))&&(s.mode!=='kata'||s.startedAt===null);}
export function remaining(s,now=Date.now()){return s.mode==='kata'?0:Math.max(0,s.remaining-(s.startedAt===null?0:Math.max(0,now-s.startedAt)));}
export function reduce(s,action,now=Date.now()){
 if(!validState(s))throw Error('Ungültiger Demostand. Demo neu beginnen.');
 if(['start','pause','clock'].includes(action.type)&&s.mode==='kata')throw Error('Kata hat keine Zeitnahme.');
 const n=structuredClone(s);n.revision++;n.updated=now;
 if(action.type==='score'){if(s.mode!=='kumite')throw Error('Kumite-Wertungen sind bei Kata gesperrt.');if(!['aka','shiro'].includes(action.side)||![-1,1,2].includes(action.value))throw Error('Ungültige Wertung');if(s.status==='finished')throw Error('Demo neu beginnen, um wieder zu werten.');n[action.side]=Math.max(0,Math.min(20,n[action.side]+action.value));}
 else if(action.type==='start'){if(s.status==='finished')throw Error('Demo neu beginnen.');if(s.startedAt===null){n.startedAt=now;n.status='running';}}
 else if(['pause','finish'].includes(action.type)){n.remaining=remaining(s,now);n.startedAt=null;n.status=action.type==='finish'?'finished':'paused';}
 else if(action.type==='clock'){n.startedAt=null;n.remaining=120000;n.status='ready';}
 else if(action.type==='mode'){if(!['kumite','kata'].includes(action.value))throw Error('Ungültiger Modus');n.mode=action.value;n.startedAt=null;n.remaining=120000;n.status='ready';n.scene='fight';}
 else if(action.type==='scene'){if(!['fight','pause','next','ceremony'].includes(action.value))throw Error('Ungültige Szene');n.scene=action.value;}
 else if(action.type==='judges'){if(s.mode!=='kata')throw Error('Zuerst Kata wählen.');if(s.status==='finished')throw Error('Demo neu beginnen.');kataTotal(action.value);n.judges=action.value;n.status='ready';}
 else if(action.type==='reset')return {...initialState(),revision:n.revision};
 else throw Error('Unbekannte Aktion');
 return n;
}
