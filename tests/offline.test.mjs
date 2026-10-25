import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {pbkdf2Sync,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openDatabase} from '../server/sqlite.mjs';
import {createTournamentServer} from '../server/http.mjs';
import {initialState,reduce,remaining,kataTotal,validState} from '../public/demo/state.js';
import {requestJSON} from '../public/zentrum/request.js';
const root=fileURLToPath(new URL('../',import.meta.url));
test('SQLite commits survive close/reopen, rollback is atomic, backup is independently readable',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'djkb-sqlite-')),file=path.join(dir,'live.sqlite'),db=openDatabase(file);
 try{await db.batch([db.prepare("INSERT INTO tournament_state VALUES('durable',1,'g')")]);await assert.rejects(db.batch([db.prepare("INSERT INTO tournament_state VALUES('rollback',1,'g')"),db.prepare("INSERT INTO tournament_state VALUES('durable',2,'g')")]));assert.equal(await db.prepare("SELECT id FROM tournament_state WHERE id='rollback'").first(),null);await db.snapshot(path.join(dir,'backup.sqlite'));db.close();const reopened=openDatabase(file),copy=openDatabase(path.join(dir,'backup.sqlite'));assert.equal((await reopened.prepare("SELECT revision FROM tournament_state WHERE id='durable'").first()).revision,1);assert.equal((await copy.prepare("SELECT revision FROM tournament_state WHERE id='durable'").first()).revision,1);reopened.close();copy.close();}finally{try{db.close();}catch{}await rm(dir,{recursive:true,force:true});}
});
test('demo clock survives reload, pauses exactly and kata uses integer tenths',()=>{
 let s=initialState();s=reduce(s,{type:'start'},1000);assert.equal(remaining(s,2500),118500);s=JSON.parse(JSON.stringify(s));assert.equal(remaining(s,3500),117500);s=reduce(s,{type:'pause'},3500);assert.equal(remaining(s,8000),117500);assert.equal(kataTotal([8.1,8,8.3,8.2,8.1]),24.4);assert.throws(()=>kataTotal([8.11,8,8,8,8]));assert.ok(validState(s));assert.ok(!validState({...s,startedAt:'wrong'}));
});
test('conditional client reads reuse unchanged data; logout clears session cache',async()=>{
 const url='http://localhost/zentrum/api/state';let calls=0,tagSeen=false;
 const fetcher=async(u,o)=>{calls++;if(calls===1)return new Response(JSON.stringify({user:{name:'old'},revision:1}),{headers:{etag:'"same"','x-server-time':'1000'}});if(calls===2){tagSeen=o.headers.get('if-none-match')==='"same"';return new Response(null,{status:304,headers:{'x-server-time':'2000'}});}if(calls===3)return new Response('{}');assert.equal(o.headers.get('if-none-match'),null);return new Response('{"user":null}');};
 await requestJSON(url,{},fetcher);const reused=await requestJSON(url,{},fetcher);assert.equal(reused.data.user.name,'old');assert.equal(reused.data.serverTime,2000);assert.equal(reused.response.ok,true);assert.ok(tagSeen);await requestJSON('http://localhost/zentrum/api/logout',{method:'POST'},fetcher);assert.equal((await requestJSON(url,{},fetcher)).data.user,null);
});
test('HTTP handler: local login, session isolation, compact reads and restart (in-process)',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'djkb-http-')),salt='1'.repeat(48),password='Test-only-password-123',accounts=[{name:'leitung',id:randomUUID(),role:'admin',salt,hash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}];
 let app;
 try{
  app=await createTournamentServer({root,dataDirectory:dir,accounts,port:0});const base='http://127.0.0.1:'+app.port;
  assert.equal((await app.inject(base+'/health')).status,200);
  assert.equal((await app.inject(base+'/')).status,200);
  assert.equal((await app.inject(base+'/demo/demo.js')).status,200);
  assert.equal((await app.inject(base+'/lib/tournament/api.mjs')).status,404);
  const login=await app.inject(base+'/zentrum/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({name:'leitung',password})});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.ok(!login.headers.get('set-cookie').includes('Secure'));
  let response=await app.inject(base+'/zentrum/api/state',{headers:{Cookie:cookie}}),data=await response.json();assert.equal(data.user.name,'leitung');
  const firstTag=response.headers.get('etag');assert.ok(firstTag);
  response=await app.inject(base+'/zentrum/api/state',{headers:{Cookie:cookie,'If-None-Match':firstTag}});assert.equal(response.status,304);assert.equal((await response.text()).length,0);
  response=await app.inject(base+'/zentrum/api/state',{headers:{'If-None-Match':firstTag}});assert.equal(response.status,200);assert.equal((await response.json()).user,null);
  response=await app.inject(base+'/zentrum/api/action',{method:'POST',headers:{Origin:'https://foreign.test','Content-Type':'application/json',Cookie:cookie},body:'{}'});assert.equal(response.status,403);
  await app.close();app=await createTournamentServer({root,dataDirectory:dir,accounts,port:0});response=await app.inject('http://127.0.0.1:'+app.port+'/zentrum/api/state',{headers:{Cookie:cookie}});assert.equal((await response.json()).user.name,'leitung');
 }finally{if(app)await app.close();await rm(dir,{recursive:true,force:true});}
});
