import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),target=path.join(root,'public/demo/tool');
await mkdir(path.join(target,'public'),{recursive:true});
await cp(path.join(root,'public/zentrum'),path.join(target,'public/zentrum'),{recursive:true});
await cp(path.join(root,'public/assets'),path.join(target,'public/assets'),{recursive:true});
const pending=['lib/tournament/core.mjs','lib/tournament/commands.mjs','lib/tournament/action-history.mjs','lib/tournament/screens.mjs','lib/tournament/timekeeper.mjs','lib/tournament/planning-advisor.mjs','lib/tournament/reports.mjs'],seen=new Set();
while(pending.length){
 const file=pending.shift();if(seen.has(file))continue;seen.add(file);
 let text=await readFile(path.join(root,file),'utf8');
 if(file.endsWith('.json')){await mkdir(path.dirname(path.join(target,file)),{recursive:true});await writeFile(path.join(target,file),text);continue;}
 for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"?#]+)(?:[^'"]*)['"]/g)){
  const dep=path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1]));
  if(!dep.startsWith('lib/')&&!dep.startsWith('public/zentrum/'))throw Error('Demo import outside source: '+dep);
  pending.push(dep);
 }
 text=text.replaceAll("from 'node:crypto'","from './crypto-browser.mjs'");
 await mkdir(path.dirname(path.join(target,file)),{recursive:true});await writeFile(path.join(target,file),text);
}
await cp(path.join(root,'lib/browser/crypto.mjs'),path.join(target,'lib/tournament/crypto-browser.mjs'));
const room=await readFile(path.join(root,'lib/tournament/test-room.mjs'),'utf8');
const fixture=room.slice(room.indexOf('export function fullTestModel()'),room.indexOf('export function fullTourModel()'));
if(!fixture.startsWith('export function fullTestModel()'))throw Error('Demo fixture missing');
await writeFile(path.join(target,'fixture.mjs'),"import * as C from './lib/tournament/core.mjs';\nimport {perform} from './lib/tournament/commands.mjs';\nimport groups from './lib/tournament/groups.json' with {type:'json'};\n"+fixture+`
export function createFixture(){
 const s=fullTestModel(),layout={'A1 W':1,'A1 M':1,I1:2,'A2 W':3,'B4 W':4,'D1 W':2,I2:3,'D4 W':5,'C6 W':4,'J1 W':5};
 s.event.name='DJKB Wettkampf Tool · Turnierprobe';s.event.stage=6;s.event.signal=false;s.runId=crypto.randomUUID();
 for(const g of s.groups){g.active=!!g.draw;if(!g.draw)continue;g.tatami=layout[g.code]||g.tatami;g.poolTatamis=[g.tatami];g.finalTiming='immediate';}
 const user={id:'demo-admin',name:'Probe-Leitung',role:'admin'};
 for(const q of C.playlist(s))perform(s,user,{type:'release',job:q.id,tatami:q.tatami,drawAt:s.groups.find(g=>g.code===q.group).draw.at,early:true},{});
 return s;
}
`);
await cp(path.join(root,'lib/tournament/groups.json'),path.join(target,'lib/tournament/groups.json'));
await cp(path.join(root,'scripts/demo/transport.js'),path.join(target,'public/zentrum/demo-transport.js'));
await cp(path.join(root,'scripts/demo/shell.js'),path.join(target,'public/zentrum/demo-shell.js'));
await cp(path.join(root,'scripts/demo/shell.css'),path.join(target,'public/zentrum/demo-shell.css'));
let request=await readFile(path.join(target,'public/zentrum/request.js'),'utf8');
request="import {demoFetch} from './demo-transport.js';\n"+request.replace("let response=await fetcher(url,","let response=await demoFetch(url,");
await writeFile(path.join(target,'public/zentrum/request.js'),request);
let html=await readFile(path.join(target,'public/zentrum/index.html'),'utf8');
html=html.replace('<title>SDM 2026 · Wettkampfzentrum</title>','<title>DJKB Wettkampf Tool · Vollständige Turnierprobe</title>').replace('href="/"','href="../../../"').replace('</head>','<link rel="stylesheet" href="./demo-shell.css"></head>').replace('</body>','<script type="module" src="./demo-shell.js"></script></body>');
await writeFile(path.join(target,'public/zentrum/index.html'),html);
await writeFile(path.join(target,'engine.js'),"export * as C from './lib/tournament/core.mjs';\nexport {perform,stateFor} from './lib/tournament/commands.mjs';\nexport {recordBoutAction} from './lib/tournament/action-history.mjs';\nexport {screenState} from './lib/tournament/screens.mjs';\nexport {timekeeperState} from './lib/tournament/timekeeper.mjs';\nexport {planningAdvice} from './lib/tournament/planning-advisor.mjs';\nexport {reportResponse} from './lib/tournament/reports.mjs';\nexport {createFixture} from './fixture.mjs';\nexport {createHash} from './lib/tournament/crypto-browser.mjs';\n");
console.log('Vollständige Turnierprobe: '+seen.size+' Regelmodule, Originaloberfläche und fünf Tische.');
