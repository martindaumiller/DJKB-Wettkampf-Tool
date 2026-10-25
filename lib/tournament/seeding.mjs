import {createHash} from 'node:crypto';
const norm=x=>String(x??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
function random(seed){let a=parseInt(createHash('sha256').update(seed).digest('hex').slice(0,8),16);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
export function makeSlots(es,seed){
 let size=1;while(size<es.length)size*=2;
 if(!es.length)return [];
 const by=new Map(es.map(e=>[e.id,e])),ranked=es.filter(e=>e.seed).sort((a,b)=>a.seed-b.seed);
 if(ranked.length>4)throw Error('Höchstens vier Setzpositionen je Gruppe');
 if(ranked.some(e=>!Number.isInteger(e.seed)||e.seed<1||e.seed>4))throw Error('Setzposition 1–4 wählen');
 if(new Set(ranked.map(e=>e.seed)).size!==ranked.length)throw Error('Setzpositionen 1–4 innerhalb einer Gruppe nur einmal vergeben');
 const priorities=es.filter(e=>e.cadre&&!e.seed),rng=random(seed),depth=Math.log2(size),trials=Math.max(4,Math.min(250,Math.floor(400000/Math.max(1,size*(priorities.length+ranked.length)*Math.max(1,depth)))));
 let best,bestCost;
 for(let trial=0;trial<trials;trial++){
  const arr=Array(size).fill(null),counts=Array.from({length:depth},(_,i)=>Array(size/(2**(i+1))).fill(0));
  const insert=(e,p)=>{arr[p]=e.id;if(e.cadre||e.seed)counts.forEach((c,i)=>c[Math.floor(p/(2**(i+1)))]++);};
  const anchors=[0,size-1,Math.floor(size/2),Math.max(0,Math.floor(size/2)-1)];ranked.forEach(e=>{const anchor=anchors[e.seed-1];insert(e,arr[anchor]?arr.indexOf(null):anchor);});
  for(const e of shuffle(priorities,rng)){
   let choices=[],minimum;
   for(let p=0;p<size;p++)if(!arr[p]){const score=counts.map((c,i)=>c[Math.floor(p/(2**(i+1)))]);const diff=minimum?compare(score,minimum):-1;if(diff<0){minimum=score;choices=[p];}else if(diff===0)choices.push(p);}
   insert(e,choices[Math.floor(rng()*choices.length)]);
  }
  for(const e of shuffle(es.filter(e=>!e.cadre&&!e.seed),rng)){
   const free=arr.map((x,i)=>x===null?i:-1).filter(i=>i>=0),empty=free.filter(p=>!arr[p^1]&&size>1),choices=empty.length?empty:free;
   insert(e,choices[Math.floor(rng()*choices.length)]);
  }
  let empty=0,cadre=0,dojo=0,close=0,dojoQuarter=0;
  for(let p=0;p<size;p+=2){const a=by.get(arr[p]),b=by.get(arr[p+1]);if(!a&&!b&&size>1)empty++;if(a&&b){if(a.cadre&&b.cadre)cadre++;if(norm(a.dojo)===norm(b.dojo))dojo++;}}
  for(let block=2;block<size;block*=2)for(let p=0;p<size;p+=block){const group=arr.slice(p,p+block).map(id=>by.get(id)).filter(Boolean),k=group.filter(e=>e.cadre||e.seed).length;close+=k*(k-1)/2*(size/block);if(block===4)for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)if(norm(group[i].dojo)===norm(group[j].dojo))dojoQuarter++;}
  const cost=[empty,cadre,close,dojo,dojoQuarter];if(!bestCost||compare(cost,bestCost)<0){best=arr;bestCost=cost;}
 }
 return best;
}
export function drawConstraints(es,slots){const by=new Map(es.map(e=>[e.id,e]));let cadrePairings=0,dojoPairings=0;for(let i=0;i<slots.length;i+=2){const a=by.get(slots[i]),b=by.get(slots[i+1]);if(a&&b){if(a.cadre&&b.cadre)cadrePairings++;if(norm(a.dojo)===norm(b.dojo))dojoPairings++;}}return {cadrePairings,dojoPairings,cadre:es.filter(e=>e.cadre).length,seeded:es.filter(e=>e.seed).length};}
export function markDrawsFor(s,ids){const affected=new Set(s.entries.filter(e=>e.active&&(ids.has(e.personId)||e.kind==='team'&&s.teams.find(t=>t.id===e.personId)?.memberIds?.some(id=>ids.has(id)))).map(e=>e.group));const redraw=[],protectedGroups=[];for(const code of affected){const g=s.groups.find(g=>g.code===code);if(!g?.draw)continue;if(g.ratified||s.bouts.some(b=>b.group===code&&b.started))protectedGroups.push(code);else{g.draw.seedingStale=true;redraw.push(code);}}return {redraw,protectedGroups};}
export function changeCadre(s,a){
 if(!Array.isArray(a.changes)||!a.changes.length||a.changes.length>2000||new Set(a.changes.map(x=>x.id)).size!==a.changes.length)throw Error('Kaderauswahl fehlt oder ist doppelt');
 const changes=a.changes.map(x=>{const p=s.people.find(p=>p.id===x.id);if(!p||typeof x.cadre!=='boolean'||!Number.isInteger(x.seed)||x.seed<0||x.seed>4)throw Error('Kader und Setzposition 0–4 prüfen');if(x.expectedCadre!==undefined&&(!!p.cadre!==x.expectedCadre||(p.seed||0)!==x.expectedSeed))throw Object.assign(Error('Kaderangabe wurde inzwischen geändert. Auswahl neu laden.'),{status:409});return {p,...x};});
 const next=new Map(changes.map(x=>[x.id,x])),affected=new Set(s.entries.filter(e=>e.active&&e.kind==='person'&&next.has(e.personId)).map(e=>e.group));for(const g of s.groups.filter(g=>g.active&&affected.has(g.code))){const ranks=s.entries.filter(e=>e.active&&e.kind==='person'&&e.group===g.code).map(e=>next.get(e.personId)?.seed??s.people.find(p=>p.id===e.personId)?.seed??0).filter(Boolean);if(ranks.length>4||new Set(ranks).size!==ranks.length)throw Error(g.code+': Setzpositionen 1–4 nur einmal je Gruppe vergeben');}
 for(const x of changes){if(x.cadreOverride!==undefined&&x.cadreOverride!==null&&typeof x.cadreOverride!=='boolean')throw Error('Leitungsauswahl ungültig');if(x.expectedOverride!==undefined&&x.expectedOverride!==(x.p.cadreOverride??null)||x.expectedCoach!==undefined&&x.expectedCoach!==coachCadre(x.p))throw Object.assign(Error('Kaderangabe wurde inzwischen geändert. Auswahl neu laden.'),{status:409});}
 for(const x of changes)if(x.cadreOverride!==undefined)x.cadre=typeof x.cadreOverride==='boolean'?x.cadreOverride:coachCadre(x.p);
 const affectedDraws=new Set(),changed=changes.filter(x=>!!x.p.cadre!==x.cadre||(x.p.seed||0)!==x.seed||x.cadreOverride!==undefined&&x.cadreOverride!==(x.p.cadreOverride??null));
 for(const x of changed){if(!!x.p.cadre!==x.cadre||(x.p.seed||0)!==x.seed)affectedDraws.add(x.id);x.p.cadreOverride=x.cadreOverride!==undefined?x.cadreOverride:x.cadre;x.p.cadre=x.cadre;x.p.seed=x.seed;}
 return {changed:changed.length,...markDrawsFor(s,affectedDraws)};
}
export const coachCadre=p=>typeof p.cadreCoach==='boolean'?p.cadreCoach:typeof p.cadreOverride==='boolean'?false:!!p.cadre;
export function changeCoachCadre(s,u,a){
 if(!u.dojo||!Array.isArray(a.changes)||!a.changes.length||a.changes.length>2000||new Set(a.changes.map(x=>x.id)).size!==a.changes.length)throw Error('Kaderauswahl fehlt oder ist doppelt');
 const changes=a.changes.map(x=>{const p=s.people.find(p=>p.id===x.id);if(!p||p.dojo!==u.dojo)throw Object.assign(Error('Nur Athleten des eigenen Dojos markieren'),{status:403});if(typeof x.cadre!=='boolean'||Object.keys(x).some(k=>!['id','cadre','expectedCoach'].includes(k)))throw Error('Nur Kaderkennzeichnung ohne Setzung erlaubt');if(typeof x.expectedCoach!=='boolean'||coachCadre(p)!==x.expectedCoach)throw Object.assign(Error('Coach-Auswahl wurde inzwischen geändert. Bitte neu laden.'),{status:409});return {p,...x};});
 const changed=changes.filter(x=>coachCadre(x.p)!==x.cadre),affected=new Set();
 for(const x of changed){const before=!!x.p.cadre;x.p.cadreCoach=x.cadre;x.p.cadre=typeof x.p.cadreOverride==='boolean'?x.p.cadreOverride:x.cadre;if(before!==x.p.cadre)affected.add(x.id);}
 return {changed:changed.length,...markDrawsFor(s,affected)};
}
