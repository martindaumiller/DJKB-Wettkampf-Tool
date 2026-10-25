const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let groups=[],limit=10;
const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de');
function render(){
 const query=normalize($('#search').value.trim()),kind=$('#discipline').value;
 const selected=groups.filter(g=>(!kind||g.kind===kind)&&(!query||normalize(JSON.stringify(g)).includes(query)));
 $('#result-count').textContent=selected.length+' von '+groups.length+' Gruppen';
 $('#results').innerHTML=selected.slice(0,limit).map(g=>'<article class="result-card"><header><span class="group-code">'+esc(g.code)+'</span><h3>'+esc(g.title)+'</h3></header><p class="desc">'+esc(g.desc)+'</p>'+g.winners.map(w=>'<div class="winner"><span class="rank">'+esc(w.rank)+'</span><div><strong>'+esc(w.name)+'</strong><small>'+esc(w.dojo)+'</small>'+(w.members?'<div class="members">'+esc(w.members)+'</div>':'')+'</div></div>').join('')+'</article>').join('')||'<p>Keine passende Gruppe. Suchbegriff oder Disziplin ändern.</p>';
 $('#more-results').hidden=limit>=selected.length;
}
$('#result-filter').addEventListener('submit',e=>e.preventDefault());
for(const s of ['#search','#discipline'])$(s).addEventListener('input',()=>{limit=10;render();});
$('#more-results').onclick=()=>{limit+=12;render();};
try{
 const r=await fetch(new URL('../ergebnisse/results.json',import.meta.url));if(!r.ok)throw Error();
 const d=await r.json();groups=d.groups;render();
 $('#stats').innerHTML='<span>'+groups.length+'<small>Wettbewerbsgruppen</small></span><span>'+groups.reduce((n,g)=>n+g.winners.length,0)+'<small>Platzierungen</small></span><span>'+d.dojoCount+'<small>Dojos mit Platzierungen</small></span>';
 if(d.pdfBytes)document.querySelectorAll('.file-size').forEach(el=>el.textContent='('+Math.round(d.pdfBytes/1024)+' KB)');
}catch{$('#result-count').textContent='Die Onlineübersicht ist gerade nicht verfügbar. Die Siegerliste als PDF enthält alle Ergebnisse.';}
function calculate(){
 const streams=Math.min(10,Math.max(1,Number($('#streams').value)||1)),rate=Math.min(20,Math.max(.5,Number($('#bitrate').value)||3)),reserve=Math.min(200,Math.max(20,Number($('#reserve').value)||50));
 $('#bandwidth').textContent=(streams*(rate+.16)*(1+reserve/100)).toLocaleString('de',{maximumFractionDigits:1})+' Mbit/s stabiler Upload als Planwert';
}
for(const s of ['#streams','#bitrate','#reserve'])$(s).oninput=calculate;calculate();
if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register(new URL('../sw.js',import.meta.url)).catch(()=>{});
