import {isKata,kataReviewKey} from './kata-review.mjs';
import {recordBoutAction} from './action-history.mjs';
import {planningAdvice} from './planning-advisor.mjs';
import {currentTournamentCopy,simulationForecast} from './current-simulation.mjs';
import {callEvents} from './notifications.mjs';
import {networkState,networkDenial,throttleAudience,networkResponse} from './network.mjs';
import {createTimekeeper,timekeeperState,timekeeperAction} from './timekeeper.mjs';
import * as C from './core.mjs';
import {contactRows} from './operations.mjs';
import {reportResponse} from './reports.mjs';
import {billingView,issueInvoice,findInvoice,invoicePDF} from './invoices.mjs';
import {createScreen,screenState,cameraAPI} from './screens.mjs';
import groups from './groups.json' with {type:'json'};
import {perform,stateFor} from './commands.mjs';
import {previewRegistrations} from './registrations.mjs';
import {archiveTournament,archiveMetadata,restartTournament,restoreTournament,validateRestart} from './reset.mjs';

const encoder=new TextEncoder();
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const nonce=()=>crypto.randomUUID()+crypto.randomUUID();
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const cookie=request=>(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sdm_test_session='))?.slice('sdm_test_session='.length);
const cookieHeader=value=>'sdm_test_session='+value+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200';
const safeUser=u=>({id:u.id,name:u.name,role:u.role,tatami:u.tatami??null,dojo:u.dojo??null});

export function fullTestModel(){
 const s=C.init(groups);s.event.name='SDM · teilbarer Turniertest';s.event.demo=true;s.event.rest=0;s.event.published=true;
 const chosen=[],pick=predicate=>{const g=s.groups.find(g=>predicate(g)&&!chosen.includes(g));if(!g)throw Error('Testgruppe fehlt');chosen.push(g);return g;};
 pick(g=>g.type===2&&g.maxAge<=11);
 pick(g=>g.type===0&&g.maxAge<=12);
 pick(g=>g.type===0&&g.maxAge<=12);
 pick(g=>g.type===1&&g.maxAge<=12&&g.description.includes('Kihon'));
 pick(g=>g.type===1&&g.maxAge<=12&&g.description.includes('Jiyu-Ippon'));
 pick(g=>g.type===0&&g.minAge>=13);
 pick(g=>g.type===2&&g.minAge>=12);
 pick(g=>g.type===1&&g.minAge>=13&&!g.description.includes('Jiyu-Ippon')&&!g.description.includes('Kihon'));
 pick(g=>g.type===1&&g.description.includes('die letzten 8'));
 pick(g=>g.type===3);
 const person=(g,dojo,suffix,rank)=>{const age=Math.max(g.minAge,Math.min(g.maxAge,10)),p={id:C.uid(),first:'Teststarter',last:g.code.replaceAll(' ','')+'-'+suffix,birth:(2026-age)+'-01-01',birthVerified:true,gender:g.gender==='x'?(rank%2?'m':'w'):g.gender,kyu:g.minKyu,dojo,cadre:rank===1||rank===2,seed:0};s.people.push(p);return p;};
 for(let index=0;index<chosen.length;index++){
  const g=chosen[index];g.tatami=index%5+1;g.poolTatamis=[g.tatami];g.kataMode=index===2||g.type===2?'points-final':'flags-final';
  const count=g.description.includes('die letzten 8')?16:g.type===0||g.type===2?8:4;
  for(let n=1;n<=count;n++){
   const dojo='Testdojo '+((n-1)%4+1);if(!s.dojos.some(d=>d.name===dojo))s.dojos.push({id:C.uid(),name:dojo});
   let entrant;
   if(g.type>=2){const members=[1,2,3].map(i=>person(g,dojo,n+'-'+i,n));entrant={id:C.uid(),name:'Testteam '+g.code+'-'+n,dojo,members:members.map(p=>p.first+' '+p.last),memberIds:members.map(p=>p.id),verified:true};s.teams.push(entrant);}
   else entrant=person(g,dojo,n,n);
   s.entries.push({id:C.uid(),personId:entrant.id,group:g.code,kind:g.type>=2?'team':'person',active:true});
  }
  C.draw(s,g.code,'feedback-'+index);
 }
 for(const t of s.tatamis)perform(s,{id:'simulation',role:'admin',name:'Test-Leitung'},{type:'streamClock',tatami:t.id,seconds:0},{});
 return s;
}

export function fullTourModel(){const s=fullTestModel(),layout=[['A1 W',1],['I1',2],['A2 W',3],['B4 W',4],['D4 W',5],['A1 M',1],['D1 W',2],['I2',3],['C6 W',4],['J1 W',5]];s.queue=[];for(const [code,t]of layout){const g=s.groups.find(g=>g.code===code);g.tatami=t;g.poolTatamis=[t];}return s;}
export function quickTestModel(){
 const s=fullTestModel(),layout=[['A1 W',1,8],['A2 W',2,2],['B4 W',3,2],['D4 W',4,2],['J1 W',5,2],['I1',1,2]],codes=new Set(layout.map(x=>x[0]));
 s.event.name='SDM · Kurztest';s.event.stage=6;s.bouts=[];s.releases={};
 s.entries=s.entries.filter(e=>codes.has(e.group)&&s.entries.filter(x=>x.group===e.group).indexOf(e)<layout.find(x=>x[0]===e.group)[2]);
 const ids=new Set(s.entries.map(e=>e.personId));s.teams=s.teams.filter(t=>ids.has(t.id));for(const t of s.teams)for(const id of t.memberIds)ids.add(id);s.people=s.people.filter(p=>ids.has(p.id));
 for(const g of s.groups){g.active=codes.has(g.code);g.draw=null;g.podium=[];g.tie=false;g.ratified=false;if(!g.active)continue;g.tatami=layout.find(x=>x[0]===g.code)[1];g.poolTatamis=[g.tatami];g.finalTiming='immediate';C.draw(s,g.code,'short-'+g.code);}
 const u={id:'simulation',role:'admin',name:'Kurztest'};for(const q of C.playlist(s))perform(s,u,{type:'release',job:q.id,tatami:q.tatami,drawAt:s.groups.find(g=>g.code===q.group).draw.at,early:true},{});
 return s;
}
export function testTour(s){return [1,2,3,4,5].map(tatami=>{const b=s.bouts.find(b=>C.tatami(s,b)===tatami&&b.status==='live')||C.readyOnTatami(s,tatami)[0];return {tatami,group:b?.group||null,mode:b?C.mode(s.groups.find(g=>g.code===b.group),b):null,complete:s.bouts.filter(b=>C.tatami(s,b)===tatami).every(b=>b.status==='done')};});}
export const tutorialDisciplines={kata:{name:'Kata · KO und Finale',code:'A1 W'},points:{name:'Kata · Punkte',code:'A1 M'},kataTeam:{name:'Kata-Team',code:'I1'},kihon:{name:'Kihon-Ippon Kumite',code:'A2 W'},jiyuIppon:{name:'Jiyu-Ippon Kumite',code:'B4 W'},jiyu:{name:'Jiyu Kumite',code:'D4 W'},team:{name:'Kumite-Team',code:'J1 W'}};
export function tutorialModel(discipline){
 const info=tutorialDisciplines[discipline];if(!info)throw fail('Disziplin für das Tutorial wählen');
 const s=fullTestModel(),code=info.code;s.event.name='Tutorial · '+info.name;s.event.stage=6;s.queue=[];s.bouts=[];s.releases={};
 const count=discipline==='kata'?8:discipline==='points'?4:2;
 s.entries=s.entries.filter(e=>e.group===code).slice(0,count);
 const ids=new Set(s.entries.map(e=>e.personId));s.teams=s.teams.filter(t=>ids.has(t.id));for(const t of s.teams)for(const id of t.memberIds)ids.add(id);s.people=s.people.filter(p=>ids.has(p.id));
 for(const g of s.groups){g.active=g.code===code;g.draw=null;g.podium=[];g.ratified=false;if(!g.active)continue;g.tatami=1;g.poolTatamis=[1];g.finalTiming='immediate';if(discipline==='kata')g.kataMode='flags-final';if(discipline==='points')g.kataMode='points';C.draw(s,g.code,'tutorial-'+discipline);}
 const user={id:'tutorial',role:'admin',name:'Tutorial-Leitung'};for(const q of C.playlist(s))perform(s,user,{type:'release',job:q.id,tatami:1,drawAt:s.groups.find(g=>g.code===q.group).draw.at,early:true},{});
 return s;
}
export async function newTestRoom({mode='full',discipline='kata',source,options={}}={}){
 if(!['full','quick','tutorial','current'].includes(mode))throw fail('Testart wählen');if(mode==='current'&&!source)throw fail('Turnierstand fehlt');
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
 const snapshot=mode==='current'?currentTournamentCopy(source,options):null,model=snapshot?.model||(mode==='tutorial'?tutorialModel(discipline):mode==='quick'?quickTestModel():fullTourModel());
 const simulation=snapshot?simulationForecast(model,{...snapshot,...options}):null;
 // Automated fictional results do not wait in real time. The forecast above retains actual rest settings.
 if(snapshot)model.event.rest=0;
 return {token,room:{key:await digest(token),mode,layoutVersion:51,created:Date.now(),expires:Date.now()+30*86400000,model,sessions:[],audit:[],feedback:[],...(mode==='tutorial'?{tutorial:{discipline,name:tutorialDisciplines[discipline].name}}:{}),...(simulation?{simulation,initialModel:structuredClone(model)}:{})}};
}

export function simulationStep(s){
 const user={id:'simulation',role:'admin',name:'Turniersimulation'},act=a=>perform(s,user,a,{});
 // Only the automatic, fictional simulation supplies its own simulated review.
 const ratify=g=>{if(isKata(g)){g.kataReviews??={};const bs=s.bouts.filter(b=>b.group===g.code);for(const job of new Set(bs.map(b=>C.jobId(g,b)))){const rows=bs.filter(b=>C.jobId(g,b)===job);g.kataReviews[job]={key:kataReviewKey(s,g,rows),listChecked:true,ombudsmanChecked:true,ombudsman:'Simulation (fiktiv)',by:user.name,at:new Date().toISOString(),simulated:true};}}act({type:'ratify',group:g.code});};
 for(const g of s.groups.filter(g=>g.tie)){const bouts=s.bouts.filter(b=>b.group===g.code&&b.kind==='points'&&b.final===(g.tieStage!=='prelim')&&b.reason!=='Kiken');const order=bouts.map(b=>({id:b.aka,result:C.kataScore(b.judges)})).sort((a,b)=>C.compare(a.result,b.result)).map(b=>b.id);act({type:'resolveTie',group:g.code,order,reason:'Test-Stichkata: Reihenfolge für den simulierten Durchlauf.'});}
 const candidates=s.bouts.filter(b=>['ready','live'].includes(b.status)).sort((a,b)=>C.phase(s.groups.find(g=>g.code===a.group),a)-C.phase(s.groups.find(g=>g.code===b.group),b)||(a.status==='live'?0:1)-(b.status==='live'?0:1));
 const b=candidates[0];if(!b){for(const g of s.groups.filter(g=>g.draw&&!g.ratified&&g.podium.length))ratify(g);return {complete:!s.bouts.some(b=>b.status!=='done'),message:'Alle Ergebnisse bestätigt · Siegerehrung und Dojorangliste bereit.'};}
 const g=s.groups.find(g=>g.code===b.group),mode=C.mode(g,b);s.event.stage=Math.max(s.event.stage,C.phase(g,b));
 const bout=a=>act({type:'bout',bout:b.id,version:b.version,...a});
 if(b.status==='ready'){if(mode==='team'&&(!b.akaOrder||!b.shiroOrder))act({type:'lineup',bout:b.id,version:b.version,aka:C.members(s,b.aka),shiro:C.members(s,b.shiro)});bout({action:'start'});}
 if(mode==='points'){const rank=s.entries.filter(e=>e.group===g.code).findIndex(e=>e.id===b.aka),score=Math.round((6+Math.min(39,rank)/10)*10)/10;bout({action:'kata',kata:C.allowedKata(g,b)[0],judges:Array(b.judgeCount||5).fill(score)});}
 else if(mode==='team'){
  for(let guard=0;b.status==='live'&&guard<5;guard++){if(!b.teamFights?.some(f=>f.status==='live'))bout({action:'teamFight',op:'start',akaMember:C.members(s,b.aka)[0],shiroMember:C.members(s,b.shiro)[0]});const fight=b.teamFights.find(f=>f.status==='live');if(fight.score.aka<2)bout({action:'teamFight',op:'score',side:'aka',value:2-fight.score.aka});bout({action:'teamFight',op:'finish',winner:'aka',reason:'Ippon'});}
 }else{
  if(mode==='kata')bout({action:'kataFlag',kata:C.allowedKata(g,b)[0]});
  if(['kihon','jiyuIppon'].includes(mode)&&!(mode==='kihon'&&b.kihonScoring==='overall'))while((b.exchanges?.length||0)<(b.techPlan?.length||6))bout({action:'technicalStep',winner:'aka'});
  if(mode==='jiyu'){const target=g.scoring==='sanbon'?4:2;while(b.score.aka<target)bout({action:'score',side:'aka',value:Math.min(2,target-b.score.aka)});}
  bout({action:'finish',side:'aka',reason:mode==='jiyu'?'Ippon':'Hantei'});
 }
 for(const finished of s.groups.filter(g=>g.draw&&!g.ratified&&!g.tie&&g.podium.length&&s.bouts.filter(b=>b.group===g.code).every(b=>b.status==='done')))ratify(finished);
 const complete=s.bouts.every(b=>b.status==='done');return {complete,message:g.code+' · '+(mode==='team'?'Teambegegnung mit Einzelkämpfen':mode==='points'?'Kata-Wertungen':'Begegnung')+' simuliert',bout:b.id};
}

export async function testRoomAPI(request,env,path,token,{loadBundle,commitBundle}){
 if(!/^[a-f0-9]{64}$/.test(token))throw fail('Testlink ungültig',404);const key=await digest(token),read=request.method==='GET';
 if(!read&&(request.method!=='POST'||request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin))throw fail('Fremder Ursprung / Methode',403);
 let a={};if(!read){if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail('JSON erforderlich',415);const text=await request.text();if(encoder.encode(text).length>2000000)throw fail('Datei zu groß',413);try{a=JSON.parse(text);}catch{throw fail('Ungültiges JSON');}}
 if(path.startsWith('coach-'))throw fail('E-Mail-Anmeldung auf der regulären Turnierseite öffnen. Im Test oben die Coach-Rolle wählen.',403);
 const raw=request.headers.get('x-sdm-test-session')||cookie(request),sessionKey=raw?await digest(raw):null,commandDigest=!read?await digest(JSON.stringify(a)):null;
 for(let attempt=0;attempt<8;attempt++){
  const {revision,bundle}=await loadBundle(env.DB,{readOnly:read}),room=bundle.testRooms?.find(x=>x.key===key&&x.expires>Date.now());if(!room)throw fail('Testlink abgelaufen oder nicht vorhanden',404);
  const session=room.sessions.find(x=>x.key===sessionKey&&x.expires>Date.now()),u=session?.user||{id:'guest',name:'Publikum',role:'public'},s=room.model;
  if(path==='network-state'&&read)return json({network:networkState(s,u)});
  const denial=networkDenial(s,u,path);if(denial)return networkResponse(denial);
  if(read&&['state','public-state','public-export','print','winners'].includes(path)){const retry=await throttleAudience(env.DB,s,u,request,'test:'+key);if(retry)return networkResponse({error:'Aktualisierung gedrosselt',network:networkState(s,u),retryAfter:retry},429,retry);}
  if(read){if(path==='timekeeper-state')return json(await timekeeperState(env.DB,s,new URL(request.url).searchParams.get('access'),'test:'+key));if(path==='coach-contacts'){if(u.role!=='admin')throw fail('Nur Test-Leitung',403);return json({contacts:contactRows(s)});}if(path==='push-config')return json({available:false,practice:true});if(['print','winners'].includes(path))return await reportResponse(request,s,u);if(path==='display-state')return json(await screenState(env.DB,s,new URL(request.url).searchParams.get('screen'),'test:'+key,env));if(path==='invoice'){const i=findInvoice(room,s,u,new URL(request.url).searchParams.get('id'),{ownerId:u.role==='admin'?u.id:null});return new Response(await invoicePDF(i),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename='+i.number+'.pdf','Cache-Control':'private, no-store'}});}if(path==='reset-backup'){if(u.role!=='admin')throw fail('Nur Test-Leitung',403);const backup=room.resetBackups?.find(b=>b.id===new URL(request.url).searchParams.get('id'));if(!backup)throw fail('Sicherung nicht gefunden',404);return json(backup.model);}if(!['state','public-state','public-export'].includes(path))throw fail('Im teilbaren Test nicht verfügbar',403);
   const meta={mode:room.mode||'full',tutorial:room.tutorial||null,simulation:room.simulation||null,tour:testTour(s),created:room.created,expires:room.expires,dojos:s.dojos.map(d=>d.name),feedbackCount:room.feedback.length,feedback:u.role==='admin'?room.feedback:[],summary:{groups:s.groups.filter(g=>g.draw).length,done:s.bouts.filter(b=>b.status==='done').length,bouts:s.bouts.length,ratified:s.groups.filter(g=>g.ratified).length,requests:s.requests.length,complete:s.bouts.every(b=>b.status==='done')}};
   return json({...(request.headers.get('x-sdm-calls')==='1'?{calls:callEvents(s)}:{}),practice:true,practiceReady:true,runId:s.runId||null,canReset:u.role==='admin',...(u.role==='admin'?{resetBackups:archiveMetadata(room.resetBackups)}:{}),testRoom:meta,...billingView(s,path==='state'?u:null,room.invoices,{ownerId:u.role==='admin'?u.id:null}),...stateFor(s,path==='state'?u:null,{accounts:[],audit:room.audit,ownerId:u.id}),user:safeUser(u),csrf:session?.csrf||'',serverTime:Date.now(),authMode:'test-link'});
  }
  room.sessions=room.sessions.filter(x=>x.expires>Date.now());
  if(path==='test-role'){
   if(!['admin','table','trainer','stream','public'].includes(a.role)||a.role==='table'&&![1,2,3,4,5].includes(a.tatami)||a.role==='trainer'&&!s.dojos.some(d=>d.name===a.dojo))throw fail('Testrolle wählen');
   if(session&&request.headers.get('x-csrf-token')!==session.csrf)throw fail('Sitzung abgelaufen / CSRF-Prüfung',403);
   if((!session||a.fork===true)&&room.sessions.length>=100)throw fail('Dieser Testbereich ist derzeit voll',429);
   const rawToken=nonce(),newSession={key:await digest(rawToken),csrf:nonce(),expires:Date.now()+43200000,user:{id:a.fork===true?C.uid():session?.user.id||C.uid(),role:a.role,name:a.role==='admin'?'Test-Leitung':a.role==='table'?'Test-Tisch '+a.tatami:a.role==='trainer'?'Test-Coach · '+a.dojo:a.role==='stream'?'Test-Regie':'Test-Publikum',tatami:a.role==='table'?a.tatami:null,dojo:a.role==='trainer'?a.dojo:null}};
   if(a.fork!==true)room.sessions=room.sessions.filter(x=>x.key!==sessionKey);room.sessions.push(newSession);if(await commitBundle(env.DB,revision,bundle))return json({ok:true,sessionToken:rawToken},200,{'Set-Cookie':cookieHeader(rawToken)});continue;
  }
  if(path==='timekeeper-action')return json(await timekeeperAction(env.DB,a,'test:'+key,{loadBundle,commitBundle}));
  if(path==='camera'&&['offer','receive','leave'].includes(a.op))return json(await cameraAPI(env.DB,s,u,a,'test:'+key,env));
  if(!session||request.headers.get('x-csrf-token')!==session.csrf)throw fail('Bitte eine Testrolle wählen',403);
  if(path==='test-tutorial'){
   if(!['admin','table'].includes(u.role))throw fail('Tisch- oder Leitungsrolle wählen',403);
   if(!a.commandId||typeof a.commandId!=='string')throw fail('Befehls-ID erforderlich');
   const commandKey='tutorial-create:'+u.id+':'+a.commandId,old=await env.DB.prepare('SELECT actor,digest,response FROM tournament_commands WHERE id=?').bind(commandKey).first();
   if(old){if(old.actor!==u.id||old.digest!==commandDigest)throw fail('Befehls-ID wiederverwendet',409);return json(JSON.parse(old.response));}
   bundle.testRooms=bundle.testRooms.filter(r=>r.expires>Date.now());if(bundle.testRooms.length>=20)throw fail('Maximal 20 aktive Testbereiche');
   const {token,room:next}=await newTestRoom({mode:'tutorial',discipline:a.discipline});next.createdBy=u.id;bundle.testRooms.push(next);const response={ok:true,token,mode:'tutorial'};
   if(await commitBundle(env.DB,revision,bundle,null,{id:commandKey,actor:u.id,digest:commandDigest,response}))return json(response);continue;
  }
  if(path==='camera')return json(await cameraAPI(env.DB,s,u,a,'test:'+key,env));
  if(path==='timekeeper-create')return json(await createTimekeeper(env.DB,s,u,a,'test:'+key));
  if(path==='display-create')return json(await createScreen(env.DB,s,u,a,'test:'+key));
  if(path==='invoice-issue'){const result=await issueInvoice(room,s,u,a,{ownerId:u.role==='admin'?u.id:null,practice:true});if(!result.created)return json({id:result.invoice.id,number:result.invoice.number});if(await commitBundle(env.DB,revision,bundle))return json({id:result.invoice.id,number:result.invoice.number});continue;}
  if(path==='planning-preview'){if(u.role!=='admin')throw fail('Nur Test-Leitung',403);if(a.expectedRevision!==s.revision)throw fail('Test wurde geändert. Neu laden.',409);return json(planningAdvice(s,a.options));}
  if(path==='registration-preview'){if(u.role!=='admin')throw fail('Nur Test-Leitung',403);if(a.source==='mail')throw fail('Echte Meldungsquellen sind im teilbaren Test gesperrt',403);return json({...previewRegistrations(s,a.data,{assignments:a.assignments}),data:a.data,source:'file',sourceWarnings:[]});}
  if(!a.commandId||typeof a.commandId!=='string'||a.commandId.length>120)throw fail('Befehls-ID erforderlich');
  const commandKey='test:'+key+':'+a.commandId,old=await env.DB.prepare('SELECT actor,digest,response FROM tournament_commands WHERE id=?').bind(commandKey).first();if(old){if(old.actor!==u.id||old.digest!==commandDigest)throw fail('Befehls-ID wiederverwendet',409);return json(JSON.parse(old.response));}
  let result={};
  if(path==='test-feedback'){
   const message=String(a.message||'').trim(),name=String(a.name||'').trim();if(!message||message.length>2000||name.length>60)throw fail('Feedback mit maximal 2.000 Zeichen eingeben');if(room.feedback.length>=200)throw fail('Feedbackspeicher voll',429);room.feedback.push({id:C.uid(),name,role:u.name,message,view:String(a.view||'').slice(0,40),at:new Date().toISOString()});
  }else if(path==='action'){
   if(u.role==='public')throw fail('Publikum kann keine Ergebnisse verändern',403);
   if(['account','import','snapshot','restore','restructure','streams','stream','mail'].includes(a.type))throw fail('Im teilbaren Test nicht verfügbar',403);
   if(s.runId&&a.expectedRun!==s.runId)throw fail('Wettkampf wurde neu begonnen. Seite neu laden.',409);
   if(['tournamentReset','tournamentRestore'].includes(a.type)){if(u.role!=='admin')throw fail('Nur Test-Leitung',403);if(a.expectedRevision!==s.revision)throw fail('Test wurde geändert. Neu laden.',409);const restore=a.type==='tournamentRestore';validateRestart(a,restore);const target=restore?room.resetBackups?.find(b=>b.id===a.backup):null;if(restore&&!target)throw fail('Sicherung nicht gefunden',404);const next=restore?restoreTournament(s,target,a):restartTournament(s,a),backup=archiveTournament(s,u,restore?'before-restore':a.mode);room.resetBackups??=[];room.resetBackups.push(backup);room.model=next;result={backup:backup.id,mode:restore?'restore':a.mode};}
   else if(a.type==='tutorialReset'){if(room.mode!=='tutorial'||!['table','admin'].includes(u.role)||u.role==='table'&&u.tatami!==1)throw fail('Nur am Tutorial-Tisch',403);if(a.expectedRevision!==s.revision)throw fail('Tutorial wurde geändert. Neu laden.',409);room.model=tutorialModel(room.tutorial.discipline);room.model.revision=s.revision;result={message:'Übung neu begonnen'};}
   else if(['testReset','testStep','testFinish','testAdvance'].includes(a.type)){
    if(u.role!=='admin')throw fail('Nur Test-Leitung',403);if(a.expectedRevision!==s.revision)throw fail('Test wurde geändert. Neu laden.',409);
    if(a.type==='testReset'){room.model=room.mode==='current'?structuredClone(room.initialModel):room.mode==='tutorial'?tutorialModel(room.tutorial.discipline):room.mode==='quick'?quickTestModel():room.layoutVersion>=49?fullTourModel():fullTestModel();if(room.simulation){room.simulation.complete=false;room.simulation.simulated=0;delete room.simulation.error;}room.model.revision=s.revision;result={complete:false,message:'Turniertest neu begonnen · Feedback bleibt erhalten.'};}
    else {const limit=a.type==='testFinish'?300:a.type==='testAdvance'?20:1;let count=0;for(;count<limit;count++){result=simulationStep(s);if(result.complete){count++;break;}}if(a.type==='testFinish'&&!result.complete)throw fail('Turniertest benötigt weitere Schritte');result.simulated=count;if(room.simulation){room.simulation.simulated+=count;room.simulation.complete=!!result.complete;room.simulation.bouts=s.bouts.filter(b=>b.reason!=='Freilos').length;room.simulation.modes=[...new Set(s.bouts.map(b=>C.mode(s.groups.find(g=>g.code===b.group),b)))];}}
   }else{
    if(u.role==='admin'&&a.type!=='release'&&!(a.type==='kihonScoring'&&['techniques','overall'].includes(a.previous))&&!(['queue','planning'].includes(a.type)&&Number.isInteger(a.expectedQueueRevision))&&a.expectedRevision!==s.revision)throw fail('Test wurde geändert. Neu laden.',409);
    const before=structuredClone(s.bouts.find(b=>b.id===a.bout));if(before)delete before.actions;
    result=perform(s,u,a,{ownerId:u.role==='admin'?u.id:null,makeUser:()=>{throw fail('Echte Zugänge sind im Test gesperrt',403);}});const b=s.bouts.find(b=>b.id===a.bout);if(b&&a.type==='bout'){recordBoutAction(b,u.name,a,before);}
   }
   room.model.revision++;
  }else throw fail('Im teilbaren Test nicht verfügbar',403);
  room.audit.unshift({at:new Date().toISOString(),actor:u.name,action:path==='test-feedback'?'feedback':a.type,body:JSON.stringify({type:a.type,bout:a.bout})});room.audit=room.audit.slice(0,150);
  const response={ok:true,revision:room.model.revision,...result};if(await commitBundle(env.DB,revision,bundle,null,{id:commandKey,actor:u.id,digest:commandDigest,response}))return json(response);
 }
 throw fail('Gleichzeitige Eingabe. Bitte erneut versuchen.',409);
}
