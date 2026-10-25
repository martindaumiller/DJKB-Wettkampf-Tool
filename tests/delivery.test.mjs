import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {drawBroadcast} from '../public/zentrum/broadcast-graphics.js';
test('stream overlays draw fight, kata, pause, call and ceremony without external resources',()=>{
 const texts=[],ctx=new Proxy({measureText:t=>({width:String(t).length*9}),createLinearGradient:()=>({addColorStop(){}}),fillText:t=>texts.push(String(t))},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 for(const scene of [undefined,'pause','next','ceremony']){
 const data={tatami:1,clock:'01:20',group:'DEMO',round:'Finale',bout:'x',live:true,animations:false,judges:[],kata:false,settings:{theme:'dark',mode:'camera',layout:'compact'},production:{scene},aka:{name:'Alex Muster',dojo:'Dojo Beispiel',score:'0,5',penalties:[]},shiro:{name:'Lena Beispiel',dojo:'Dojo Muster',score:'1,0',penalties:[]},sides:['shiro','aka'],next:{group:'KATA',shiro:'Lena Beispiel',aka:'Alex Muster'},ceremony:{place:1,group:'DEMO',discipline:'Kumite',name:'Lena Beispiel',dojo:'Dojo Muster'}};
 drawBroadcast(ctx,{width:1280,height:720},data,{now:10000,memory:{}});
 data.kata=true;data.judges=[8.1,8,8.3,8.2,8.1];data.total=24.4;
 drawBroadcast(ctx,{width:1280,height:720},data,{now:10000,memory:{}});
 }
 assert.ok(texts.some(s=>s.includes('Alex Muster')));assert.ok(texts.some(s=>s.includes('Lena Beispiel')));assert.ok(texts.some(s=>s.includes('WETTKAMPFPAUSE')));
});
test('public demo modules and styles have complete relative import graphs',async()=>{
 const root=fileURLToPath(new URL('../public/',import.meta.url)),pending=['demo/demo.js','demo/renderer/overlay-preview.js','assets/site.js'],seen=new Set();
 while(pending.length){const name=pending.pop();if(seen.has(name))continue;seen.add(name);const full=path.resolve(root,name);assert.ok(full.startsWith(root));const text=await readFile(full,'utf8');
 for(const match of text.matchAll(/from\s*['"](\.\.?\/[^'"?#]+)(?:[^'"]*)['"]/g)){const target=path.resolve(path.dirname(full),match[1]);await readFile(target);pending.push(path.relative(root,target));}
 }
 assert.ok(seen.size>=10);
});
