import {centerURL} from './resource-url.js?v=50';
import {youtubeId} from './youtube-check.js?v=65';
const youtubeHosts=new Set(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com']);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function streamURLs(value){
 const input=String(value??'').trim();if(!input)return null;
 const u=new URL(input);if(u.protocol!=='https:'||u.username||u.password)throw Error('HTTPS-Zuschauerlink ohne Zugangsdaten erforderlich');
 const id=youtubeId(u.href);if(youtubeHosts.has(u.hostname)&&!id)throw Error('Gültigen YouTube-Zuschauerlink mit Video-ID verwenden');
 return id?{videoId:id,watch:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube-nocookie.com/embed/'+id+'?playsinline=1&rel=0'}:{videoId:null,watch:u.href,embed:u.href};
}
export function publicStreamCards(tatamis){return tatamis.map(t=>{let urls=null,invalid=false;try{urls=streamURLs(t.stream);}catch{invalid=true;}return '<section class="card"><div class="tatami-head"><h3 class="tatami-number">Tatami '+esc(t.id)+'</h3><span class="pill">'+(urls?'Stream hinterlegt':invalid?'Link wird geprüft':'Link folgt')+'</span></div><p><a href="'+esc(centerURL('stream.html?tatami='+t.id))+'">Fester Zuschauerlink · Tatami '+esc(t.id)+'</a></p>'+(urls?'<iframe title="Wettkampfstream Tatami '+esc(t.id)+'" class="stream" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="'+esc(urls.embed)+'" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe><p><a class="btn quiet" href="'+esc(urls.watch)+'" target="_blank" rel="noopener">'+(urls.videoId?'Auf YouTube öffnen':'Stream öffnen')+' ↗</a></p>':'<p class="muted">Der Wettkampfstream für Tatami '+esc(t.id)+' ist noch nicht zugeordnet. Der Zuschauerlink erscheint hier, sobald er hinterlegt ist.</p>')+'</section>';}).join('');}
export function publicStreamOverview(tatamis){return '<section aria-labelledby="streams-title"><div class="bar"><h2 id="streams-title">Livestreams · fünf Tatamis</h2></div><p>Am 24. Oktober jede Tatami einzeln verfolgen. Die Zuordnung des Zuschauerlinks bestätigt noch keinen laufenden Stream.</p><div class="grid">'+publicStreamCards(tatamis)+'</div></section>';}
