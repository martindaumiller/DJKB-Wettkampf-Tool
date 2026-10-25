import {C,perform,stateFor,recordBoutAction,screenState,timekeeperState,planningAdvice,reportResponse,createFixture,createHash} from '../../engine.js';
const KEY='djkb-full-demo-v1',LOCK='djkb-full-demo-writer-v1',schema=1;
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','x-server-time':String(Date.now())}});
let channel;try{channel=new BroadcastChannel(KEY);}catch{}
const digest=value=>createHash('sha256').update(value).digest('hex');
const fresh=()=>({schema,model:createFixture(),receipts:[],audit:[],screens:[],timekeepers:[]});
function read(){
 let raw;try{raw=localStorage.getItem(KEY);}catch{throw fail('Browserspeicher nicht verfügbar. Vollständiges Tool am lokalen Hallenserver öffnen.',503);}
 if(!raw){const value=fresh();write(value);return value;}
 let value;try{value=JSON.parse(raw);}catch{throw fail('Gespeicherte Turnierprobe ist beschädigt. Probe über die Kopfzeile neu anlegen.',503);}
 if(value.schema!==schema||!Array.isArray(value.model?.bouts)||!Array.isArray(value.receipts))throw fail('Turnierprobe hat ein anderes Format. Probe neu anlegen.',503);
 return value;
}
function write(value){try{localStorage.setItem(KEY,JSON.stringify(value));}catch{throw fail('Nicht gespeichert: Browserspeicher voll oder gesperrt. Eingabe unverändert erneut prüfen.',503);}}
function role(s){
 const q=new URLSearchParams(location.search),name=q.get('demoRole')||sessionStorage.getItem(KEY+':role')||'tisch1';
 if(name==='leitung')return {id:'demo-admin',name:'Probe-Leitung',role:'admin'};
 if(/^tisch[1-5]$/.test(name))return {id:'demo-'+name,name:'Probe-Tisch '+name.slice(-1),role:'table',tatami:Number(name.slice(-1))};
 if(name==='coach')return {id:'demo-coach',name:'Probe-Coach',role:'trainer',dojo:s.dojos[0]?.name};
 if(name==='regie')return {id:'demo-stream',name:'Probe-Regie',role:'stream'};
 return {id:'demo-public',name:'Probe-Publikum',role:'public'};
}
function database(env){
 return {prepare(sql){let args=[];const stmt={bind(...a){args=a;return stmt;},async run(){if(/^CREATE TABLE/.test(sql))return {};throw fail('Diese Datenbankaktion ist nur am Hallenserver verfügbar.',403);},async first(){
 if(sql.includes('tournament_screens'))return env.screens.find(row=>row.key===args[0]&&row.scope===args[1]&&row.run===args[2]&&row.expires>args[3])||null;
 if(sql.includes('tournament_timekeepers'))return env.timekeepers.find(row=>row.key===args[0]&&row.scope===args[1]&&row.run===args[2]&&row.expires>args[3])||null;
 if(sql.includes('tournament_cameras'))return null;
 throw fail('Diese Datenbankabfrage ist nur am Hallenserver verfügbar.',403);
 }};return stmt;}};
}
async function execute(url,options={}){
 const u=new URL(url,location.href),path=u.pathname.split('/api/')[1];
 if(u.origin!==location.origin||!path||!u.pathname.includes('/demo/tool/'))throw fail('Die Turnierprobe darf nur ihre eigenen Beispieldaten verwenden.',403);
 if(options.method&& !['GET','POST'].includes(options.method))throw fail('Nur Lesen oder JSON-Befehle erlaubt.',405);
 if(path==='demo-reset'&&options.method==='POST'){const next=fresh();write(next);channel?.postMessage({changed:true});return response({ok:true});}
 const env=read(),s=env.model,user=role(s),ctx={accounts:[],audit:env.audit,ownerId:'demo-admin',makeUser(){throw fail('Echte Konten werden am Hallenserver eingerichtet.',403);}};
 let a={};if(options.body)try{a=JSON.parse(options.body);}catch{throw fail('Ungültige JSON-Eingabe.');}
 if(!options.method||options.method==='GET'){
  if(path==='push-config')return response({available:false,practice:true});
  if(path==='network-state')return response({network:stateFor(s,user,ctx).network});
  if(path==='display-state')return response(await screenState(database(env),s,u.searchParams.get('screen'),'demo',{}));
  if(path==='timekeeper-state')return response(await timekeeperState(database(env),s,u.searchParams.get('access'),'demo'));
  if(['print','winners'].includes(path))return reportResponse(new Request(u),s,user);
  if(path==='public-export')return response(C.publicView(s));
  if(path==='coach-contacts')return response({contacts:[]});
  if(!['state','public-state'].includes(path))throw fail('Diese Online-Anbindung ist nur am lokalen Hallenserver verfügbar.',403);
  return response({...stateFor(s,path==='state'?user:null,ctx),practice:true,practiceReady:true,runId:s.runId,user,csrf:'browser-demo',serverTime:Date.now(),ownerAvailable:false,authMode:'browser-demo',canReset:user.role==='admin'});
 }
 const commandId=a.commandId||null,signature=digest(JSON.stringify(a)),receipt=env.receipts.find(r=>r.id===commandId&&r.actor===user.id);
 if(receipt){if(receipt.signature!==signature)throw fail('Befehls-ID wurde für eine andere Eingabe verwendet.',409);return response(receipt.result);}
 if(['practice-reset','practice-reset-current','practice-create','demo-reset'].includes(path)){
  if(user.role!=='admin'&&path!=='demo-reset')throw fail('Nur Probe-Leitung kann die Probe zurücksetzen.',403);
  const next=fresh();next.model.revision=s.revision+1;write(next);channel?.postMessage({changed:true});return response({ok:true});
 }
 if(path==='logout'){sessionStorage.setItem(KEY+':role','publikum');return response({ok:true});}
 if(path==='test-role'||path==='login'){const value=a.role==='admin'?'leitung':a.role==='table'?'tisch'+a.tatami:a.role==='trainer'?'coach':a.role==='stream'?'regie':'publikum';sessionStorage.setItem(KEY+':role',value);return response({ok:true});}
 if(path==='display-create'||path==='timekeeper-create'){
  const tatami=user.role==='table'?user.tatami:Number(a.tatami);
  if(!['admin','table'].includes(user.role)||![1,2,3,4,5].includes(tatami))throw fail('Tisch oder Leitung wählen.',403);
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),expires=Date.now()+43200000,row={key:digest(token),scope:'demo',run:s.runId||'initial',tatami,actor:user.id,expires};
  if(path==='display-create'){env.screens.push(row);write(env);return response({screen:token,tatami,expires});}
  env.timekeepers=env.timekeepers.filter(r=>r.tatami!==tatami);if(a.revoke){write(env);return response({revoked:true});}env.timekeepers.push(row);write(env);return response({access:token,tatami,expires});
 }
 if(path==='planning-preview')return response(planningAdvice(s,a.options));
 if(!['action','timekeeper-action'].includes(path))throw fail('E-Mail, Konten, Onlinevideo und externe Dienste werden am Hallenserver angeschlossen. Die Turnierprobe verwendet ausschließlich Beispieldaten.',403);
 if(!commandId)throw fail('Befehls-ID fehlt.');
 if(a.expectedRun!==s.runId)throw fail('Turnierprobe wurde neu begonnen. Aktuellen Stand laden.',409);
 let actor=user,action=a;
 if(path==='timekeeper-action'){
  const view=await timekeeperState(database(env),s,a.access,'demo');
  if(!view.bout?.enabled||view.bout.id!==a.bout)throw fail('Für diese Begegnung gibt es keine freie Kumite-Zeitnahme.',409);
  actor={id:'demo-timer',name:'Probe-Zeitnehmer',role:'table',tatami:view.tatami};action={type:'bout',bout:a.bout,version:a.version,action:'timer',running:a.running,eventAt:a.eventAt};
 }
 if(action.type!=='bout'&&a.expectedRevision!==s.revision)throw fail('Die Turnierprobe wurde in einem anderen Tab geändert. Aktuellen Stand prüfen.',409);
 const before=s.bouts.find(b=>b.id===action.bout),snapshot=before?structuredClone(before):null;
 if(snapshot)delete snapshot.actions;
 const result=perform(s,actor,action,ctx),changed=s.bouts.find(b=>b.id===action.bout);
 if(changed&&snapshot)recordBoutAction(changed,actor.name,action,snapshot);
 s.revision++;env.audit.push({at:new Date().toISOString(),actor:actor.name,action:action.type,body:action});env.audit=env.audit.slice(-100);
 const value={...result,ok:true,revision:s.revision,serverTime:Date.now(),...(changed?{version:changed.version,timer:changed.timer}:{})};
 env.receipts.push({id:commandId,actor:user.id,signature,result:value});env.receipts=env.receipts.slice(-300);
 write(env);channel?.postMessage({changed:true});return response(value);
}
export async function demoFetch(url,options={}){
 const read=(!options.method||options.method==='GET');
 try{
  if(options.signal?.aborted)throw new DOMException('Abgebrochen','AbortError');
  if(!read&&!navigator.locks?.request)throw fail('Dieser Browser unterstützt keine gesicherte Schreibkoordination zwischen Tabs. Aktuellen Browser oder lokalen Hallenserver verwenden.',503);
  return await navigator.locks.request(LOCK,{mode:'exclusive'},()=>execute(url,options));
 }catch(e){return response({error:e.message,serverTime:Date.now()},e.status||400);}
}
export async function resetDemo(){return demoFetch(new URL('./api/demo-reset',import.meta.url),{method:'POST',body:'{}'});}
