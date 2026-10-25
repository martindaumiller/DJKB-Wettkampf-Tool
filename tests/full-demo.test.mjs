import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash as nodeHash} from 'node:crypto';
import '../scripts/prepare-full-demo.mjs';
const {C,createFixture,createHash}=await import('../public/demo/tool/engine.js');
import {initialState,reduce,remaining,kataTotal,validState} from '../public/demo/state.js';
import {scoreboardView} from '../public/zentrum/spectator-view.js';
test('Kata has neither a running demo clock nor accepted timer commands; marks follow tournament limits',()=>{
 let s=reduce(initialState(),{type:'mode',value:'kata'});
 assert.equal(remaining(s),0);assert.equal(s.startedAt,null);
 for(const type of ['start','pause','clock'])assert.throws(()=>reduce(s,{type}),/keine Zeitnahme/);
 assert.throws(()=>reduce(s,{type:'score',side:'aka',value:1}),/gesperrt/);
 assert.equal(kataTotal([8.1,8,8.3,8.2,8.1]),24.4);
 assert.equal(kataTotal([8.1,8,8.3,8.2,8.1,7.9,8.4]),40.7);
 assert.throws(()=>kataTotal([10,8,8,8,8]));
 assert.equal(validState({...s,judges:[8.11,8,8,8,8]}),false);
 s=reduce(s,{type:'mode',value:'kumite'});assert.equal(remaining(s),120000);
});
test('original hall display omits clock for Kata flags and points',()=>{
 for(const kind of ['points','kata']){
 const html=scoreboardView({tatami:1,current:{group:'A1 W',kind,status:'live',timer:{remaining:120000,since:1},aka:{name:'A',dojo:'Demo'},shiro:{name:'B',dojo:'Demo'},judges:[8,8,8,8,8],kata:'Heian 1',penalties:{aka:[],shiro:[]}},animations:false});
 assert.ok(!html.includes('display-clock'));assert.ok(!html.includes('02:00'));
 }
});
test('browser SHA-256 matches Node; fixture uses the original engine and all six competition modes',()=>{
 for(const value of ['', 'abc', 'Kata · Nürnberg', 'x'.repeat(1000)])assert.equal(createHash('sha256').update(value).digest('hex'),nodeHash('sha256').update(value).digest('hex'));
 const s=createFixture(),modes=new Set(s.bouts.map(b=>C.mode(s.groups.find(g=>g.code===b.group),b)));
 for(const mode of ['kata','points','kihon','jiyuIppon','jiyu','team'])assert.ok(modes.has(mode),mode);
 assert.equal(s.groups.filter(g=>g.active).length,10);assert.equal(s.tatamis.length,5);
 assert.ok(s.people.every(p=>p.first==='Teststarter'));
});
test('browser transport keeps Kata untimed, serializes conflicts and replays a command exactly once',async()=>{
 const values=new Map(),sessions=new Map();let queue=Promise.resolve();
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 globalThis.sessionStorage={getItem:k=>sessions.get(k)||null,setItem:(k,v)=>sessions.set(k,v)};
 globalThis.location=new URL('https://demo.example/sdm/archiv-2026/demo/tool/public/zentrum/index.html?demoRole=tisch1');
 globalThis.BroadcastChannel=class{postMessage(){}};
 Object.defineProperty(globalThis.navigator,'locks',{configurable:true,value:{request:(name,options,fn)=>{if(typeof options==='function')fn=options;const next=queue.then(fn,fn);queue=next.catch(()=>{});return next;}}});
 const {demoFetch}=await import('../public/demo/tool/public/zentrum/demo-transport.js');
 const endpoint=name=>new URL('./api/'+name,globalThis.location).href;
 const read=async()=>{const r=await demoFetch(endpoint('state'));assert.equal(r.status,200);return r.json();};
 const send=async a=>{const r=await demoFetch(endpoint('action'),{method:'POST',body:JSON.stringify(a)});return {status:r.status,data:await r.json()};};
 const before=await read(),b=before.bouts.find(b=>b.group==='A1 W'&&b.status==='ready');
 const start={type:'bout',action:'start',bout:b.id,version:b.version,commandId:'start',expectedRun:before.runId,expectedRevision:before.revision};
 assert.equal((await send(start)).status,200);
 const after=await read(),live=after.bouts.find(x=>x.id===b.id);
 const forbidden=await send({...start,action:'timer',version:live.version,commandId:'kata-time',running:true});
 assert.equal(forbidden.status,400);assert.match(forbidden.data.error,/Keine freie Kumite/);assert.equal((await read()).revision,after.revision);
 const flag={...start,action:'kataFlag',version:live.version,kata:'Heian 1',commandId:'flag'};
 assert.equal((await send(flag)).status,200);
 assert.equal((await send(flag)).status,200);
 const replayed=await read();assert.equal(replayed.revision,after.revision+1);
 const next=replayed.bouts.find(x=>x.id===b.id),base={...flag,version:next.version};
 const results=await Promise.all([send({...base,commandId:'parallel-a'}),send({...base,commandId:'parallel-b'})]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
 assert.equal((await read()).revision,replayed.revision+1);
 assert.equal((await demoFetch('https://elsewhere.example/demo/tool/api/state')).status,403);
 values.set('djkb-full-demo-v1','broken-json');assert.equal((await demoFetch(endpoint('state'))).status,503);const reset=await demoFetch(endpoint('demo-reset'),{method:'POST',body:'{}'});assert.equal(reset.status,200);assert.equal((await read()).bouts.length,16);assert.notEqual((await read()).runId,before.runId);
});
