export function callMatches(filters,event){return (filters.groups||[]).includes(event.group)||(filters.dojos||[]).some(d=>event.dojos?.includes(d))||(filters.athletes||[]).some(id=>event.people?.includes(id));}
export class CallTracker{
 constructor(){this.run=undefined;this.seen=new Set();}
 update(run,calls,filters,active){if(!Array.isArray(calls))return [];const ids=new Set(calls.map(e=>e.id));if(this.run!==run){this.run=run;this.seen=ids;return [];}const fresh=active?calls.filter(e=>!this.seen.has(e.id)&&callMatches(filters,e)):[];this.seen=ids;return fresh;}
}
export function setupAudienceAlerts({saved,base}){
 const tracker=new CallTracker();let last=null;
 function onState(s){const pref=saved(),active=!!pref&&pref.expires>Date.now()&&pref.run===(s.runId||null)&&!['table','stream'].includes(s.user?.role),fresh=tracker.update(s.runId||null,s.calls,pref?.filters||{},active);if(['table','stream'].includes(s.user?.role)){const existing=document.querySelector('#audience-call');if(existing)existing.hidden=true;}if(!fresh.length)return;last=fresh.find(e=>e.kind==='group')||fresh.at(-1);let box=document.querySelector('#audience-call');if(!box){box=document.createElement('aside');box.id='audience-call';box.className='audience-call';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.innerHTML='<div><strong></strong><p></p><a>Zur Tatami / Starterliste</a></div><button type="button" aria-label="Aufruf schließen">×</button>';box.querySelector('button').onclick=()=>box.hidden=true;document.body.append(box);}box.querySelector('strong').textContent=last.title;box.querySelector('p').textContent=last.body;const u=new URL(last.url,base()),scope=new URL(location.href).searchParams.get('test');if(scope)u.searchParams.set('test',scope);if(u.origin!==location.origin)return;box.querySelector('a').href=u.href;box.hidden=false;}
 return {onState};
}
