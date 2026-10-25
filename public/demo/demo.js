import {drawBroadcast} from './renderer/broadcast-graphics.js';
import {initialState,validState,remaining,kataTotal,reduce} from './state.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),key='djkb-tool-demo-v2';
let judgeDraftRevision=null;
if(params.has('embed'))document.body.classList.add('embedded');
if(['display','stream'].includes(params.get('view')))document.body.classList.add('read-only');
let view=params.get('view')==='stream'?'stream':'display',s=initialState(),storageReady=true;
try{const value=JSON.parse(localStorage.getItem(key)||'null');if(validState(value))s=value;}catch{storageReady=false;}
let channel;try{channel=new BroadcastChannel(key);}catch{}
function load(value){if(validState(value)&&value.revision>s.revision){s=value;paintUI();}}
if(channel)channel.onmessage=e=>load(e.data);
window.addEventListener('storage',e=>{if(e.key===key)try{load(JSON.parse(e.newValue));}catch{}});
async function apply(action){
 try{const commit=()=>{let current=s;try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(validState(saved)&&saved.revision>current.revision)current=saved;}catch{storageReady=false;}
 if(action.type==='judges'&&judgeDraftRevision!==null&&judgeDraftRevision!==current.revision)throw Error('Die Wertung wurde in einem anderen Tab geändert. Disziplin erneut wählen und Noten prüfen.');
 const next=reduce(current,action);if(storageReady){try{localStorage.setItem(key,JSON.stringify(next));}catch{throw Error('Nicht gespeichert: Browserspeicher voll oder gesperrt.');}}s=next;if(['judges','mode','reset'].includes(action.type))judgeDraftRevision=null;channel?.postMessage(s);paintUI();$('#notice').textContent=storageReady?'Demo lokal gespeichert.':'Browserspeicher nicht verfügbar. Die Vorschau bleibt in diesem Tab nutzbar.';};
 if(navigator.locks?.request)await navigator.locks.request(key,commit);else commit();}catch(e){$('#notice').textContent=e.message;}
}
for(const el of document.querySelectorAll('[data-score]'))el.onclick=()=>{const [side,value]=el.dataset.score.split(':');apply({type:'score',side,value:Number(value)});};
$('#start').onclick=()=>apply({type:'start'});$('#pause').onclick=()=>apply({type:'pause'});
$('#finish').onclick=()=>apply({type:'finish'});$('#reset').onclick=()=>apply({type:'reset'});
$('#reset-clock').onclick=()=>apply({type:'clock'});$('#mode').onchange=e=>apply({type:'mode',value:e.target.value});
for(const input of document.querySelectorAll('.judges input'))input.addEventListener('input',()=>{judgeDraftRevision??=s.revision;});
$('#save-kata').onclick=()=>apply({type:'judges',value:[...document.querySelectorAll('.judges input')].map(e=>e.value.trim()===''?NaN:Number(e.value))});
for(const el of document.querySelectorAll('[data-scene]'))el.onclick=()=>apply({type:'scene',value:el.dataset.scene});
function choose(v){view=v;$('#display-tab').setAttribute('aria-pressed',String(v==='display'));$('#stream-tab').setAttribute('aria-pressed',String(v==='stream'));$('#new-window').href='?view='+v;$('#explanation-title').textContent=v==='stream'?'Kamerabild und Ergebnis in einem Bild.':'Groß und ablenkungsarm.';$('#explanation').textContent=v==='stream'?'So sieht die Ergebniseinblendung im Stream aus. Das Bild ist eine Simulation. Für OBS kann eine lokale Browserquelle verwendet werden; eine Internetübertragung ist ein eigener Schritt.':'Hallenanzeigen lesen den bestätigten Spielstand. Anzeige separat öffnen und hier eine Wertung eingeben.';}
$('#display-tab').onclick=()=>choose('display');$('#stream-tab').onclick=()=>choose('stream');choose(view);
const score=x=>(x/2).toLocaleString('de',{minimumFractionDigits:1});
function paintUI(){
 $('#mode').value=s.mode;$('#kumite-controls').hidden=s.mode==='kata';$('#kata-controls').hidden=s.mode!=='kata';
 $('#timer-panel').hidden=s.mode==='kata';$('#timer-actions').hidden=s.mode==='kata';
 $('#aka-score').textContent=score(s.aka);$('#shiro-score').textContent=score(s.shiro);
 $('#match-status').textContent=({ready:'Bereit',running:'Läuft',paused:'Unterbrochen',finished:'Beendet'})[s.status];
 if(judgeDraftRevision===null)document.querySelectorAll('.judges input').forEach((input,i)=>input.value=s.judges[i]);
 $('#kata-total').textContent=kataTotal(s.judges).toLocaleString('de',{minimumFractionDigits:1})+' Punkte';
 $('#accessible-score').textContent=s.mode==='kata'?'Lena Beispiel: '+kataTotal(s.judges).toLocaleString('de')+' Punkte.':'Shiro Lena Beispiel '+score(s.shiro)+' · Aka Alex Muster '+score(s.aka);
 for(const el of document.querySelectorAll('[data-scene]'))el.setAttribute('aria-pressed',String(el.dataset.scene===s.scene));
 $('#start').disabled=s.status==='finished'||s.startedAt!==null;
 document.querySelectorAll('[data-score]').forEach(b=>b.disabled=s.status==='finished');
}
paintUI();
function network(){ $('#network-status').textContent=navigator.onLine?'Lokale Simulation · bereit':'Internet getrennt · Demo läuft lokal weiter';}
window.addEventListener('online',network);window.addEventListener('offline',network);network();
const canvas=$('#preview'),ctx=canvas.getContext('2d'),source=document.createElement('canvas'),g=source.getContext('2d'),logo=new Image(),memory={};
source.width=1280;source.height=720;logo.src='../assets/djkb-sued.jpg';try{await logo.decode();}catch{}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function camera(now){
 g.fillStyle='#899b89';g.fillRect(0,0,1280,720);g.fillStyle='#546453';g.fillRect(0,0,1280,255);
 for(let x=40;x<1280;x+=130){g.fillStyle='#bec7b7';g.fillRect(x,40,75,115);}
 g.fillStyle='#46776c';g.beginPath();g.moveTo(290,330);g.lineTo(990,330);g.lineTo(1250,720);g.lineTo(30,720);g.closePath();g.fill();g.strokeStyle='#af4735';g.lineWidth=24;g.stroke();
 for(const [x,belt,flip]of [[480,'#f2f2e6',1],[800,'#a83b2d',-1]]){
 const move=reduced?0:Math.sin(now/650+x)*5;g.save();g.translate(x+move,410);g.scale(flip,1);g.fillStyle='#303c30';g.beginPath();g.arc(0,-142,22,0,Math.PI*2);g.fill();g.strokeStyle='#f5f3e7';g.lineCap='round';g.lineWidth=44;g.beginPath();g.moveTo(0,-110);g.lineTo(-8,-40);g.stroke();g.lineWidth=22;g.beginPath();g.moveTo(-6,-95);g.lineTo(42,-74);g.lineTo(92,-88);g.moveTo(-6,-90);g.lineTo(-48,-55);g.moveTo(-8,-38);g.lineTo(-54,62);g.moveTo(-8,-38);g.lineTo(48,58);g.stroke();g.strokeStyle=belt;g.lineWidth=8;g.beginPath();g.moveTo(-23,-52);g.lineTo(16,-52);g.stroke();g.restore();}
 g.fillStyle='#ffffffb0';g.font='13px system-ui';g.fillText('ANIMIERTES TESTBILD · KEINE ECHTE KAMERA',25,35);
}
let previous=0;
function frame(now){
 if(now-previous>(reduced?250:40)){
 previous=now;const left=Math.ceil(remaining(s)/1000),clock=s.mode==='kata'?null:String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');$('#clock').textContent=clock||'';
 const d={tatami:1,clock,group:s.mode==='kata'?'KATA · DEMO':'KUMITE · DEMO',round:'Bedienvorschau',bout:'demo',live:s.status==='running',state:s.status==='finished'?'done':'live',flag:false,kata:s.mode==='kata',animations:!reduced,stale:false,sides:['shiro','aka'],judges:s.mode==='kata'?s.judges:[],total:kataTotal(s.judges),performance:'Kanku Dai',settings:{mode:'camera',slide:'event',interstitials:false,microphone:false,theme:'dark',layout:'compact',opacity:.94},shiro:{name:'Lena Beispiel',dojo:'Dojo Musterstadt',score:score(s.shiro),penalties:[]},aka:{name:s.mode==='kata'?'Lena Beispiel':'Alex Muster',dojo:s.mode==='kata'?'Dojo Musterstadt':'Dojo Beispielstadt',score:score(s.aka),penalties:[]},next:{group:'KATA · DEMO',aka:'Kim Muster',shiro:'Robin Beispiel'},production:{scene:s.scene==='fight'?undefined:s.scene,transition:!reduced,logoOpacity:.6,pauseOpacity:.92},ceremony:{group:'KUMITE · DEMO',discipline:'Kumite Einzel',place:1,name:s.aka>s.shiro?'Alex Muster':'Lena Beispiel',dojo:'Demo-Dojo'}};
 ctx.textAlign='left';
 if(view==='stream'){camera(now);drawBroadcast(ctx,canvas,d,{source,logo,now,memory});}
 else if(s.scene!=='fight'){drawBroadcast(ctx,canvas,d,{source:null,logo,now,memory});}
 else{
 ctx.fillStyle='#101f1b';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#c3d2b9';ctx.font='24px system-ui';ctx.textAlign='center';ctx.fillText('TATAMI 1 · '+d.group,640,75);ctx.fillStyle='#fff';ctx.font='bold 105px system-ui';if(s.mode!=='kata')ctx.fillText(clock,640,205);
 if(s.mode==='kata'){ctx.font='36px system-ui';ctx.fillText('Lena Beispiel · Kanku Dai',640,310);ctx.font='bold 130px system-ui';ctx.fillText(d.total.toLocaleString('de',{minimumFractionDigits:1}),640,490);ctx.font='30px system-ui';ctx.fillText(s.judges.map(n=>n.toFixed(1)).join('   ·   '),640,575);}
 else{for(const [name,dojo,value,x,color]of [['Lena Beispiel','Dojo Musterstadt',s.shiro,330,'#e8eddf'],['Alex Muster','Dojo Beispielstadt',s.aka,950,'#bd4936']]){ctx.fillStyle=color;ctx.fillRect(x-270,270,540,320);ctx.fillStyle=x===330?'#183b35':'#fff';ctx.font='bold 38px system-ui';ctx.fillText(name,x,335);ctx.font='22px system-ui';ctx.fillText(dojo,x,375);ctx.font='bold 133px system-ui';ctx.fillText(score(value),x,535);}}
 ctx.fillStyle='#c3d2b9';ctx.font='25px system-ui';ctx.fillText($('#match-status').textContent,640,665);
 }
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register(new URL('../sw.js',location.href)).catch(()=>{});
