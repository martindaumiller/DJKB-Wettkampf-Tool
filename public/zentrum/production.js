import {productionSources,obsCollection} from './production-config.js?v=55';
const status=document.querySelector('#status');
try{
 const raw=new URLSearchParams(location.hash.slice(1)).get('sources'),sources=productionSources(JSON.parse(raw||'null'),location.origin),main=document.querySelector('#feeds'),nav=document.querySelector('#views');
 for(const s of sources){const article=document.createElement('article'),label=document.createElement('h2'),frame=document.createElement('iframe');label.textContent='Tatami '+s.tatami;frame.title='Livebild Tatami '+s.tatami;frame.src=s.url;frame.allow='autoplay';article.dataset.mat=s.tatami;article.append(label,frame);main.append(article);}
 const select=mat=>{main.classList.toggle('single',!!mat);main.querySelectorAll('article').forEach(a=>a.hidden=!!mat&&Number(a.dataset.mat)!==mat);nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mat)===mat)));};
 for(const n of [0,1,2,3,4,5]){const b=document.createElement('button');b.dataset.mat=n;b.textContent=n?'Tatami '+n:'Alle fünf Tatamis';b.onclick=()=>select(n);nav.append(b);}select(0);
 document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||e.ctrlKey||e.altKey||e.metaKey)return;if(/^[0-5]$/.test(e.key)){e.preventDefault();select(Number(e.key));}});
 document.querySelector('#full').onclick=()=>document.documentElement.requestFullscreen();
 const downloadOBS=(clean=false)=>{const blob=URL.createObjectURL(new Blob([JSON.stringify(obsCollection(sources,{clean}),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=blob;a.download=clean?'SDM-2026-Archiv-ohne-Einblendungen.json':'SDM-2026-zentrale-Regie.json';a.click();setTimeout(()=>URL.revokeObjectURL(blob),1000);status.textContent=clean?'Archivvorlage ohne Einblendungen gespeichert. In einem getrennten OBS-Profil aufnehmen oder als zusätzliche YouTube-Übertragung senden.':'OBS-Vorlage gespeichert. Unter Szenensammlung → Importieren öffnen.';};document.querySelector('#obs').onclick=()=>downloadOBS();document.querySelector('#obs-clean').onclick=()=>downloadOBS(true);
 status.textContent='Kamerabilder verbinden sich automatisch. Ausgeschaltete Kameras erscheinen, sobald der Tisch sie einschaltet.';
}catch(e){status.textContent=e.message;document.querySelector('#obs').disabled=true;}
