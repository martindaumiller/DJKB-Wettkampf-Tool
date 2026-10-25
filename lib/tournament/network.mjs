// Network relief is an authenticated application gate, not a firewall or LAN server.
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export const networkProfiles={
 normal:{label:'Normalbetrieb',publicMs:2500,coachMs:2500,staffMs:1000,screenMs:650,video:true,push:true,background:true},
 slow:{label:'Zuschauer drosseln',publicMs:15000,coachMs:6000,staffMs:1000,screenMs:1000,video:true,push:true,background:false},
 competition:{label:'Nur Wettkampfgeräte',publicMs:60000,coachMs:60000,staffMs:1000,screenMs:1000,video:false,push:false,background:false},
 diagnostic:{label:'Sparsamer Diagnosebetrieb',publicMs:60000,coachMs:60000,staffMs:2000,screenMs:1500,video:false,push:false,background:false}
};
export function networkState(s,u,now=Date.now()){
 const raw=s?.network||{},mode=networkProfiles[raw.mode]&&(!raw.until||raw.until>now)?raw.mode:'normal',p=networkProfiles[mode],staff=['admin','table','stream'].includes(u?.role);
 return {mode,...p,until:mode==='normal'?null:raw.until||null,pollMs:staff?p.staffMs:u?.role==='trainer'?p.coachMs:p.publicMs,serverTime:now};
}
export function setNetwork(s,u,a){
 if(u?.role!=='admin')throw fail('Notfallbetrieb nur durch Wettkampfleitung',403);
 if(!Object.hasOwn(networkProfiles,a.mode)||![15,30,60,120].includes(a.minutes??60))throw fail('Notfallprofil und Dauer 15–120 Minuten wählen');
 s.network={mode:a.mode,until:a.mode==='normal'?null:Date.now()+(a.minutes??60)*60000,changedAt:new Date().toISOString()};
 return {network:networkState(s,u)};
}
export function networkDenial(s,u,path,now=Date.now()){
 const p=networkState(s,u,now),staff=['admin','table','stream'].includes(u?.role);
 // Capabilities on display / timer routes are checked by their own narrow handlers.
 if(staff||['login','logout','owner','test-role','network-state','display-state','timekeeper-state','timekeeper-action','camera'].includes(path))return null;
 if(['competition','diagnostic'].includes(p.mode))return {error:'Notfallbetrieb: Zugriff für Publikum und Coaches vorübergehend pausiert. Wettkampfgeräte bleiben verbunden.',network:p,retryAfter:60};
 return null;
}
const prepared=new WeakSet();
export async function throttleAudience(db,s,u,request,scope){
 const p=networkState(s,u);if(p.mode!=='slow'||['admin','table','stream'].includes(u?.role))return 0;
 if(!prepared.has(db)){await db.prepare('CREATE TABLE IF NOT EXISTS tournament_network_limits (key TEXT PRIMARY KEY, at INTEGER NOT NULL)').run();prepared.add(db);}
 const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||'unknown',bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope+'|'+ip+'|'+(u?.id||(/^[a-f0-9-]{36}$/.test(request.headers.get('x-sdm-client')||'')?request.headers.get('x-sdm-client'):'public')))),key=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join(''),now=Date.now();
 // Persisted per-device window across Workers. Competition-only admission still requires real staff authentication or scoped capabilities.
 const r=await db.prepare('INSERT INTO tournament_network_limits(key,at) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET at=excluded.at WHERE tournament_network_limits.at<=?').bind(key,now,now-p.pollMs).run();
 if(!r.meta.changes)return Math.ceil(p.pollMs/1000);
 await db.prepare('DELETE FROM tournament_network_limits WHERE at<?').bind(now-120000).run();return 0;
}
export function networkResponse(body,status=503,retry=60){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Retry-After':String(retry),'X-Content-Type-Options':'nosniff'}});}
