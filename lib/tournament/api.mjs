import {recordBoutAction} from './action-history.mjs';
import {planningAdvice} from './planning-advisor.mjs';
import {readBundleSnapshot,invalidateBundleReads} from './bundle-read-cache.mjs';
import {cachedPublicRead} from './public-read-cache.mjs';
import {requestCoachCode,verifyCoachCode,coachUserValid,coachAccessView,inviteCoach,coachMailHealth} from './coach-auth.mjs';
import {networkState,networkDenial,throttleAudience,networkResponse} from './network.mjs';
import {createTimekeeper,timekeeperState,timekeeperAction} from './timekeeper.mjs';
import * as C from './core.mjs';
import {contactRows} from './operations.mjs';
import {reportResponse} from './reports.mjs';
import {notificationConfig,subscribe,pushTables,callEvents,changedCalls,eventStatements,flushPush,pushConfig} from './notifications.mjs';
import { perform, stateFor } from './commands.mjs';
import { fetchMailbox, previewMailbox } from './mail.mjs';
import {emergencyWorkbook} from './emergency.mjs';
import {canViewFees} from './management.mjs';
import {rehearsalModel} from './rehearsal.mjs';
import {newTestRoom,testRoomAPI} from './test-room.mjs';
import {previewRegistrations} from './registrations.mjs';
import {streamView} from './stream.mjs';
import {streamHandoff} from './stream-handoff.mjs';
import {archiveTournament,archiveMetadata,restartTournament,restoreTournament,validateRestart} from './reset.mjs';
import {billingView,issueInvoice,findInvoice,invoicePDF} from './invoices.mjs';
import {createScreen,screenState,cameraAPI} from './screens.mjs';
import groups from './groups.json' with {type:'json'};

