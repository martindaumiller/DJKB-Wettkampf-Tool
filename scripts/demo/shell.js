import {resetDemo} from './demo-transport.js';
const bar=document.createElement('aside');bar.className='demo-toolbar';bar.setAttribute('aria-label','Turnierprobe');
const base=new URL('./index.html',import.meta.url),links=[['leitung','Leitung','manage'],...Array.from({length:5},(_,i)=>['tisch'+(i+1),'Tisch '+(i+1),'desk']),['coach','Coach','trainer'],['regie','Regie','production'],['publikum','Publikum','live']];
const q=new URLSearchParams(location.search),role=q.get('demoRole')||'tisch1';
bar.innerHTML='<strong>TURNIERPROBE</strong><nav aria-label="Proberolle wählen">'+links.map(([id,name,hash])=>{const u=new URL(base);u.searchParams.set('demoRole',id);u.hash=hash;return '<a href="'+u.href+'"'+(id===role?' aria-current="page"':'')+'>'+name+'</a>';}).join('')+'</nav><button id="demo-reset" type="button">Neue Probe</button><a href="../../../">Zur Übersicht</a><p>Originaloberfläche und Wettkampfkern · fiktive Starter · gemeinsamer Stand in Tabs dieses Browsers. Für mehrere Geräte: lokaler Hallenserver.</p>';
document.body.prepend(bar);
bar.querySelector('#demo-reset').onclick=async()=>{if(!confirm('Die fiktive Turnierprobe für alle Tabs dieses Browsers neu beginnen?'))return;const r=await resetDemo(),v=await r.json();if(!r.ok){alert(v.error);return;}location.reload();};
document.addEventListener('click',async event=>{
 const link=event.target.closest('a[href]');if(!link)return;const u=new URL(link.href);if(u.origin!==location.origin||!u.pathname.includes('/api/')||!/(print|winners|public-export)$/.test(u.pathname))return;
 event.preventDefault();const {demoFetch}=await import('./demo-transport.js');const r=await demoFetch(u);if(!r.ok){alert((await r.json()).error);return;}const blob=await r.blob(),url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);
});
