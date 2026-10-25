import {resourceURL,centerURL} from './resource-url.js?v=50';
import {streamURLs} from './stream-links.js?v=68';
export function streamTatami(search){const value=new URLSearchParams(search).get('tatami');return /^[1-5]$/.test(value||'')?Number(value):null;}
export function competitionLink(tatami,base){if(!Number.isInteger(tatami)||tatami<1||tatami>5)throw Error('Tatami 1–5 wählen');const url=new URL('stream.html',base);url.searchParams.set('tatami',String(tatami));return url.href;}
if(typeof document!=='undefined'&&document.getElementById('player')){
 const t=streamTatami(location.search),status=document.getElementById('status'),player=document.getElementById('player'),nav=document.getElementById('tatamis');let current=null,busy=false;
 for(let n=1;n<=5;n++){const a=document.createElement('a');a.className='btn quiet';a.href=competitionLink(n,centerURL('./'));a.textContent='Tatami '+n;if(n===t)a.setAttribute('aria-current','page');nav.append(a);}
 if(!t)status.textContent='Oben eine der fünf Tatamis wählen.';
 else{
  document.title='SDM 2026 · Tatami '+t;document.getElementById('title').textContent='Wettkampfstream · Tatami '+t;
  async function refresh(){if(busy||document.hidden)return;busy=true;try{const response=await fetch(resourceURL('api/public-state'),{credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('Zuordnung gerade nicht erreichbar');const s=await response.json(),urls=streamURLs(s.tatamis?.find(x=>x.id===t)?.stream);status.textContent=urls?'Übertragung für Tatami '+t+' hinterlegt. Wiedergabe bei Bedarf starten.':'Der YouTube-Wettkampfstream für Tatami '+t+' wird vorbereitet. Dieser Link aktualisiert sich automatisch.';if((urls?.embed||'')===current)return;current=urls?.embed||'';player.replaceChildren();if(urls){const iframe=document.createElement('iframe');iframe.className='stream';iframe.title='Wettkampfstream Tatami '+t;iframe.src=urls.embed;iframe.allow='encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';const p=document.createElement('p'),a=document.createElement('a');a.href=urls.watch;a.target='_blank';a.rel='noopener';a.className='btn';a.textContent=urls.videoId?'Auf YouTube öffnen':'Übertragung öffnen';p.append(a);player.append(iframe,p);}}catch{status.textContent='Verbindung zur Stream-Zuordnung unterbrochen. Erneuter Versuch folgt.';}finally{busy=false;}}
  void refresh();setInterval(refresh,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 }
}
