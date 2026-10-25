export function youtubeId(value){
 if(/^[\w-]{11}$/.test(value||''))return value;
 try{const u=new URL(value);if(u.protocol!=='https:'||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname))return null;const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/(?:live|embed)\/([\w-]{11})$/)?.[1];return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}
}
export class PlaybackCheck{
 constructor(){this.reset();}
 reset(){this.from=null;this.last=null;this.samples=0;this.passed=false;}
 observe({state,time},now=Date.now()){
  if(state!==1||!Number.isFinite(time)){if(!this.passed){this.from=null;this.samples=0;}return this.passed;}
  if(this.last!=null&&(time<this.last||time-this.last>5)){this.reset();}
  if(this.from==null)this.from={time,now};
  this.last=time;this.samples++;
  if(this.samples>=4&&time-this.from.time>=5&&now-this.from.now>=5000)this.passed=true;
  return this.passed;
 }
}
let api;
function playerAPI(){if(globalThis.YT?.Player)return Promise.resolve(globalThis.YT);if(api)return api;api=new Promise((resolve,reject)=>{const old=globalThis.onYouTubeIframeAPIReady;globalThis.onYouTubeIframeAPIReady=()=>{old?.();resolve(globalThis.YT);};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{api=null;reject(Error('YouTube-Player konnte nicht geladen werden.'));};document.head.append(script);});return api;}
export function youtubeCheckCard(card,tatami,{initial='',scope='sample'}={}){
 const section=document.createElement('section');section.className='youtube-check';
 const label=document.createElement('label');label.textContent='YouTube-Testlink · Tatami '+tatami;
 const input=document.createElement('input');input.type='url';input.placeholder='https://www.youtube.com/watch?v=…';input.value=initial;label.append(input);section.append(label);
 const button=document.createElement('button');button.textContent='YouTube-Wiedergabe prüfen';section.append(button);
 const link=document.createElement('a');link.target='_blank';link.rel='noopener';link.textContent='Auf YouTube öffnen';link.hidden=true;section.append(link);
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='YouTube-Wiedergabe noch nicht geprüft.';section.append(status);
 const host=document.createElement('div');section.append(host);card.append(section);
 let player,timer;const checker=new PlaybackCheck();
 button.onclick=async()=>{const id=youtubeId(input.value);if(!id){status.textContent='Gültigen YouTube-Link eintragen.';return;}button.disabled=true;clearInterval(timer);player?.destroy();checker.reset();host.replaceChildren();const target=document.createElement('div');host.append(target);status.textContent='YouTube-Player wird geladen. Danach im Player auf Wiedergabe klicken.';link.href='https://www.youtube.com/watch?v='+id;link.hidden=false;
  try{const YT=await playerAPI();player=new YT.Player(target,{host:'https://www.youtube-nocookie.com',width:'100%',height:'280',videoId:id,playerVars:{playsinline:1,origin:location.origin,autoplay:0},events:{onReady:()=>{status.textContent='Im YouTube-Player starten. Mindestens fünf Sekunden Wiedergabe abwarten.';timer=setInterval(()=>{const state=player.getPlayerState(),time=player.getCurrentTime();if(checker.observe({state,time})){status.textContent='✓ YouTube gibt dieses Bild seit mindestens fünf Sekunden wieder. Ton und richtige Tatami zusätzlich prüfen.';status.dataset.passed='true';clearInterval(timer);try{sessionStorage.setItem('sdm-youtube-check:'+scope+':'+tatami,JSON.stringify({video:id,at:new Date().toISOString(),playback:true,audio:false}));}catch{}}else if(state===3)status.textContent='YouTube puffert. Die Wiedergabeprüfung wartet auf ein laufendes Bild.';},1000);},onError:e=>{clearInterval(timer);status.textContent='YouTube meldet Fehler '+e.data+'. Streamstatus in YouTube Studio prüfen.';},onStateChange:e=>{if(e.data===0&&!checker.passed)status.textContent='Wiedergabe beendet, bevor der Test abgeschlossen war.';}}});}catch(e){status.textContent=e.message;}finally{button.disabled=false;}
 };
 const id=youtubeId(initial);if(id){link.href='https://www.youtube.com/watch?v='+id;link.hidden=false;}
 window.addEventListener('pagehide',()=>{clearInterval(timer);player?.destroy();},{once:true});
}
