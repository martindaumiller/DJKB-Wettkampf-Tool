import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {tournamentAPI,loadBundle,commitBundle} from '../lib/tournament/api.mjs';

function database(){const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../drizzle/0000_aberrant_elektra.sql',import.meta.url),'utf8'));return {raw,prepare(sql){let values=[];return {bind(...v){values=v;return this;},async first(){return raw.prepare(sql).get(...values)||null;},async all(){return {results:raw.prepare(sql).all(...values)};},run(){const r=raw.prepare(sql).run(...values);return {meta:{changes:r.changes}};}};},async batch(statements){raw.exec('BEGIN');try{const result=statements.map(s=>s.run());raw.exec('COMMIT');return result;}catch(e){raw.exec('ROLLBACK');throw e;}}};}
function client(env,identity=null){let csrf='',cookie='';return {async request(path,data,headers={}){const r=await tournamentAPI(new Request('https://test.local/api/'+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json','Origin':'https://test.local','X-CSRF-Token':csrf}:{}),Cookie:cookie,...headers},body:data?JSON.stringify(data):undefined}),env,identity);const body=await r.json();if(path==='state')csrf=body.csrf||'';if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body};},async state(){return (await this.request('state')).body;},async action(a){const s=await this.state();return this.request('action',{...a,expectedRun:a.expectedRun??s.runId??null,expectedRevision:s.revision,commandId:crypto.randomUUID()});}};}
const identity={userId:'test-owner',email:'owner@example.test'};
const registration={received_at:'2026-10-20T10:00:00+02:00',dojo:'Testdojo',contact:'Privater Kontakt',email:'private@example.test',phone:'1234567',participants:[{first:'Test',last:'Eins',birth:'2008-07-02',gender:'w',kyu:0,starts:[{discipline:'Kumite',group:'F6 W'}]},{first:'Test',last:'Zwei',birth:'2008-07-03',gender:'w',kyu:0,starts:[{discipline:'Kumite',group:'F6 W'}]}],teams:[],fee_eur:30};

test('invoice API issues scoped stable PDFs and keeps bank details out of public state',async()=>{
 const db=database(),env={DB:db,SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity),anon=client(env);await owner.request('owner',{});await owner.action({type:'import',data:registration});const s=await owner.state(),recipient={name:'Testdojo e.V.',street:'Teststraße 10',city:'90471 Nürnberg'},issued=await owner.request('invoice-issue',{dojo:'Testdojo',recipient,expectedRevision:s.revision});assert.equal(issued.status,200);const same=await owner.request('invoice-issue',{dojo:'Testdojo',recipient,expectedRevision:s.revision});assert.equal(same.body.id,issued.body.id);assert.equal((await anon.request('invoice?id='+issued.body.id)).status,403);const pdf=await tournamentAPI(new Request('https://test.local/api/invoice?id='+issued.body.id),env,identity);assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.ok(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0,5)).startsWith('%PDF'));assert.equal((await anon.state()).invoiceArchive,undefined);assert.equal((await anon.state()).invoiceIssuer,undefined);assert.equal((await owner.state()).invoiceArchive.length,1);db.raw.close();
});
test('anonymous display/camera paths require a valid screen token and never confer desk rights',async()=>{
 const db=database(),env={DB:db,SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity),anon=client(env);await owner.request('owner',{});await owner.action({type:'import',data:registration});await owner.action({type:'group',group:'F6 W',change:{tatami:1,poolTatamis:[1]}});await owner.action({type:'draw',group:'F6 W'});const issued=await owner.request('display-create',{tatami:1});assert.equal(issued.status,200);const view=await anon.request('display-state?screen='+issued.body.screen);assert.equal(view.status,200);assert.equal(view.body.tatami,1);assert.ok(view.body.current.aka.name);assert.ok(!JSON.stringify(view.body).includes('private@example.test'));assert.equal((await anon.request('display-state?screen='+'0'.repeat(64))).status,404);const camera=await owner.request('camera',{op:'start',client:crypto.randomUUID(),tatami:1});assert.equal(camera.status,200);assert.equal((await anon.request('camera',{op:'offer',screen:issued.body.screen,peer:crypto.randomUUID(),offer:{type:'offer',sdp:'v=0\r\nqa'}})).status,200);assert.equal((await anon.request('camera',{op:'start',client:crypto.randomUUID(),tatami:1})).status,401);assert.equal((await anon.action({type:'stage',stage:6,screen:issued.body.screen})).status,401);db.raw.close();
});

test('owner reset is confirmed, archived, replay-safe, restorable and isolated from accounts and test rooms',async()=>{const db=database(),env={DB:db,SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity),anon=client(env);await owner.request('owner',{});await owner.action({type:'import',data:registration});await owner.action({type:'draw',group:'F6 W'});await owner.action({type:'account',name:'reset-desk',password:'Reset-Tisch-123!',role:'table',tatami:4});await owner.action({type:'account',name:'reset-other',password:'Reset-Admin-123!',role:'admin'});const desk=client(env),other=client(env);await desk.request('login',{name:'reset-desk',password:'Reset-Tisch-123!'});await other.request('login',{name:'reset-other',password:'Reset-Admin-123!'});assert.equal((await other.state()).canReset,false);assert.equal((await other.action({type:'tournamentReset',mode:'empty',confirmation:'NEU STARTEN',acknowledged:true})).status,403);assert.equal((await desk.action({type:'tournamentReset',mode:'empty',confirmation:'NEU STARTEN',acknowledged:true})).status,403);const before=await owner.state();assert.equal(before.canReset,true);assert.equal((await owner.action({type:'tournamentReset',mode:'empty',confirmation:'NEU STARTEN'})).status,400);assert.equal((await owner.state()).revision,before.revision);const payload={type:'tournamentReset',mode:'empty',confirmation:'NEU STARTEN',acknowledged:true,expectedRevision:before.revision,commandId:'one-reset'};const r=await owner.request('action',payload);assert.equal(r.status,200);assert.deepEqual((await owner.request('action',payload)).body,r.body);const empty=await owner.state();assert.equal(empty.people.length,0);assert.equal(empty.resetBackups.length,1);assert.equal(empty.groups.length,86);assert.ok(empty.runId);const backup=await owner.request('reset-backup?id='+r.body.backup);assert.equal(backup.status,200);assert.deepEqual(backup.body.people,before.people);assert.deepEqual(backup.body.entries,before.entries);assert.equal((await anon.request('reset-backup?id='+r.body.backup)).status,403);assert.equal((await other.request('reset-backup?id='+r.body.backup)).status,403);assert.equal((await anon.state()).resetBackups,undefined);assert.equal((await desk.state()).runId,empty.runId);assert.equal((await desk.request('action',{type:'orientation',tatami:4,orientation:90,commandId:'old-desk'})).status,409);assert.equal((await owner.action({type:'tournamentRestore',backup:r.body.backup,confirmation:'WIEDERHERSTELLEN',acknowledged:true})).status,200);const restored=await owner.state();assert.deepEqual(restored.people,before.people);assert.equal(restored.resetBackups.length,2);assert.notEqual(restored.runId,empty.runId);assert.equal((await desk.action({type:'orientation',tatami:4,orientation:90})).status,200);db.raw.close();});

test('a stale reset does not save a backup or clear data, and practice cannot reset the actual tournament',async()=>{const db=database(),env={DB:db,SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity);await owner.request('owner',{});await owner.action({type:'import',data:registration});const before=await owner.state();assert.equal((await owner.request('action',{type:'tournamentReset',mode:'empty',confirmation:'NEU STARTEN',acknowledged:true,expectedRevision:before.revision-1,commandId:'stale-reset'})).status,409);assert.equal((await owner.state()).resetBackups.length,0);assert.deepEqual((await owner.state()).people,before.people);assert.equal((await owner.request('action?practice=1',{type:'tournamentReset',mode:'empty',confirmation:'NEU STARTEN',acknowledged:true,expectedRevision:0,commandId:'practice-reset'})).status,400);assert.deepEqual((await owner.state()).people,before.people);db.raw.close();});

test('Kaderverwaltung speichert atomar und wiederholbar; Tisch und Öffentlichkeit bleiben geschützt',async()=>{
 const db=database(),env={DB:db,SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity),anon=client(env);await owner.request('owner',{});await owner.action({type:'import',data:registration});await owner.action({type:'draw',group:'F6 W'});const before=await owner.state(),id=before.people[0].id,payload={type:'cadre',changes:[{id,cadre:true,seed:1,expectedCadre:false,expectedSeed:0}],expectedRevision:before.revision,commandId:'cadre-once'};assert.equal((await owner.request('action',payload)).status,200);assert.equal((await owner.request('action',payload)).status,200);const after=await owner.state();assert.equal(after.revision,before.revision+1);assert.equal(after.people.find(p=>p.id===id).cadre,true);assert.equal(after.groups.find(g=>g.code==='F6 W').draw.seedingStale,true);assert.deepEqual(after.bouts,before.bouts);await owner.action({type:'account',name:'cadre-table',password:'Tisch-Zugang-123!',role:'table',tatami:1});const desk=client(env);await desk.request('login',{name:'cadre-table',password:'Tisch-Zugang-123!'});assert.equal((await desk.action({type:'cadre',changes:[{id,cadre:false,seed:0}]})).status,403);await owner.action({type:'publish',enabled:true});const pub=(await anon.state());assert.ok(pub.entries.every(e=>e.startNumber>0));assert.ok(!JSON.stringify(pub).includes('"cadre"'));assert.ok(!JSON.stringify(pub).includes('"seed"'));db.raw.close();
});

test('Private Gebühren und Gruppenstatus werden serverseitig geschützt und atomar gespeichert',async()=>{
 const db=database(),env={DB:db,SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity),anon=client(env);
 await owner.request('owner',{});await owner.action({type:'import',data:registration});assert.equal((await owner.state()).fees.totalCents,3000);
 await owner.action({type:'account',name:'other-admin',password:'Anderer-Zugang-123!',role:'admin'});await owner.action({type:'account',name:'table-private',password:'Tisch-Zugang-123!',role:'table',tatami:1});
 const other=client(env),desk=client(env);await other.request('login',{name:'other-admin',password:'Anderer-Zugang-123!'});await desk.request('login',{name:'table-private',password:'Tisch-Zugang-123!'});
 assert.equal((await other.state()).fees,undefined);assert.equal((await desk.state()).fees,undefined);assert.equal((await desk.action({type:'groupStatus',group:'F6 W',active:false,withdraw:true,reason:'Test'})).status,403);
 const before=await owner.state();assert.equal((await owner.action({type:'groupStatus',group:'F6 W',active:false,reason:'Test'})).status,400);assert.equal((await owner.state()).revision,before.revision);
 assert.equal((await owner.action({type:'groupStatus',group:'F6 W',active:false,withdraw:true,reason:'Leitung'})).status,200);
 const after=await owner.state();assert.equal(after.fees.totalCents,0);assert.equal(after.groups.find(g=>g.code==='F6 W').active,false);assert.ok(after.entries.every(e=>!e.active));
 await owner.action({type:'publish',enabled:true});const publicState=(await anon.request('public-state')).body;assert.equal(publicState.fees,undefined);assert.equal((await anon.state()).fees,undefined);assert.ok(!JSON.stringify(publicState).includes('declaredCents'));
});

test('Online-Zugänge, Freigabe, Anträge und Ergebnisschutz',async()=>{
 const db=database(),env={DB:db,SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity),anon=client(env),stranger=client(env,{userId:'other',email:'other@example.test'});
 assert.equal((await anon.request('owner',{})).status,401);
 assert.equal((await owner.request('owner',{}, {'Origin':'https://foreign.test'})).status,403);
 assert.equal((await client({...env,SDM_OWNER_EMAIL:''},identity).request('owner',{})).status,403);
 assert.equal((await stranger.request('owner',{})).status,403);
 assert.equal((await owner.request('owner',{})).status,200);
 assert.equal((await stranger.request('owner',{})).status,403);
 assert.equal((await owner.state()).user.role,'admin');
 assert.equal((await owner.action({type:'import',data:registration})).status,200);
 let publicState=(await anon.request('public-state')).body;
 assert.equal(publicState.entries.length,0);assert.ok(!JSON.stringify(publicState).includes('private@example.test'));
 assert.equal((await owner.action({type:'account',name:'tisch1',password:'Test-Zugang-123!',role:'table',tatami:1})).status,200);
 assert.equal((await owner.action({type:'account',name:'trainer',password:'Test-Trainer-123!',role:'trainer',dojo:'Testdojo'})).status,200);
 const desk=client(env),trainer=client(env);
 assert.equal((await desk.request('login',{name:'tisch1',password:'wrong'})).status,401);
 assert.equal((await desk.request('login',{name:'tisch1',password:'Test-Zugang-123!'})).status,200);
 assert.equal((await trainer.request('login',{name:'trainer',password:'Test-Trainer-123!'})).status,200);
 assert.equal((await desk.action({type:'withdraw',entry:(await owner.state()).entries[0].id,reason:'Test'})).status,403);
 assert.equal((await desk.action({type:'import',data:registration})).status,403);
 assert.equal((await owner.action({type:'group',group:'F6 W',change:{tatami:1}})).status,200);
 assert.equal((await owner.action({type:'draw',group:'F6 W'})).status,200);
 assert.equal((await owner.action({type:'stage',stage:5})).status,200);
 let state=await desk.state(),bout=state.bouts.find(b=>b.group==='F6 W');
 const pending=(await owner.state()),job=pending.dispatch.find(q=>q.group===bout.group&&(q.pool||null)===(bout.pool||null));assert.equal((await desk.action({type:'bout',bout:bout.id,version:bout.version,action:'start'})).status,403);assert.equal((await owner.request('action',{type:'release',job:job.id,tatami:job.tatami,drawAt:pending.groups.find(g=>g.code===bout.group).draw.at,expectedRevision:pending.revision-1,commandId:crypto.randomUUID(),expectedRun:pending.runId||null})).status,200);const start={type:'bout',bout:bout.id,version:bout.version,action:'start'};
 assert.equal((await desk.action(start)).status,200);
 state=await desk.state();bout=state.bouts.find(b=>b.id===bout.id);
 const commandId=crypto.randomUUID(),score={type:'bout',bout:bout.id,version:bout.version,action:'score',side:'aka',value:1,commandId};
 assert.equal((await desk.request('action',score)).status,200);
 assert.equal((await desk.request('action',score)).status,200);
 assert.equal((await desk.state()).bouts.find(b=>b.id===bout.id).score.aka,1);
 const scored=(await desk.state()).bouts.find(b=>b.id===bout.id);
 assert.equal((await desk.action({type:'bout',bout:bout.id,version:scored.version,action:'undo'})).status,200);
 const undone=(await desk.state()).bouts.find(b=>b.id===bout.id);assert.equal(undone.score.aka,0);assert.ok(undone.version>scored.version);
 assert.equal((await desk.request('action',{...score,version:scored.version,commandId:crypto.randomUUID()})).status,409);
 assert.equal((await desk.request('action',{...score,commandId:crypto.randomUUID()})).status,409);
 assert.equal((await desk.request('action',{...score,commandId:crypto.randomUUID()},{'X-CSRF-Token':'wrong'})).status,403);
 assert.equal((await owner.action({type:'publish',enabled:true})).status,200);
 publicState=(await anon.request('public-state')).body;
 assert.equal(publicState.entries.length,2);assert.ok(!JSON.stringify(publicState).includes('2008-07-02'));assert.ok(!JSON.stringify(publicState).includes('Privater Kontakt'));
 const own=await trainer.state(),person=own.people[0];
 assert.equal((await trainer.action({type:'request',targetType:'person',target:person.id,category:'name',message:'Tippfehler',change:{first:'Korrigiert'}})).status,200);
 assert.equal((await owner.state()).people[0].first,'Test');
 const req=(await owner.state()).requests.at(-1);
 assert.equal((await owner.action({type:'approveRequest',id:req.id,accept:true})).status,200);
 assert.equal((await owner.state()).people[0].first,'Korrigiert');
 const snapshot=await owner.state();
 assert.equal((await owner.request('action',{type:'snapshot',expectedRevision:snapshot.revision-1,commandId:crypto.randomUUID()})).status,409);
 assert.equal((await owner.action({type:'withdraw',entry:snapshot.entries[0].id,reason:'Leitungsentscheidung'})).status,200);
 assert.equal((await anon.request('export')).status,403);
 assert.equal((await owner.request('export')).status,200);
 const stored=await loadBundle(db);assert.ok(stored.bundle.accounts.every(x=>x.hash&&!('password' in x)));assert.ok(!JSON.stringify(stored.bundle).includes('Test-Zugang-123!'));
 assert.ok(!JSON.stringify((await owner.state()).accounts).includes('hash'));
});

test('Transaktion verwirft veraltete Revision ohne Audit oder Teiländerung',async()=>{
 const db=database(),one=await loadBundle(db),two=await loadBundle(db);
 one.bundle.model.event.stage=2;two.bundle.model.event.stage=4;
 assert.equal(await commitBundle(db,one.revision,one.bundle,{actor:'a',action:'first',body:{}}),true);
 assert.equal(await commitBundle(db,two.revision,two.bundle,{actor:'b',action:'stale',body:{}}),false);
 assert.equal((await loadBundle(db)).bundle.model.event.stage,2);
 assert.equal((await db.prepare('SELECT action FROM tournament_audit').all()).results.length,1);
});

test('Wettkampfdaten über mehrere Datenbankchunks bleiben vollständig',async()=>{
 const db=database(),data=await loadBundle(db);data.bundle.model.testPayload='Unicode ä 🥋 '.repeat(70000)+'a'.repeat(159999)+'🥋';
 assert.equal(await commitBundle(db,data.revision,data.bundle),true);
 assert.ok((await db.prepare('SELECT data FROM tournament_chunks').all()).results.length>1);
 assert.equal((await loadBundle(db)).bundle.model.testPayload,data.bundle.model.testPayload);
});

test('Parallele Tischschreibvorgänge erhalten beide unabhängigen Änderungen',async()=>{
 const db=database(),env={DB:db,SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity);await owner.request('owner',{});
 for(let id=1;id<=2;id++)assert.equal((await owner.action({type:'account',name:'table'+id,password:'Test-Zugang-123!',role:'table',tatami:id})).status,200);
 const clients=[client(env),client(env)];for(let i=0;i<2;i++){await clients[i].request('login',{name:'table'+(i+1),password:'Test-Zugang-123!'});await clients[i].state();}
 const result=await Promise.all(clients.map(c=>c.request('action',{type:'orientation',orientation:90,commandId:crypto.randomUUID()})));
 assert.deepEqual(result.map(x=>x.status),[200,200]);const s=await owner.state();assert.equal(s.tatamis[0].orientation,90);assert.equal(s.tatamis[1].orientation,90);
});


test('Direkter Leitungszugang ohne ChatGPT und getrennte Tischrechte',async()=>{
 const {pbkdf2Sync}=await import('node:crypto'),salt='test-salt-123456789012345678901234567890',password='Nur-Test-Direkt-123!';
 const hashed=p=>pbkdf2Sync(p,salt,100000,32,'sha256').toString('hex');
 const accounts=[{id:'direct-admin',name:'martin',role:'admin',salt,hash:hashed(password)},{id:'direct-table1',name:'tatami1',role:'table',tatami:1,salt,hash:hashed(password)},{id:'direct-table2',name:'tatami2',role:'table',tatami:2,salt,hash:hashed(password)}];
 const db=database(),env={DB:db,SDM_DIRECT_ACCOUNTS:JSON.stringify(accounts)},owner=client(env),desk=client(env),otherDesk=client(env),anon=client(env);
 const publicState=await anon.state();assert.equal(publicState.setupNeeded,false);assert.equal(publicState.user,null);assert.ok(!JSON.stringify(publicState).includes('hash'));
 assert.equal((await owner.request('login',{name:'martin',password})).status,200);assert.equal((await owner.state()).user.role,'admin');
 assert.equal((await desk.request('login',{name:'tatami1',password})).status,200);assert.equal((await otherDesk.request('login',{name:'tatami2',password})).status,200);
 assert.equal((await desk.action({type:'publish',enabled:true})).status,403);
 assert.equal((await desk.action({type:'account',name:'evil',role:'admin',password})).status,403);
 await owner.action({type:'import',data:registration});await owner.action({type:'group',group:'F6 W',change:{tatami:2}});await owner.action({type:'draw',group:'F6 W'});await owner.action({type:'stage',stage:5});
 let bout=(await owner.state()).bouts.find(x=>x.group==='F6 W');
 assert.equal((await desk.action({type:'bout',bout:bout.id,version:bout.version,action:'start'})).status,403);
 const pending=(await owner.state()),job=pending.dispatch.find(q=>q.group===bout.group&&(q.pool||null)===(bout.pool||null));await owner.action({type:'release',job:job.id,tatami:job.tatami,drawAt:pending.groups.find(g=>g.code===bout.group).draw.at});assert.equal((await otherDesk.action({type:'bout',bout:bout.id,version:bout.version,action:'start'})).status,200);
 assert.equal((await owner.action({type:'account',name:'martin',role:'admin',password:'Neu-Test-Direkt-456!'})).status,200);assert.equal((await owner.state()).user,null);
 assert.equal((await owner.request('login',{name:'martin',password})).status,401);assert.equal((await owner.request('login',{name:'martin',password:'Neu-Test-Direkt-456!'})).status,200);
 const stored=await loadBundle(db);assert.ok(!JSON.stringify(stored.bundle).includes(password));assert.equal(stored.bundle.accounts.length,3);
 await owner.state();assert.equal((await owner.request('logout',{})).status,200);assert.equal((await owner.state()).user,null);
});

test('Poolwechsel über API akzeptiert laufende Tischänderungen und schützt eigene Reihenfolge samt Wiederholung',async()=>{
 const {pbkdf2Sync}=await import('node:crypto'),salt='pool-api-test-salt-12345678901234567890',password='Nur-Test-Pool-456!';
 const db=database(),env={DB:db,SDM_DIRECT_ACCOUNTS:JSON.stringify([{id:'pool-api-admin',name:'pool-admin',role:'admin',salt,hash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}])},owner=client(env),anon=client(env);
 assert.equal((await owner.request('login',{name:'pool-admin',password})).status,200);await owner.state();
 assert.equal((await owner.action({type:'import',data:registration})).status,200);
 assert.equal((await owner.action({type:'drawAll',autoPools:true})).status,200);
 let before=await owner.state(),q=before.queue.find(q=>q.group==='F6 W');assert.ok(q);
 assert.equal((await owner.action({type:'orientation',tatami:1,orientation:90})).status,200);
 const action={type:'queue',job:q.id,tatami:5,expectedRevision:before.revision,expectedQueueRevision:before.queueRevision||0,commandId:crypto.randomUUID()};
 const moved=await owner.request('action',action);assert.equal(moved.status,200);
 const state=await owner.state();assert.equal(state.queue.find(x=>x.id===q.id).tatami,5);
 assert.equal((await owner.request('action',action)).status,200);assert.equal((await owner.state()).revision,state.revision);
 const conflict=await owner.request('action',{...action,tatami:3,expectedRevision:state.revision,commandId:crypto.randomUUID()});assert.equal(conflict.status,409);assert.equal((await owner.state()).queue.find(x=>x.id===q.id).tatami,5);
 const publicState=await anon.state();assert.equal(publicState.entries.length,0);assert.equal(publicState.queue.length,0);
});

test('trainer team task through authenticated API is filtered, pending until approval and replay-safe',async()=>{
 const env={DB:database(),SDM_OWNER_EMAIL:'owner@example.test'},owner=client(env,identity),trainer=client(env),anonymous=client(env);
 assert.equal((await owner.request('owner',{})).status,200);
 const data={dojo:'Teamdojo',participants:[
 {first:'Team',last:'A',birth:'2013-01-01',kyu:6,gender:'m',starts:[]},
 {first:'Team',last:'B',birth:'2017-01-01',kyu:8,gender:'w',starts:[]},
 {first:'Team',last:'C',birth:'2012-01-01',kyu:0,gender:'w',starts:[]},
 {first:'Team',last:'TooOld',birth:'2000-01-01',kyu:0,gender:'m',starts:[]}],
 teams:[{name:'Unser Team',group:'I2',members:['Team A','Team B','Team C']}],fee_eur:30};
 assert.equal((await owner.action({type:'import',data})).status,200);
 assert.equal((await owner.action({type:'account',name:'team-trainer',password:'Trainer-Team-123!',role:'trainer',dojo:'Teamdojo'})).status,200);
 assert.equal((await trainer.request('login',{name:'team-trainer',password:'Trainer-Team-123!'})).status,200);
 const state=await trainer.state(),task=state.teams[0],ids=task.candidates.map(p=>p.id);
 assert.equal(task.candidates.length,3);assert.ok(!task.candidates.some(p=>p.last==='TooOld'));
 assert.equal((await trainer.action({type:'request',targetType:'team',target:task.id,category:'team',change:{memberIds:ids}})).status,200);
 let official=await owner.state();assert.equal(official.teams[0].verified,false);assert.deepEqual(official.teams[0].memberIds,[]);
 const req=official.requests.find(r=>r.category==='team');assert.equal(req.status,'submitted');
 assert.equal((await trainer.action({type:'team',id:task.id,memberIds:ids})).status,403);
 assert.equal((await owner.action({type:'approveRequest',id:req.id,accept:true})).status,200);
 official=await owner.state();assert.equal(official.teams[0].verified,true);assert.deepEqual(official.teams[0].memberIds,ids);
 assert.equal((await trainer.state()).teams[0].pendingRequest,null);
 assert.equal((await anonymous.state()).teams,undefined);
 assert.notEqual((await owner.action({type:'approveRequest',id:req.id,accept:true})).status,200);
});