const encoder=new TextEncoder();
const token=()=>crypto.randomUUID()+crypto.randomUUID();
const hex=a=>Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async x=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(x)));
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256));}
function same(a,b){let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0;}
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const cleanUser=u=>u?{id:u.id,name:u.name,role:u.role,tatami:u.tatami??null,dojo:u.dojo??null}:null;
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const cookie=request=>(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sdm_session='))?.slice(12);
const sessionCookie=(value,age=43200)=>'sdm_session='+value+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+age;
const initial=()=>({model:C.init(groups),owner:null,accounts:[],sessions:[],limits:[]});
const bootstrapAllowed=(env,identity)=>!!identity?.userId&&!!identity.email&&!!env.SDM_OWNER_EMAIL&&identity.email.toLocaleLowerCase('en')===env.SDM_OWNER_EMAIL.toLocaleLowerCase('en');

// Each commit replaces a bounded set of chunks in one D1 transaction. The
// revision comparison prevents lost updates even when requests reach different
// Worker instances. Chunking avoids the per-value size limit for tournament data.
export async function loadBundle(db,{readOnly=false}={}){for(let attempt=0;attempt<6;attempt++){
  let row=await db.prepare("SELECT revision,generation FROM tournament_state WHERE id='main'").first();
  if(!row){const generation=C.uid(),data=JSON.stringify(initial());await db.batch([
    db.prepare("INSERT OR IGNORE INTO tournament_state(id,revision,generation) VALUES('main',0,?)").bind(generation),
    db.prepare("INSERT OR IGNORE INTO tournament_chunks(generation,position,data) SELECT ?,0,? WHERE EXISTS(SELECT 1 FROM tournament_state WHERE id='main' AND generation=?)").bind(generation,data,generation)
  ]);continue;}
  const load=async()=>{const parts=await db.prepare('SELECT data FROM tournament_chunks WHERE generation=? ORDER BY position').bind(row.generation).all();return parts.results.length?parts.results.map(x=>x.data).join(''):null;};
  const bundle=readOnly?await readBundleSnapshot(db,row.generation,load):await load().then(data=>data?JSON.parse(data):null);
  if(bundle)return {revision:row.revision,bundle};
}throw error('Daten werden gerade geändert. Bitte erneut laden.',409);}
export async function commitBundle(db,revision,bundle,audit=null,command=null,pendingPush=[]){
  const generation=C.uid(),serialized=JSON.stringify(bundle),chunks=[];
  for(let i=0;i<serialized.length;){let end=Math.min(i+160000,serialized.length);if(end<serialized.length&&serialized.charCodeAt(end-1)>=0xD800&&serialized.charCodeAt(end-1)<=0xDBFF)end--;chunks.push(serialized.slice(i,end));i=end;}
  if(chunks.length>75)throw error('Wettkampfdaten zu groß. Export und technische Prüfung erforderlich.',413);
  const statements=[db.prepare("UPDATE tournament_state SET revision=revision+1,generation=? WHERE id='main' AND revision=?").bind(generation,revision)];
  for(let i=0;i<chunks.length;i++)statements.push(db.prepare("INSERT INTO tournament_chunks(generation,position,data) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM tournament_state WHERE id='main' AND generation=?)").bind(generation,i,chunks[i],generation));
  if(audit)statements.push(db.prepare("INSERT INTO tournament_audit(id,at,actor,action,body) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM tournament_state WHERE id='main' AND generation=?)").bind(C.uid(),new Date().toISOString(),audit.actor,audit.action,JSON.stringify(audit.body),generation));
  if(command)statements.push(db.prepare("INSERT INTO tournament_commands(id,actor,digest,response) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM tournament_state WHERE id='main' AND generation=?)").bind(command.id,command.actor,command.digest,JSON.stringify(command.response),generation));
  statements.push(...eventStatements(db,pendingPush,generation));
  statements.push(db.prepare("DELETE FROM tournament_chunks WHERE generation<>? AND EXISTS(SELECT 1 FROM tournament_state WHERE id='main' AND generation=?)").bind(generation,generation));
  const result=await db.batch(statements);if(result[0].meta.changes===1)invalidateBundleReads(db);return result[0].meta.changes===1;
}
async function auth(bundle,request,identity){
  if(identity?.userId&&identity.userId===bundle.owner?.id)return {user:bundle.owner,csrf:bundle.owner.csrf,mode:'chatgpt'};
  let raw=cookie(request);if(!raw)return {};
  let key=await digest(raw),session=bundle.sessions.find(s=>s.key===key&&s.expires>Date.now()),user=bundle.accounts.find(u=>u.id===session?.userId);
  return user&&coachUserValid(bundle.model,user)?{user,csrf:session.csrf,mode:'password',key}:{};
}
const requireAdmin=u=>{if(u?.role!=='admin')throw error('Nur Wettkampfleitung',403);};
function accountMaker(bundle,prepared){return (name,password,role,tatami,dojo)=>{
  name=String(name||'').trim();if(!name||name.length>80||!['admin','table','trainer','stream'].includes(role))throw error('Zugang mit gültigem Namen und Rolle wählen');
  if(!prepared||password.length<12)throw error('Passwort mindestens 12 Zeichen');
  if(role==='table'&&(!Number.isInteger(tatami)||tatami<1||tatami>5))throw error('Tatami 1–5');
  if(role==='trainer'&&!bundle.model.dojos.some(d=>d.name===dojo))throw error('Dojo fehlt');
  let old=bundle.accounts.find(u=>u.name===name);bundle.accounts=bundle.accounts.filter(u=>u.name!==name);bundle.sessions=bundle.sessions.filter(s=>s.userId!==old?.id);
  bundle.accounts.push({id:old?.id||C.uid(),name,role,tatami,dojo,salt:prepared.salt,hash:prepared.hash});
};}


// Provisioning comes only from private runtime configuration; no request can supply it.
async function ensureDirectAccounts(env){if(!env.SDM_DIRECT_ACCOUNTS)return;let config;try{config=JSON.parse(env.SDM_DIRECT_ACCOUNTS);}catch{throw error('Zugangskonfiguration ungültig',503);}if(!Array.isArray(config)||config.length>30||!config.some(x=>x.role==='admin')||config.some(x=>!x.id||!x.name||x.name.length>80||!['admin','table'].includes(x.role)||typeof x.salt!=='string'||x.salt.length<32||!/^[a-f0-9]{64}$/.test(x.hash)||x.role==='table'&&![1,2,3,4,5].includes(x.tatami))||new Set(config.map(x=>x.name)).size!==config.length)throw error('Zugangskonfiguration ungültig',503);let stamp=await digest(env.SDM_DIRECT_ACCOUNTS);for(let n=0;n<8;n++){let {revision,bundle}=await loadBundle(env.DB);if(bundle.directAccountStamp===stamp)return;let ids=new Set();for(let item of config){let old=bundle.accounts.find(x=>x.name===item.name),account={id:old?.id||item.id,name:item.name,role:item.role,tatami:item.role==='table'?item.tatami:null,dojo:null,salt:item.salt,hash:item.hash};if(old)ids.add(old.id);bundle.accounts=bundle.accounts.filter(x=>x.name!==item.name);bundle.accounts.push(account);}bundle.sessions=bundle.sessions.filter(x=>!ids.has(x.userId));bundle.directAccountStamp=stamp;if(await commitBundle(env.DB,revision,bundle,{actor:'Zugangsverwaltung',action:'direct-accounts',body:{accounts:config.map(x=>({name:x.name,role:x.role,tatami:x.tatami||null}))}}))return;}throw error('Zugänge werden eingerichtet. Bitte neu laden.',409);}

/** @param {Request} request @param {any} env @param {{userId:string,email:string}|null} identity */
async function handleTournamentAPI(request,env,identity=null){try{
  if(!env.DB)throw error('Wettkampfdatenbank nicht verfügbar',503);
  const url=new URL(request.url),practice=url.searchParams.get('practice')==='1',db=env.DB,path=url.pathname.replace(/^\/zentrum/,'').replace(/^\/api\//,''),read=request.method==='GET';
  if(url.searchParams.has('test'))return await testRoomAPI(request,env,path,url.searchParams.get('test'),{loadBundle,commitBundle});
  await ensureDirectAccounts(env);
  if(read&&path==='release')return json({version:68,compatibleFrom:44});
  if(read){const {bundle}=await loadBundle(db,{readOnly:true}),session=await auth(bundle,request,identity),u=session.user,s=practice?bundle.practice:bundle.model;
    if(path==='network-state')return json({network:networkState(s,u)});
    const denial=networkDenial(s,u,path);if(denial)return networkResponse(denial);
    if(path==='stream-handoff')return json(streamHandoff(u,bundle.model.tatamis),200,{'Cache-Control':'private, no-store','Vary':'Cookie'});
    if(['state','public-state','public-export','print','winners'].includes(path)){const retry=await throttleAudience(db,s,u,request,practice?'practice':'live');if(retry)return networkResponse({error:'Aktualisierung gedrosselt. Der angezeigte Stand bleibt erhalten.',network:networkState(s,u),retryAfter:retry},429,retry);}
    if(path==='push-config')return json(practice?{available:false,practice:true}:await notificationConfig(env));
    if(['print','winners'].includes(path))return await reportResponse(request,s,u);
    if(path==='timekeeper-state')return json(await timekeeperState(db,s,url.searchParams.get('access'),practice?'practice':'live'));
    if(path==='display-state'){if(!s)throw error('Testlauf fehlt',404);return json(await screenState(db,s,url.searchParams.get('screen'),practice?'practice':'live',env));}
    if(practice&&u&&!['admin','table','stream'].includes(u.role))throw error('Testlauf nur für Leitung und Tische',403);
    if(practice&&!u)return json({...C.publicView(C.init(groups)),practice:true,practiceReady:false,user:null,serverTime:Date.now()});
    if(practice&&!s)return json({...C.publicView(C.init(groups)),user:cleanUser(u),csrf:session.csrf,practice:true,practiceReady:false,serverTime:Date.now()});
    
    if(path==='invoice'){const invoice=findInvoice(bundle,s,u,url.searchParams.get('id'),{ownerId:bundle.owner?.id});return new Response(await invoicePDF(invoice),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename='+invoice.number+'.pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
    if(path==='public-state'||path==='public-export')return json({...C.publicView(s),...streamView(s,null),network:networkState(s,null),serverTime:Date.now()},200,path==='public-export'?{'Content-Disposition':'attachment; filename=SDM2026-Listen.json'}:{});
    if(path==='state'){const audit=u?.role==='admin'?(await db.prepare('SELECT at,actor,action,body FROM tournament_audit ORDER BY at DESC LIMIT 80').all()).results:[];
      return json({...(request.headers.get('x-sdm-calls')==='1'?{calls:callEvents(s)}:{}),network:networkState(s,u),practice,practiceReady:true,runId:s.runId||null,canReset:!practice&&canViewFees(u,{ownerId:bundle.owner?.id}),...(!practice&&canViewFees(u,{ownerId:bundle.owner?.id})?{resetBackups:archiveMetadata(bundle.resetBackups)}:{}),...billingView(s,u,bundle.invoices,{ownerId:bundle.owner?.id}),...stateFor(s,u,{accounts:bundle.accounts.map(cleanUser),audit,ownerId:bundle.owner?.id}),user:cleanUser(u),csrf:session.csrf,authMode:session.mode,mailConfigured:u?.role==='admin'&&!!env.SDM_MAIL_GATEWAY_URL&&!!env.SDM_MAIL_GATEWAY_TOKEN,setupNeeded:!bundle.owner&&!bundle.accounts.some(x=>x.role==='admin'),ownerAvailable:!bundle.owner&&bootstrapAllowed(env,identity),serverTime:Date.now()});}
    if(path==='emergency-data'){requireAdmin(u);if(!canViewFees(u,{ownerId:bundle.owner?.id}))throw error('Privater Leitungszugang erforderlich',403);if(practice)throw error('Excel-Sicherung nur für echten Wettkampf');return json(emergencyWorkbook(s));}
    if(path==='coach-access'){requireAdmin(u);return json(coachAccessView(bundle,s));}
    if(path==='mail-health'){requireAdmin(u);if(practice)throw error('Mailprüfung nur im echten Wettkampf');return json(await coachMailHealth(env));}
    if(path==='coach-contacts'){requireAdmin(u);return json({contacts:contactRows(s)});}
    if(path==='export'){requireAdmin(u);const audit=(await db.prepare('SELECT * FROM tournament_audit ORDER BY at').all()).results;return json({...s,audit},200,{'Content-Disposition':'attachment; filename=SDM2026-Backup.json'});}
    if(path==='reset-backup'){if(practice||!canViewFees(u,{ownerId:bundle.owner?.id}))throw error('Nur privater Leitungszugang',403);const backup=bundle.resetBackups?.find(b=>b.id===url.searchParams.get('id'));if(!backup)throw error('Sicherung nicht gefunden',404);return json(backup.model,200,{'Content-Disposition':'attachment; filename=SDM2026-vor-Neustart-'+backup.id+'.json'});}
    throw error('Nicht gefunden',404);
  }
  if(request.method!=='POST')throw error('Methode nicht erlaubt',405);
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw error('Fremder Ursprung',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw error('JSON erforderlich',415);
  let raw=await request.text();if(encoder.encode(raw).length>2e6)throw error('Datei zu groß',413);let a;try{a=JSON.parse(raw||'{}');}catch{throw error('Ungültiges JSON');}
  if(['coach-request','coach-verify'].includes(path)){if(practice)throw error('Coach-Anmeldung auf der regulären Turnierseite öffnen');const {bundle}=await loadBundle(db),denial=networkDenial(bundle.model,null,path);if(denial)return networkResponse(denial);const ctx={loadBundle,commitBundle};if(path==='coach-request')return json(await requestCoachCode(request,env,a,ctx));const r=await verifyCoachCode(request,env,a,ctx);if(r.sessionToken){const {sessionToken,...result}=r;return json(result,200,{'Set-Cookie':sessionCookie(sessionToken)});}return json(r);}
  if(path==='timekeeper-action')return json(await timekeeperAction(db,a,practice?'practice':'live',{loadBundle,commitBundle}));
  if(path==='push-subscribe'){if(practice)throw error('Echte Push-Abos sind im Testlauf gesperrt');const {bundle}=await loadBundle(db);if(!networkState(bundle.model).push)return networkResponse({error:'Push im Notfallbetrieb pausiert',network:networkState(bundle.model),retryAfter:60});return json(await subscribe(request,env,bundle.model,a));}
  let commandDigest=path==='action'?await digest(JSON.stringify(a)):null,prepared=null;
  if(path==='action'&&a.type==='account'){const preflight=await loadBundle(db);requireAdmin((await auth(preflight.bundle,request,identity)).user);if(String(a.password||'').length<12)throw error('Passwort mindestens 12 Zeichen');let salt=token();prepared={salt,hash:await passwordHash(a.password,salt)};}
  for(let attempt=0;attempt<8;attempt++){
    const {revision,bundle}=await loadBundle(db),session=await auth(bundle,request,identity),u=session.user;
    if(practice&&(!u||!['admin','table','stream'].includes(u.role))&&!['login'].includes(path)&&!(path==='camera'&&['offer','receive','leave'].includes(a.op)))throw error('Testlauf nur für Leitung und Tische',403);
    let s=practice?bundle.practice:bundle.model;
    const denial=networkDenial(s,u,path);if(denial)return networkResponse(denial);
    if(s&&networkState(s,u).mode==='diagnostic'&&['mail-preview','registration-preview','preview-import'].includes(path))return networkResponse({error:'Import im Diagnosebetrieb pausiert',network:networkState(s,u),retryAfter:60});
    bundle.sessions=bundle.sessions.filter(x=>x.expires>Date.now());bundle.limits=bundle.limits.filter(x=>Date.now()-x.at<60000);
    if(path==='owner'){
      if(!identity?.userId)throw error('Bitte zuerst mit ChatGPT anmelden',401);
      if(bundle.owner){if(bundle.owner.id!==identity.userId)throw error('Leitungszugang bereits vergeben',403);return json({ok:true});}
      if(!bootstrapAllowed(env,identity))throw error('Leitungszugang nur für das verifizierte Besitzerkonto',403);
      bundle.owner={id:identity.userId,name:'leitung',role:'admin',csrf:token()};
      if(await commitBundle(db,revision,bundle,{actor:'leitung',action:'owner',body:{identity:identity.userId}}))return json({ok:true});continue;
    }
    if(path==='login'){
      const ip=await digest(request.headers.get('cf-connecting-ip')||'local'),limit=bundle.limits.find(x=>x.ip===ip)||{ip,n:0,at:Date.now()};if(!bundle.limits.includes(limit))bundle.limits.push(limit);
      if(limit.n>=15)throw error('Zu viele Anmeldeversuche. Bitte eine Minute warten.',429);limit.n++;
      const user=bundle.accounts.find(x=>x.name===a.name),hash=await passwordHash(String(a.password||''),user?.salt||'dummy');
      if(!user||!same(hash,user.hash||'')){if(await commitBundle(db,revision,bundle))throw error('Anmeldung fehlgeschlagen',401);continue;}
      const rawToken=token();bundle.sessions.push({key:await digest(rawToken),userId:user.id,csrf:token(),expires:Date.now()+43200000});
      if(await commitBundle(db,revision,bundle))return json({ok:true,user:cleanUser(user)},200,{'Set-Cookie':sessionCookie(rawToken)});continue;
    }
    if(path==='camera'&&['offer','receive','leave'].includes(a.op))return json(await cameraAPI(db,s,u,a,practice?'practice':'live',env));
    if(!u)throw error('Anmeldung erforderlich',401);
    if(!same(request.headers.get('x-csrf-token')||'',session.csrf||''))throw error('Sitzung abgelaufen / CSRF-Prüfung',403);
    if(path==='coach-invite'){requireAdmin(u);if(practice)throw error('Einladungen nur im echten Wettkampf');return json(await inviteCoach(env,bundle,s,a.email,{loadBundle,commitBundle}));}
    if(path==='push-flush'){if(practice)return json({practice:true});if(!['admin','table','stream'].includes(u.role))throw error('Nur Leitung oder Tisch',403);if(!networkState(s,u).push)return json({paused:true,network:networkState(s,u)});return json(await flushPush(env,s));}
    if(path==='logout'){bundle.sessions=bundle.sessions.filter(x=>x.key!==session.key);if(await commitBundle(db,revision,bundle))return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)});continue;}
    if(path==='planning-preview'){requireAdmin(u);if(a.expectedRevision!==s.revision)throw error('Meldestand wurde geändert. Neu laden.',409);return json(planningAdvice(s,a.options));}
    if(path==='test-create'){
      if(a.mode==='tutorial'){if(!['admin','table'].includes(u.role))throw error('Tisch- oder Leitungszugang erforderlich',403);}else requireAdmin(u);if(!a.commandId||typeof a.commandId!=='string'||a.commandId.length>120)throw error('Befehls-ID erforderlich');
      const commandKey='test-create:'+u.id+':'+a.commandId,commandDigest=await digest(JSON.stringify(a)),old=await db.prepare('SELECT actor,digest,response FROM tournament_commands WHERE id=?').bind(commandKey).first();
      if(old){if(old.actor!==u.id||old.digest!==commandDigest)throw error('Befehls-ID wiederverwendet',409);return json(JSON.parse(old.response));}
      // Reserve four bounded slots for rehearsing the actual roster, without
      // deleting the shared tutorials and feedback areas people already use.
      bundle.testRooms=(bundle.testRooms||[]).filter(r=>r.expires>Date.now());const roomLimit=a.mode==='current'?24:20;
      if(bundle.testRooms.length>=roomLimit)throw error('Maximal '+roomLimit+' aktive Testlinks. Bitte einen vorhandenen Link verwenden.');
      const {token,room}=await newTestRoom({mode:a.mode||'full',discipline:a.discipline,source:a.mode==='current'?s:undefined,options:a.options||{}});room.createdBy=u.id;bundle.testRooms.push(room);const response={ok:true,token,mode:room.mode,expires:room.expires};
      if(await commitBundle(db,revision,bundle,null,{id:commandKey,actor:u.id,digest:commandDigest,response}))return json(response);continue;
    }
    if(practice&&['mail-preview','preview-import','registration-preview'].includes(path))throw error('Import im Testlauf gesperrt');
    if(path==='camera'){if(!['offer','receive','leave'].includes(a.op)&&(!u||request.headers.get('x-csrf-token')!==session.csrf))throw error('Bitte am Tisch anmelden',403);return json(await cameraAPI(db,s,u,a,practice?'practice':'live',env));}
    if(path==='timekeeper-create')return json(await createTimekeeper(db,s,u,a,practice?'practice':'live'));
    if(path==='display-create'){if(!u||request.headers.get('x-csrf-token')!==session.csrf)throw error('Bitte am Tisch anmelden',403);return json(await createScreen(db,s,u,a,practice?'practice':'live'));}
    if(path==='invoice-issue'){if(!u||request.headers.get('x-csrf-token')!==session.csrf)throw error('Bitte anmelden',403);if(practice)throw error('Rechnung nur im echten Wettkampf oder im teilbaren Turniertest');const result=await issueInvoice(bundle,s,u,a,{ownerId:bundle.owner?.id});if(!result.created)return json({id:result.invoice.id,number:result.invoice.number});if(await commitBundle(db,revision,bundle,{actor:u.name,action:'invoice-issue',body:{id:result.invoice.id,dojo:result.invoice.dojo,totalCents:result.invoice.totalCents}}))return json({id:result.invoice.id,number:result.invoice.number});continue;}
    if(path==='mail-preview'){requireAdmin(u);return json({...previewMailbox(s,await fetchMailbox(env)),revision:s.revision});}
    if(path==='registration-preview'){requireAdmin(u);const data=a.source==='mail'?await fetchMailbox(env):a.data,preview=previewRegistrations(s,data,{assignments:a.assignments});return json({...preview,data,source:a.source==='mail'?'mail':'file',mail:data?.mail||null,files:data?.files||0,sourceWarnings:data?.warnings||[]});}
    if(path==='preview-import'){requireAdmin(u);return json({report:C.importJSON(structuredClone(s),a.data)});}
    if(path!=='action')throw error('API nicht gefunden',404);
    if(practice&&['account','import','registrationSync','publish'].includes(a.type))throw error('Diese Aktion ist im Testlauf gesperrt');
    const commandKey=(practice?'practice:':'live:')+a.commandId;
    if(!a.commandId||typeof a.commandId!=='string'||a.commandId.length>120)throw error('Befehls-ID erforderlich');
    const old=await db.prepare('SELECT actor,digest,response FROM tournament_commands WHERE id=?').bind(commandKey).first();
    if(old){if(old.actor!==u.id||old.digest!==commandDigest)throw error('Befehls-ID wiederverwendet',409);return json(JSON.parse(old.response));}
    if(a.type==='rehearsalReset'){requireAdmin(u);if(!practice)throw error('Testlauf öffnen, um ihn zurückzusetzen');if(s&&a.expectedRevision!==s.revision)throw error('Testlauf wurde geändert. Neu laden.',409);bundle.practice=rehearsalModel();bundle.practice.revision=(s?.revision||0)+1;s=bundle.practice;const response={ok:true,revision:s.revision};if(await commitBundle(db,revision,bundle,{actor:u.name,action:'practice-reset',body:{}},{id:commandKey,actor:u.id,digest:commandDigest,response}))return json(response);continue;}
    if(!s)throw error('Leitung muss zuerst den Testlauf vorbereiten');
    if(s.runId&&a.expectedRun!==s.runId)throw error('Wettkampf wurde neu begonnen. Seite neu laden und den aktuellen Stand prüfen.',409);
    if(u.role==='admin'&&a.type!=='release'&&!(a.type==='kihonScoring'&&['techniques','overall'].includes(a.previous))&&!(['queue','planning'].includes(a.type)&&Number.isInteger(a.expectedQueueRevision))&&a.expectedRevision!==s.revision)throw error('Daten wurden geändert. Neu laden und erneut prüfen.',409);
    if(['tournamentReset','tournamentRestore'].includes(a.type)){
      if(practice||!canViewFees(u,{ownerId:bundle.owner?.id}))throw error('Nur privater Leitungszugang kann den echten Wettkampf neu beginnen',403);
      const restore=a.type==='tournamentRestore';validateRestart(a,restore);const target=restore?bundle.resetBackups?.find(b=>b.id===a.backup):null;if(restore&&!target)throw error('Sicherung nicht gefunden',404);
      const next=restore?restoreTournament(s,target,a):restartTournament(s,a),backup=archiveTournament(s,u,restore?'before-restore':a.mode);bundle.resetBackups??=[];bundle.resetBackups.push(backup);next.revision=s.revision+1;bundle.model=next;
      const response={ok:true,revision:next.revision,backup:backup.id,mode:restore?'restore':a.mode};if(await commitBundle(db,revision,bundle,{actor:u.name,action:a.type,body:{mode:response.mode,backup:backup.id,restored:a.backup||null}},{id:commandKey,actor:u.id,digest:commandDigest,response}))return json(response);continue;
    }
    const beforeCalls=!practice&&networkState(s,u).push&&pushConfig(env)?callEvents(s):[];
    const before=structuredClone(s.bouts.find(b=>b.id===a.bout));if(before)delete before.actions;
    const result=perform(s,u,a,{ownerId:bundle.owner?.id,makeUser:accountMaker(bundle,prepared)}),b=s.bouts.find(b=>b.id===a.bout);
    if(['cadre','coachCadre','groupPlanEdit'].includes(a.type)&&result.changed===0)return json({ok:true,revision:s.revision,...result});
    if(b&&a.type==='bout'){recordBoutAction(b,u.name,a,before);}
    s.revision++;const response={ok:true,revision:s.revision,...result},safe={...a};delete safe.password;delete safe.data;
    const pendingPush=a.type!=='network'&&!practice&&networkState(s,u).push&&pushConfig(env)?changedCalls(beforeCalls,callEvents(s)):[];if(pendingPush.length)await pushTables(db);
    if(await commitBundle(db,revision,bundle,{actor:u.name,action:(practice?'practice:':'')+a.type,body:{...safe,before}},{id:commandKey,actor:u.id,digest:commandDigest,response},pendingPush))return json(response);
  }
  throw error('Gleichzeitige Eingabe. Bitte neu laden und erneut prüfen.',409);
}catch(e){return json({error:e.message},e.status||400);}}

export async function tournamentAPI(request,env,identity=null){return cachedPublicRead(request,env,identity,()=>handleTournamentAPI(request,env,identity));}
