import {drawIdentity,broadcastStyle} from './broadcast-style.js?v=47';
import {sceneData,productionScene,drawScene} from './broadcast-scenes.js?v=50';
import {kataView} from './live-presentation.js?v=46';
import {boutSummary} from './bout-summary.js?v=36';
import {screenSides} from './display-layout.js?v=30';
export const EVENT_TITLE='Süddeutsche Meisterschaft des DJKB';
export function broadcastData(s,tatami){
 const mat=b=>b.startedTatami||s.queue?.find(q=>q.group===b.group&&(q.pool||0)===(b.pool||0))?.tatami||s.groups.find(g=>g.code===b.group)?.tatami;
 const settings=s.tatamis?.find(t=>t.id===tatami)||{},bs=s.bouts.filter(b=>mat(b)===tatami),live=bs.find(b=>b.status==='live'),last=bs.filter(b=>b.ended).sort((a,b)=>b.ended.localeCompare(a.ended))[0],ready=bs.filter(b=>b.status==='ready').sort((a,b)=>(a.callRank??1e9)-(b.callRank??1e9)),b=live||last||ready[0],g=s.groups.find(g=>g.code===b?.group),info=b?boutSummary(g,b):null;
 const name=id=>{const e=s.entries.find(e=>e.id===id);if(e?.name)return {name:e.name,dojo:e.dojo||''};const p=(e?.kind==='team'?s.teams:s.people)?.find(p=>p.id===e?.personId);return {name:p?.name||(p?[p.first,p.last].join(' '):'Nächster Aufruf folgt'),dojo:p?.dojo||''};};
 const technical=/Kihon|Jiyu-Ippon/.test(g?.description||'')&&!(g.description.includes('die letzten 8')&&b.roundSize<=8),f=info?.fight;
 const result={tatami,title:EVENT_TITLE,live:!!live,bout:b?.id,group:b?.group,round:b?.bronze?'Platz 3':b?.final?'Finale':b?.pool?'Pool '+b.pool:'Vorrunde',kata:b?.kind==='points',flag:(g?.type===0||g?.type===2)&&b?.kind!=='points',performance:kataView(b).kata,judges:kataView(b).values,total:kataView(b).total,provisional:kataView(b).provisional,settings:{mode:'camera',slide:'event',microphone:false,interstitials:false,theme:'light',...settings.broadcast},paused:!!settings.paused,animations:s.event.scoreAnimations!==false,stale:Date.now()-(s.receivedAt||Date.now())>10000,sides:screenSides(settings.orientation||0),state:b?.status,team:!!info?.team,wins:info?.wins,next:ready.find(x=>x.id!==b?.id)};
 for(const side of ['aka','shiro'])result[side]={...name(b?.[side]),name:f?.[side+'Name']||name(b?.[side]).name,score:result.flag?'⚑':technical?(b.kihonScoring==='overall'?'Hantei':String((b.exchanges||[]).filter(x=>x.winner===side).length)):info?.team&&!f?String(info.wins[side]):((f?.score?.[side]||b?.score?.[side]||0)/2).toLocaleString('de-DE',{minimumFractionDigits:1}),penalties:result.kata||result.flag?[]:f?.penalties?.[side]||b?.penalties?.[side]||[]};
 if(b&&(g?.type===3||g?.type===1&&!technical)){const time=Date.now()-(s.receivedAt||Date.now())>10000?(s.serverTime||Date.now()):s.clockEpoch!=null?s.clockEpoch+performance.now()-s.clockMono:Date.now()+(s.serverTime||s.receivedAt||Date.now())-(s.receivedAt||Date.now()),left=Math.ceil(Math.max(0,b.timer.remaining-(b.timer.since?time-b.timer.since:0))/1000);result.clock=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');}
 if(result.next)result.next={group:result.next.group,final:!!result.next.final,aka:name(result.next.aka).name,shiro:result.next.shiro?name(result.next.shiro).name:''};
 const candidate=ready[0],job=candidate&&s.dispatch?.find(q=>q.group===candidate.group&&(q.pool||null)===(candidate.pool||null)&&q.tatami===tatami),review=s.fieldPresentations?.find(f=>f.tatami===tatami),own=candidate?bs.filter(x=>x.group===candidate.group&&(x.pool||null)===(candidate.pool||null)&&!!x.final===!!candidate.final):[];
 if(!live&&job?.released&&!job.held&&review?.phase!=='completed'&&!own.some(x=>x.started&&x.reason!=='Freilos')){result.calling={group:candidate.group,pool:candidate.pool,final:!!candidate.final,label:s.groups.find(g=>g.code===candidate.group)?.description,people:[...new Set(own.flatMap(x=>[x.shiro,x.aka]).filter(Boolean))].map(name)};result.next=null;}
 return {...result,...sceneData(s,tatami,b)};
}
export function drawBroadcast(c,canvas,d,{logo=null,source=null,now=performance.now(),memory={}}={}){
 const opacity=Math.max(.25,Math.min(1,d.settings.opacity??.75)),layout=d.settings.layout||'compact',dark=d.settings.theme==='dark',ink=dark?'#fff':'#101820',muted=dark?'#c7d4e5':'#354359',panel=a=>dark?'rgba(16,28,46,'+a+')':'rgba(255,255,255,'+a+')';
 c.save();c.scale(canvas.width/1280,canvas.height/720);
 const text=(s,x,y,size=20,color=ink,weight=600,width=Infinity)=>{c.fillStyle=color;c.font=weight+' '+size+'px Arial';let t=String(s??'');if(c.measureText(t).width>width){while(t.length&&c.measureText(t+'…').width>width)t=t.slice(0,-1);t+='…';}c.fillText(t,x,y);},box=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
 const scene=productionScene(d),still=!['camera','replay'].includes(scene);
 if(scene==='medical'){box(0,0,1280,720,'#050609');}else if(source){const iw=source.videoWidth||source.width||1280,ih=source.videoHeight||source.height||720,k=Math.max(1280/iw,720/ih);c.drawImage(source,(1280-iw*k)/2,(720-ih*k)/2,iw*k,ih*k);}else{const grad=c.createLinearGradient(0,0,1280,720);grad.addColorStop(0,dark?'#101b2c':'#fff');grad.addColorStop(1,dark?'#2c405d':'#e7ecf2');c.fillStyle=grad;c.fillRect(0,0,1280,720);}
 if(memory.scene!==scene||memory.changedAt!==d.production?.changedAt){memory.scene=scene;memory.changedAt=d.production?.changedAt;memory.sceneAt=now;}
 drawIdentity(c,d,{text,box,panel,ink,muted,logo,opacity});
 if(still){c.save();if(scene!=='medical'&&d.production?.transition&&d.animations)c.globalAlpha=Math.min(1,Math.max(.05,(now-memory.sceneAt)/280));drawScene(c,d,scene,{text,box,ink,muted,panel,opacity,now,logo,sceneElapsed:now-memory.sceneAt});c.restore();c.restore();return;}

 memory.scene=scene;
 if(d.replayActive){box(32,104,300,36,'rgba(188,23,55,.85)');text('↶ WIEDERHOLUNG · OHNE TON',44,129,16,'#fff',800,276);c.restore();return;}
 const p=broadcastStyle(d.production),hasClock=!!d.clock&&!d.kata&&!d.flag;
 if(hasClock){const cx=p.safeX,cy=p.safeY+59*p.identityScale+7;box(cx,cy,140,45,panel(opacity));text(d.clock,cx+10,cy+33,31,ink,800,120);}
 const y=layout==='top'?103:d.kata?562:580,x=36,w=1208,h=d.kata?122:104,split=layout==='split'&&!d.kata;
 if(split){box(36,y,536,h,panel(opacity));box(708,y,536,h,panel(opacity));}else box(x,y,w,h,panel(opacity));
 box(x,y,4,h,'#bc002a');c.save();c.globalAlpha=.04;c.fillStyle=dark?'#fff':'#172438';c.font='bold 88px sans-serif';c.fillText('空手',split?963:1000,y+91);c.restore();
 const context=[hasClock?'':'TATAMI '+d.tatami,d.group,d.round,d.flag?d.performance:''].filter(Boolean).join('  ·  ');text(context,x+18,y+21,14,muted,750,split?490:970);if(d.stale)text('Verbindung prüfen',split?727:1055,y+21,13,'#a16000',750,175);else if(d.team&&d.wins)text('Teams '+d.wins.shiro+' : '+d.wins.aka,split?727:1080,y+21,13,muted,750,155);
 const key=d.bout+'|'+JSON.stringify(d.judges);if(memory.judgeKey!==key){memory.judgeKey=key;memory.judgeAt=now;}
 if(d.kata){text(d.aka.name,x+18,y+53,29,ink,750,850);text([d.aka.dojo,d.performance].filter(Boolean).join(' · '),x+18,y+78,17,muted,600,850);const marks=d.judges||[],elapsed=d.animations?now-memory.judgeAt:99999,complete=[5,7].includes(marks.length)&&marks.every(n=>typeof n==='number'),lo=complete?marks.indexOf(Math.min(...marks)):-1,hi=complete?marks.lastIndexOf(Math.max(...marks)):-1;
  marks.forEach((n,i)=>{if(n==null)return;const mx=x+18+i*92,my=y+108,cut=(i===lo||i===hi)&&elapsed>1400;text(n.toFixed(1).replace('.',','),mx,my,24,cut?(dark?'#9aa9bc':'#68788e'):ink,750);if(cut){c.strokeStyle='#bc002a';c.lineWidth=2.5;c.beginPath();c.moveTo(mx-2,my-9);c.lineTo(mx+44,my-9);c.stroke();}});
  if(d.total!=null&&elapsed>1900)text(d.total.toFixed(1).replace('.',','),x+1008,y+89,64,ink,800,185);
 }else{d.sides.forEach((side,i)=>{const a=d[side],dx=split?(i?726:54):54+i*600,nameWidth=split?373:425,scoreX=dx+(split?424:475),scoreKey=d.bout+'|'+side;if(memory[scoreKey]!==a.score){memory[scoreKey]=a.score;memory[scoreKey+'At']=now;}const bump=d.animations?Math.max(0,1-(now-memory[scoreKey+'At'])/400):0;
  box(dx,y+35,5,57,side==='aka'?'#bc002a':dark?'#fff':'#172438');text(side==='aka'?'AKA':'SHIRO',dx+13,y+46,11,side==='aka'?(dark?'#ffa5b7':'#b00025'):muted,800);text(a.name,dx+13,y+75,27,ink,750,nameWidth);text(a.dojo,dx+13,y+95,14,muted,600,nameWidth);text(a.score,scoreX,y+76,46+bump*5,ink,800,95);const warning=(a.penalties||[]).map(p=>({general:'K',jogai:'J',mubobi:'M'}[p.family])+p.level).filter((v,i,a)=>a.lastIndexOf(v)===i).join(' ');if(warning)text(warning,scoreX,y+97,13,dark?'#ffd58e':'#8a4700',750,100);
 });}
 c.restore();
}

