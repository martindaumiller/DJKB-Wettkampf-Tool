import {resourceURL} from './resource-url.js?v=50';
import {obsCollection,obsSenderCollection} from './production-config.js?v=67';
import {youtubeCheckCard} from './youtube-check.js?v=65';
import {loadHandoffPanel} from './stream-handoff-ui.js?v=68';
export function fiveStreamSources(base=location.href){
 const u=new URL(base),test=u.searchParams.get('test');
 return Array.from({length:5},(_,i)=>{const tatami=i+1,screen=u.searchParams.get('screen'+tatami);if(screen&&!/^[a-f0-9]{64}$/.test(screen))throw Error('Ungültiger Zuschauerlink für Tatami '+tatami);
 const url=new URL(resourceURL(screen?'display.html':'stream-rehearsal.html'));
 url.searchParams.set('tatami',String(tatami));
 if(screen){url.searchParams.set('screen',screen);url.searchParams.set('video','1');if(test)url.searchParams.set('test',test);}else url.searchParams.set('output','1');
 return {tatami,url:url.href,connected:!!screen};});
}
if(typeof document!=='undefined'&&document.querySelector('#five-streams')){
 void loadHandoffPanel(document.querySelector('#handoff-panel'));
 const sources=fiveStreamSources(),grid=document.querySelector('#five-streams'),scope=new URL(location.href).searchParams.get('test')||'sample',youtube=new URLSearchParams(location.hash.slice(1));
 document.querySelector('#probe-kind').textContent=sources.every(s=>s.connected)?'Fünf getrennte Tatami-Ausgaben verbunden. Kameras an den jeweiligen Tischen einschalten.':'Fünf unabhängige Testbilder. Für Kamera und Tische den Fünffach-Test aus der Testleitung öffnen.';
 function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 for(const source of sources){const card=document.createElement('section');card.className='card';const h=document.createElement('h2');h.textContent='Tatami '+source.tatami;card.append(h);
 const frame=document.createElement('iframe');frame.src=source.url;frame.title='Stream-Probe Tatami '+source.tatami;frame.allow='autoplay; fullscreen';frame.style.cssText='width:100%;aspect-ratio:16/9;border:0;background:#111';card.append(frame);
 const a=document.createElement('a');a.className='btn quiet';a.href=source.url;a.target='_blank';a.rel='noopener';a.textContent='Einzelausgabe / OBS';card.append(a);
 const exportButton=document.createElement('button');exportButton.textContent='OBS · Tatami '+source.tatami+' · 720p';exportButton.onclick=()=>download(obsSenderCollection(source),'SDM26-OBS-Tatami-'+source.tatami+'.json');card.append(exportButton);
 youtubeCheckCard(card,source.tatami,{initial:youtube.get('yt'+source.tatami)||'',scope});
 for(const [id,label]of [['picture','Bild, Tatami-Nummer und Seiten stimmen'],['score','Aufruf, Uhr, Noten und Stechen erscheinen korrekt'],['medical','Arztunterbrechung blendet Bild und Ton aus'],['audio','Ton und Synchronität in der Plattformvorschau geprüft'],['reconnect','Verbindungsabbruch und Wiederverbindung geprüft'],['platform','Eigener Stream in der Plattformvorschau geprüft']]){const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';const key='sdm-five:'+scope+':'+source.tatami+':'+id;try{c.checked=localStorage.getItem(key)==='1';}catch{}c.onchange=()=>{try{localStorage.setItem(key,c.checked?'1':'0');}catch{}};l.append(c,document.createTextNode(label));card.append(l);}grid.append(card);}
 document.querySelector('#obs-five').onclick=()=>download(obsCollection(sources),'SDM26-OBS-Fuenf-Tatamis.json');
}
