import {resourceURL} from './resource-url.js';
export async function loadHandoffPanel(panel){
 if(!panel)return;
 const h=document.createElement('h2');h.textContent='Eigener Sendetest erforderlich';
 const p=document.createElement('p');p.textContent='Dieses unabhängige Projekt enthält keine privaten Teststreams und keine früheren Testfreigaben. Kamera, Ton, Encoder und Upload am Veranstaltungsort prüfen.';
 const link=document.createElement('a');link.href=resourceURL('index.html#stream');link.textContent='Zur Stream-Regie';
 panel.replaceChildren(h,p,link);
}
