import {assertKataHandover} from './kata-review.mjs';
import * as C from './core.mjs';
const fail=(m,status=400)=>Object.assign(Error(m),{status});
export const operationDefaults={name:'Süddeutsche Meisterschaft des DJKB',startTime:'10:00',kataJudges:5,kataTeamJudges:5,regularUntil:'2026-10-21T23:59:59+02:00',lateMultiplier:2,callAnimationSeconds:8,scoreAnimations:true,signal:true,teamPairing:'declared',kumiteBronze:'double',repeatKihon:'three',repeatJiyuIppon:'one',instagramPosts:[]};
export const eventOptions=s=>({...operationDefaults,...s.event});
export function judgesFor(s,g,b){return b.judges?.length||b.judgeCount||s.bouts.find(x=>x.id!==b.id&&x.group===g.code&&x.kind==='points'&&!!x.final===!!b.final&&(x.judges?.length||x.judgeCount))?.judges?.length||s.bouts.find(x=>x.id!==b.id&&x.group===g.code&&x.kind==='points'&&!!x.final===!!b.final&&x.judgeCount)?.judgeCount||g.judgeCount||(g.type===2?eventOptions(s).kataTeamJudges:eventOptions(s).kataJudges);}
export function setOptions(s,u,a){
 if(u?.role!=='admin')throw fail('Nur Wettkampfleitung',403);const next={...s.event};
 const numbers={kataJudges:[5,7],kataTeamJudges:[5,7],rest:[0,30],buffer:[1,2],awardsBreak:[0,120],callAnimationSeconds:[0,20],lateMultiplier:[1,3],teamFactor:[1,3]};
 for(const [k,v]of Object.entries(a.settings||{})){
  if(k in numbers){const [lo,hi]=numbers[k];if(k==='lateMultiplier'&&!Number.isInteger(v*2))throw fail('Gebührenfaktor in halben Schritten wählen');if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi||(['kataJudges','kataTeamJudges'].includes(k)&&![5,7].includes(v))||(!['buffer','lateMultiplier'].includes(k)&&!Number.isInteger(v)))throw fail('Ungültige Einstellung: '+k);}
  else if(['signal','scoreAnimations','continuous'].includes(k)){if(typeof v!=='boolean')throw fail('Ja/nein erforderlich');}
  else if(k==='regularUntil'){if(typeof v!=='string'||!Number.isFinite(Date.parse(v))||Date.parse(v)>Date.parse(s.event.date+'T23:59:59+02:00'))throw fail('Regulären Meldeschluss vor dem Turnierende wählen');}
  else if(k==='startTime'){if(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw fail('Beginn als Uhrzeit angeben');}
  else if(k==='teamPairing'){if(!['declared','draw'].includes(v))throw fail('Teamaufstellung wählen');}
  else if(k==='kumiteBronze'){if(!['single','double','none'].includes(v))throw fail('Kumite-Platzierung auswählen');}
  else if(['repeatKihon','repeatJiyuIppon'].includes(k)){if(!['one','three'].includes(v))throw fail('Eine oder drei Techniken auswählen');}
  else if(k==='instagramPosts'){if(!Array.isArray(v)||v.length>18||v.some(x=>typeof x!=='string'||!/^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(x)))throw fail('Bis zu 18 öffentliche Instagram-Beitragslinks verwenden');}
  else if(k==='name'){if(typeof v!=='string'||v.trim().length<5||v.length>120)throw fail('Veranstaltungsname ungültig');}
  else throw fail('Einstellung nicht erlaubt: '+k);
  next[k]=typeof v==='string'?v.trim():v;
 }
 s.event=next;const changed=[];if(a.settings?.kumiteBronze!==undefined)for(const g of s.groups.filter(g=>[1,3].includes(g.type)&&!g.bronzeConfigured&&!s.bouts.some(b=>b.group===g.code&&b.started))){g.bronze=next.kumiteBronze;s.bouts=s.bouts.filter(b=>b.group!==g.code||!b.bronze);if(g.draw&&g.bronze==='single'){const semis=s.bouts.filter(b=>b.group===g.code&&b.roundSize===4);if(semis.length===2)s.bouts.push(C.newBout(g.code,'match',{sources:semis.map(b=>b.id),fromLoser:true,roundSize:2,round:Math.max(...semis.map(b=>b.round||0))+1,final:true,bronze:true}));}if(g.draw)C.refresh(s,g.code);changed.push(g.code);}return {settings:eventOptions(s),changedGroups:changed};
}
export function ratifyMany(s,u,a){
 if(u?.role!=='admin')throw fail('Nur Wettkampfleitung',403);if(!Array.isArray(a.groups)||!a.groups.length||a.groups.length>100||new Set(a.groups).size!==a.groups.length)throw fail('Gruppen auswählen');
 const groups=a.groups.map(code=>s.groups.find(g=>g.code===code));
 for(const g of groups)if(!g?.active||!g.podium?.length||g.tie||s.bouts.some(b=>b.group===g.code&&b.status!=='done'))throw fail((g?.code||'Gruppe')+' ist noch nicht vollständig entschieden');
 for(const g of groups)assertKataHandover(s,g);
 for(const g of groups)g.ratified=true;return {ratified:groups.map(g=>g.code)};
}
export function drawLineups(s,b){
 if(b.started||b.status!=='ready'||s.groups.find(g=>g.code===b.group)?.type!==3)throw fail('Kumite-Team vor Beginn auswählen');
 for(const side of ['aka','shiro']){const ids=[...C.members(s,b[side])];if(ids.length!==3||new Set(ids).size!==3)throw fail('Drei bestätigte Teammitglieder erforderlich');for(let i=ids.length-1;i>0;i--){const range=i+1,max=0x100000000-0x100000000%range;let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=max);const j=n%range;[ids[i],ids[j]]=[ids[j],ids[i]];}b[side+'Order']=ids;}
 b.lineupDraw={at:new Date().toISOString(),aka:[...b.akaOrder],shiro:[...b.shiroOrder]};return b.lineupDraw;
}
export function unavailable(s,u,b,a){
 if(!['aka','shiro'].includes(a.side)||!['Kampfunfähig','Hansoku','Shikkaku','Kiken'].includes(a.reason))throw fail('Betroffene Seite und Entscheidung wählen');
 const g=s.groups.find(g=>g.code===b.group),f=g.type===3?b.teamFights?.find(f=>f.status==='live'):null;
 if(g.type===3&&!f)throw fail('Zuerst den betroffenen Team-Einzelkampf aufrufen');
 if(b.kind==='points'&&a.side!=='aka')throw fail('Kata-Starter auswählen');
 if(a.reason==='Kampfunfähig'&&!['aka','shiro','none'].includes(a.winner))throw fail('Kampfrichterentscheidung bei Verletzung ausdrücklich angeben');
 if(g.type===3&&a.reason==='Kampfunfähig'&&a.winner==='none')throw fail('Team-Einzelkampf benötigt eine eindeutige Kampfrichterentscheidung');
 const memberIds=C.members(s,b[a.side]);if(g.type===2&&['Kampfunfähig','Shikkaku'].includes(a.reason)&&!memberIds.includes(a.affectedMember))throw fail('Betroffenes Kata-Teammitglied auswählen');
 if(['Kampfunfähig','Shikkaku'].includes(a.reason)){
  const ids=f?[f[a.side+'Member']]:g.type===2?[a.affectedMember]:memberIds;s.medicalHolds??={};for(const id of ids)s.medicalHolds[id]={reason:a.reason,at:new Date().toISOString(),by:u.name,bout:b.id};
 }
 b.unavailable??=[];b.unavailable.push({side:a.side,reason:a.reason,note:String(a.note||'').slice(0,500),at:new Date().toISOString()});
 const winner=a.reason==='Kampfunfähig'?a.winner:a.side==='aka'?'shiro':'aka';
 if(f){f.timer={remaining:C.left(f),since:null};f.status='done';f.winner=winner;f.reason=a.reason==='Kampfunfähig'?'Kiken':a.reason;f.decisionLabel=a.reason;f.ended=new Date().toISOString();b.timer={remaining:0,since:null};if(b.teamFights.length>=3){const result=C.teamResult(b.teamFights.slice(0,3));b.fights=structuredClone(b.teamFights.slice(0,3));b.teamSummary=result;if(result.winner||f.index===3){b.decider=result.winner?null:winner;C.finish(s,b,result.winner||winner,'Teamentscheidung');}}}
 else if(b.kind==='points'){b.timer.since=null;b.status='done';b.reason=a.reason;b.winner=null;b.loser=null;b.ended=new Date().toISOString();b.judges=[];C.refresh(s,b.group);}
 else C.finish(s,b,winner,a.reason);
}
export function setBroadcast(s,u,a){
 if(u?.role!=='admin')throw fail('Nur Wettkampfleitung',403);const t=s.tatamis.find(t=>t.id===a.tatami);if(!t)throw fail('Tatami wählen');const v=a.settings||{};
 if(Object.keys(v).some(k=>!['mode','slide','interstitials','microphone','resumeTime','opacity','layout','theme'].includes(k))||v.mode!==undefined&&!['camera','still'].includes(v.mode)||v.slide!==undefined&&!['event','pause','next','social'].includes(v.slide)||['interstitials','microphone'].some(k=>v[k]!==undefined&&typeof v[k]!=='boolean'))throw fail('Regieeinstellung ungültig');if(v.resumeTime!==undefined&&(typeof v.resumeTime!=='string'||v.resumeTime!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.resumeTime)))throw fail('Fortsetzung als Uhrzeit angeben');
 if(v.opacity!==undefined&&(typeof v.opacity!=='number'||!Number.isFinite(v.opacity)||v.opacity<0.25||v.opacity>1)||v.layout!==undefined&&!['compact','split','top'].includes(v.layout)||v.theme!==undefined&&!['light','dark'].includes(v.theme))throw fail('Einblendungsvariante ungültig');
 t.broadcast={mode:'camera',slide:'event',interstitials:false,microphone:false,...t.broadcast,...v};return {tatami:t.id,broadcast:t.broadcast};
}
export function contactRows(s){
 const rows=new Map();for(const d of s.dojos){const fallback=s.imports.filter(i=>C.norm(i.dojo)===C.norm(d.name)).map(i=>i.raw).find(r=>r?.email);const email=String(d.email||fallback?.email||'').trim().toLowerCase();if(!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email))continue;const previous=rows.get(email);if(previous){previous.dojos.push(d.name);continue;}rows.set(email,{email,contact:String(d.contact||fallback?.contact||'').replace(/[\r\n]/g,' '),dojos:[d.name]});}
 return [...rows.values()].sort((a,b)=>a.dojos[0].localeCompare(b.dojos[0],'de'));
}
export function contactCSV(s){const cell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';return '\uFEFF'+[['E-Mail','Dojo','Kontakt'],...contactRows(s).map(r=>[r.email,r.dojos.join(' / '),r.contact])].map(r=>r.map(cell).join(';')).join('\r\n');}
