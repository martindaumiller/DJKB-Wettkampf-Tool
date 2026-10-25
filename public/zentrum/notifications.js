import {resourceURL,centerURL} from './resource-url.js?v=50';
import {setupAudienceAlerts} from './audience-alerts.js?v=49';
import {reportURL} from './practical-tools.js?v=37';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=v=>Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function setupNotifications({getState,api,toast,render}){
 const scope=new URLSearchParams(location.search),storageKey=scope.has('test')?'sdm-push-test:'+scope.get('test'):scope.get('practice')==='1'?'sdm-push-practice':'sdm-push-device';
 let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
 const filters={groups:new Set(Array.isArray(saved?.filters?.groups)?saved.filters.groups:[]),dojos:new Set(Array.isArray(saved?.filters?.dojos)?saved.filters.dojos:[]),athletes:new Set(Array.isArray(saved?.filters?.athletes)?saved.filters.athletes:[])};let loading=false,busy=false,config=null,lastRole='',sending=false,lastDelivery=null,lastFailure=0,search='',opened={dojos:true,groups:false,athletes:false};
 const store=()=>{try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{toast('Gerätespeicher blockiert. Auswahl gilt bis zum Schließen dieser Seite.');}};
 const alerts=setupAudienceAlerts({saved:()=>saved,base:()=>centerURL('./')});
 const selected=()=>Object.fromEntries(Object.entries(filters).map(([k,v])=>[k,[...v]]));
 const supported=()=>('serviceWorker'in navigator)&&('PushManager'in window)&&('Notification'in window);
 async function load(){if(loading||config)return;loading=true;try{config=await api('push-config');if(location.hash==='#notify')render();}catch(e){toast(e.message);}finally{loading=false;}}
 function view(){const s=getState();load();const roster=s.athletes||s.people?.map(p=>({id:p.id,name:p.first+' '+p.last,dojo:p.dojo}))||[];if(s.user?.role==='trainer'&&!saved&&Object.values(filters).every(x=>!x.size))filters.dojos.add(s.user.dojo);
  const active=!!saved&&saved.expires>Date.now()&&saved.run===(s.runId||null),test=!!(s.practice||s.testRoom);
  const options=(kind,items)=>items.map(({id,label})=>'<label '+(search&&!label.toLocaleLowerCase('de').includes(search)?'hidden ':'')+'data-notify-option data-search="'+esc(label.toLocaleLowerCase('de'))+'"><input type="checkbox" data-notify-filter="'+kind+'" value="'+esc(id)+'" '+(filters[kind].has(id)?'checked':'')+'> '+esc(label)+'</label>').join('');
  const dojos=[...new Set(s.dojos?.map(d=>d.name)||s.entries?.map(e=>e.dojo).filter(Boolean)||roster.map(p=>p.dojo))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'de'));
  return '<h1>Meine Aufrufe</h1><section class="card"><div class="row"><h2>Benachrichtigungen auf diesem Gerät</h2><span class="pill">'+(test?'Testansicht':active?(saved.pageOnly?'Auf dieser Seite':'Geräte-Push aktiv'):'Ausgeschaltet')+'</span></div><p>Wähle Dojos, Gruppen oder einzelne Athleten. Du erhältst Aufrufe und die nächste Begegnung mit Tatami und Direktlink, sobald eine deiner Auswahlen zutrifft.</p>'+(!supported()?'<p class="note">Dieser Browser bietet hier keine Gerätebenachrichtigungen an. Auf dem iPhone diese Seite über „Teilen → Zum Home-Bildschirm“ hinzufügen und von dort öffnen. Alternativ die Live-Listen geöffnet lassen.</p>':'')+'<p class="muted">Auf dem iPhone zuerst zum Home-Bildschirm hinzufügen. Nach der Browserfreigabe können Nachrichten auch bei geschlossener Seite ankommen. Internet, Browser und Geräteeinstellungen müssen dies zulassen.</p><label>Suchen<input type="search" id="notify-search" value="'+esc(search)+'" placeholder="Dojo, Gruppe oder Name"></label><div class="notify-options"><details data-notify-section="dojos" '+(opened.dojos?'open':'')+'><summary>Dojos · alle zugehörigen Starter und Teams</summary><div>'+options('dojos',dojos.map(d=>({id:d,label:d})))+'</div></details><details data-notify-section="groups" '+(opened.groups?'open':'')+'><summary>Gruppen</summary><div>'+options('groups',s.groups.filter(g=>g.active&&s.entries.some(e=>e.active&&e.group===g.code)).map(g=>({id:g.code,label:g.code+' · '+g.description})))+'</div></details><details data-notify-section="athletes" '+(opened.athletes?'open':'')+'><summary>Einzelne Athleten · alle ihre Disziplinen und Teams</summary><div>'+options('athletes',roster.map(p=>({id:p.id,label:p.name+' · '+p.dojo})))+'</div></details></div><p id="notify-count">'+Object.values(filters).reduce((n,x)=>n+x.size,0)+' Abos ausgewählt</p><div class="actions"><button data-notify-action="enable" '+(busy||!supported()||!config?.available||test||!s.event.published?'disabled':'')+'>'+(active&&!saved.pageOnly?'Push-Auswahl speichern':'Geräte-Push einschalten')+'</button><button class="quiet" data-notify-action="preview">Vorschau anzeigen</button>'+(!saved?.id?'<button class="quiet" data-notify-action="page">'+(active&&saved.pageOnly?'Seitenauswahl speichern':'Aufrufe auf dieser Seite einschalten')+'</button>':'')+(saved?.id&&!test?'<button class="quiet" data-notify-action="test">Push-Test an dieses Gerät senden</button>':'')+''+(saved?'<button class="quiet" data-notify-action="disable" '+(busy?'disabled':'')+'>Auf diesem Gerät ausschalten</button>':'')+'</div><p id="notify-feedback" role="status">'+(test?'Aufrufe können hier auf dieser Seite getestet werden. Echte Geräteabos bleiben getrennt.':!s.event.published?'Die Leitung gibt die Aufrufabos mit den Starterlisten frei.':config&&!config.available?'Geräte-Push ist derzeit nicht erreichbar. Aufrufe können auf dieser Seite angezeigt werden.':active?'Aktiv bis '+new Date(saved.expires).toLocaleDateString('de-DE')+'.':'')+'</p><p class="small">Abos gelten nur für dieses Gerät und diesen Wettkampf. Einschalten und Auswahl sind freiwillig. Beim Ausschalten wird die Zuordnung auf dem Server gelöscht.</p></section>';
 }
 document.addEventListener('toggle',e=>{const kind=e.target.dataset?.notifySection;if(kind)opened[kind]=e.target.open;},true);
 document.addEventListener('input',e=>{if(e.target.id!=='notify-search')return;const q=e.target.value.toLocaleLowerCase('de');search=q;document.querySelectorAll('[data-notify-option]').forEach(l=>l.hidden=!l.dataset.search.includes(q));if(q)document.querySelectorAll('.notify-options details').forEach(d=>d.open=true);});
 document.addEventListener('change',e=>{const kind=e.target.dataset.notifyFilter;if(!kind)return;if(e.target.checked)filters[kind].add(e.target.value);else filters[kind].delete(e.target.value);const el=document.querySelector('#notify-count');if(el)el.textContent=Object.values(filters).reduce((n,x)=>n+x.size,0)+' Abos ausgewählt';});
 document.addEventListener('click',async e=>{const button=e.target.closest('[data-notify-action]');if(!button||busy)return;const action=button.dataset.notifyAction,s=getState();busy=true;button.disabled=true;
  try{
   if(action==='preview'){
    const group=[...filters.groups][0]||s.groups.find(g=>s.entries.some(e=>e.active&&e.group===g.code))?.code||'Beispielgruppe',message='Testmeldung: '+group+' · Als Nächstes auf Tatami 2. Bitte bereithalten.';
    const el=document.querySelector('#notify-feedback');if(el)el.textContent=message;
    if(saved?.id&&typeof Notification!=='undefined'&&Notification.permission==='granted'&&!s.practice&&!s.testRoom){const reg=await navigator.serviceWorker.getRegistration(centerURL('./'));if(!reg?.active)throw Error('Benachrichtigungen zuerst aktivieren.');await reg.showNotification('SDM · Testmeldung',{body:message,tag:'sdm-self-test',data:{url:'index.html#notify'}});}return;
   }
   if(action==='page'){
    if(!Object.values(filters).some(x=>x.size))throw Error('Zuerst mindestens ein Abo auswählen');
    saved={pageOnly:true,expires:Date.parse(s.event.date+'T23:59:59+02:00')+86400000,filters:selected(),run:s.runId||null};store();toast('Aufrufe erscheinen hier, solange diese Seite geöffnet ist.');render();return;
   }
   if(action==='test'){
    if(!saved?.id||s.practice||s.testRoom)throw Error('Gerätebenachrichtigungen zuerst auf der regulären Turnierseite einschalten');config=await api('push-config');await api('push-subscribe',{op:'test',id:saved.id,secret:saved.secret,csrf:config.csrf});toast('Push-Test an den Benachrichtigungsdienst übergeben. Bitte auf diesem Gerät prüfen.');return;
   }
   if(action==='disable'){
    if(saved?.id){config=await api('push-config');await api('push-subscribe',{op:'remove',id:saved.id,secret:saved.secret,csrf:config.csrf});}
    if(saved?.id){const reg=await navigator.serviceWorker.getRegistration(new URL(centerURL('./')));await(await reg?.pushManager.getSubscription())?.unsubscribe();}saved=null;try{localStorage.removeItem(storageKey);}catch{}toast('Benachrichtigungen auf diesem Gerät ausgeschaltet.');render();return;
   }
   if(action==='enable'){
    if(!Object.values(filters).some(x=>x.size))throw Error('Zuerst mindestens ein Abo auswählen');
    // Keep the permission request directly in the user's click gesture (iOS).
    const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Browserfreigabe fehlt. Bei Bedarf in den Website-Einstellungen erlauben.');
    config=await api('push-config');if(!config.available)throw Error('Benachrichtigungen derzeit nicht verfügbar');
    const registration=await navigator.serviceWorker.register(new URL(resourceURL('notifications-sw.js?v=49')),{scope:new URL(centerURL('./')).pathname});if(!registration.active)await new Promise((resolve,reject)=>{const worker=registration.installing||registration.waiting;if(!worker)return reject(Error('Benachrichtigungen erneut aktivieren'));const timeout=setTimeout(()=>reject(Error('Service Worker startet noch. Bitte erneut versuchen.')),15000);worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timeout);resolve();}});});
    let subscription=await registration.pushManager.getSubscription();if(subscription&&!saved){await subscription.unsubscribe();subscription=null;}
    subscription??=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey)});
    const result=await api('push-subscribe',{op:'save',subscription:subscription.toJSON(),filters:selected(),secret:saved?.secret||'',csrf:config.csrf});
    saved={id:result.id,secret:result.secret,expires:result.expires,filters:selected(),run:s.runId||null};store();toast('Aufrufe auf diesem Gerät aktiviert.');render();
   }
  }catch(err){toast(err.message);const el=document.querySelector('#notify-feedback');if(el)el.textContent=err.message;}
  finally{busy=false;document.querySelectorAll('[data-notify-action]').forEach(b=>b.disabled=b.dataset.notifyAction==='enable'&&(!supported()||!config?.available||!!(getState().practice||getState().testRoom)||!getState().event.published));}
 });
 async function flush(){const s=getState();if(sending||s?.network?.push===false||!s?.csrf||!['admin','table','stream'].includes(s.user?.role)||s.practice||s.testRoom||document.visibilityState!=='visible')return;sending=true;
  try{lastDelivery=await api('push-flush',{});if(lastDelivery.failed)lastFailure=Date.now();}catch{lastFailure=Date.now();}finally{sending=false;const status=document.querySelector('#push-delivery-status');if(status){status.hidden=Date.now()-lastFailure>=15000;status.textContent='Gerätebenachrichtigungen: Zustellung wird erneut versucht.';}}
 }
 setInterval(flush,3000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')flush();});
 return {view,wantsCalls:()=>!!saved&&saved.expires>Date.now(),flush,onState(s){const role=s.user?.role||'';if(role!==lastRole){lastRole=role;if(role==='trainer'&&!saved)filters.dojos.add(s.user.dojo);}alerts.onState(s);if(['admin','table','stream'].includes(role))flush();},status(){return lastFailure&&Date.now()-lastFailure<60000?'Push-Zustellung wird erneut versucht':lastDelivery?.available?'Push-Zustellung aktiv':'';}};
}
