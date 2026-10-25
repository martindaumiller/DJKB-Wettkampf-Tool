import {entryCents} from './fees.mjs';
import * as C from './core.mjs';
import {canViewFees,feeRates} from './management.mjs';
import fontData from './invoice-font.json' with {type:'json'};
export const defaultIssuer={name:'Veranstalter konfigurieren',contact:'',street:'',city:'',email:'',payee:'',bank:'',iban:'',bic:'',taxNote:'',paymentNote:''};
const fail=(m,status=400)=>Object.assign(Error(m),{status});
export function invoiceDojo(s,u,dojo,ctx={}){
 if(u?.role==='trainer'){if(dojo&&C.norm(dojo)!==C.norm(u.dojo))throw fail('Nur die Rechnung des eigenen Dojos ist zugänglich',403);dojo=u.dojo;}
 else if(!canViewFees(u,ctx))throw fail('Nur eigener Coachzugang oder private Wettkampfleitung',403);
 const d=s.dojos.find(d=>C.norm(d.name)===C.norm(dojo));if(!d)throw fail('Dojo fehlt',404);return d;
}
export function invoiceLines(s,dojo){return s.entries.filter(e=>s.groups.some(g=>g.code===e.group)&&C.norm(C.person(s,e)?.dojo)===C.norm(dojo)).map(e=>{const p=C.person(s,e),g=s.groups.find(g=>g.code===e.group);return {entry:e.id,withdrawn:!e.active||!g.active,name:e.kind==='team'?p.name:p.first+' '+p.last,kind:e.kind,group:g.code,discipline:['Kata Einzel','Kumite Einzel','Kata Team','Kumite Team'][g.type],cents:entryCents(e),late:e.feeMultiplier>1,members:e.kind==='team'?(p.memberIds?.length?p.memberIds.map(id=>s.people.find(p=>p.id===id)).filter(Boolean).map(p=>p.first+' '+p.last):p.members.filter(Boolean)):[]};}).sort((a,b)=>a.name.localeCompare(b.name,'de')||a.discipline.localeCompare(b.discipline,'de'));}
export function billingView(s,u,invoices=[],ctx={}){
 if(u?.role!=='trainer')return canViewFees(u,ctx)?{invoiceIssuer:{...defaultIssuer,...s.billingSettings},invoiceArchive:invoices.map(({id,number,dojo,totalCents,issuedAt,supersededBy})=>({id,number,dojo,totalCents,issuedAt,supersededBy}))}:{};
 const d=invoiceDojo(s,u,null,ctx),lines=invoiceLines(s,d.name);
 return {billing:{dojo:d.name,recipient:d.billingRecipient||{name:d.name,street:'',city:''},lines,totalCents:lines.reduce((n,l)=>n+l.cents,0),invoices:invoices.filter(i=>C.norm(i.dojo)===C.norm(d.name)).map(({id,number,issuedAt,totalCents,replaces,supersededBy})=>({id,number,issuedAt,totalCents,replaces,supersededBy}))}};
}
export function invoiceSummary(s,u,a,ctx={}){
 const dojo=invoiceDojo(s,u,a.dojo,ctx),recipient={name:String(a.recipient?.name||dojo.name).trim(),street:String(a.recipient?.street||'').trim(),city:String(a.recipient?.city||'').trim()};
 if(!recipient.name||!recipient.street||!recipient.city||Object.values(recipient).some(v=>v.length>150||/[\r\n]/.test(v)))throw fail('Rechnungsempfänger, Straße sowie Postleitzahl und Ort vollständig angeben');
 const lines=invoiceLines(s,dojo.name);if(!lines.length)throw fail('Keine aktiven Starts für dieses Dojo');
 const issuer={...defaultIssuer,...s.billingSettings},event={name:s.event.name,date:s.event.date},roster=s.people.filter(p=>C.norm(p.dojo)===C.norm(dojo.name)).map(p=>({name:p.first+' '+p.last,individualStarts:s.entries.filter(e=>e.kind==='person'&&e.personId===p.id).length})),totalCents=lines.reduce((n,l)=>n+l.cents,0);
 return {dojo:dojo.name,recipient,issuer,event,roster,lines,totalCents};
}
export async function issueInvoice(container,s,u,a,ctx={}){
 if(a.expectedRevision!==s.revision)throw fail('Meldestand wurde geändert. Bitte neu laden und Gebühren erneut prüfen.',409);
 const snapshot=invoiceSummary(s,u,a,ctx),bytes=new TextEncoder().encode(JSON.stringify(snapshot)),fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 container.invoices??=[];const same=container.invoices.find(i=>i.fingerprint===fingerprint&&!i.supersededBy);if(same)return {invoice:same,created:false};
 if(container.invoices.length>=1000)throw fail('Rechnungsarchiv voll. Bitte Wettkampfleitung kontaktieren');
 const prior=container.invoices.findLast(i=>C.norm(i.dojo)===C.norm(snapshot.dojo)&&i.event.date===snapshot.event.date&&!i.supersededBy),sequence=(container.invoiceSequence||0)+1;
 const invoice={...snapshot,id:C.uid(),number:(ctx.practice?'TEST-':'')+'SDM'+s.event.date.slice(0,4)+'-'+String(sequence).padStart(4,'0'),issuedAt:new Date().toISOString(),fingerprint,replaces:prior?.number||null,practice:!!ctx.practice};
 if(prior)prior.supersededBy=invoice.number;container.invoiceSequence=sequence;container.invoices.push(invoice);s.dojos.find(d=>d.name===snapshot.dojo).billingRecipient=snapshot.recipient;return {invoice,created:true};
}
export function findInvoice(container,s,u,id,ctx={}){const i=container.invoices?.find(i=>i.id===id);if(!i)throw fail('Rechnung nicht gefunden',404);if(u?.role==='trainer'){if(C.norm(u.dojo)!==C.norm(i.dojo))throw fail('Nur die Rechnung des eigenen Dojos ist zugänglich',403);}else if(!canViewFees(u,ctx))throw fail('Nur eigene Coachrechnung oder private Wettkampfleitung',403);return i;}
export async function invoicePDF(invoice,fontBytes){
 const {PDFDocument,rgb}=await import('./vendor/pdf-lib.mjs'),{default:fontkit}=await import('./vendor/fontkit.mjs');fontBytes??=Uint8Array.from(atob(fontData.data),c=>c.charCodeAt(0));const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(fontBytes,{subset:true});doc.setTitle('Rechnung '+invoice.number);doc.setAuthor(invoice.issuer.name);
 const W=595,H=842,left=45,right=550,red=rgb(.57,.12,.16),ink=rgb(.12,.14,.16),muted=rgb(.4,.43,.46);let page,y;
 const text=(str,x,yy,size=10,color=ink)=>page.drawText(String(str),{x,y:yy,size,font,color});
 const wrap=(str,width,size=10)=>{const words=String(str).split(/\s+/),out=[];let line='';for(const word of words){if(font.widthOfTextAtSize((line?line+' ':'')+word,size)>width&&line){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out;};
 const paragraph=(str,size=10,color=ink)=>{for(const line of wrap(str,right-left,size)){if(y<85)newPage();text(line,left,y,size,color);y-=size+4;}y-=4;};
 const newPage=()=>{page=doc.addPage([W,H]);y=H-47;text(invoice.issuer.name,left,y,11,red);text(invoice.number,right-font.widthOfTextAtSize(invoice.number,9),y,9,muted);y-=35;};
 const euro=n=>(n/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' EUR';
 newPage();text(invoice.practice?'TESTRECHNUNG':'Rechnung',left,y,26);y-=30;
 paragraph('Süddeutsche Meisterschaft des DJKB 2026 | Wettkampfdatum / Leistung: '+new Date(invoice.event.date+'T12:00Z').toLocaleDateString('de-DE',{timeZone:'Europe/Berlin'}),10,muted);
 for(const line of [invoice.issuer.contact,invoice.issuer.street,invoice.issuer.city,invoice.issuer.email].filter(Boolean))paragraph(line,9,muted);
 y-=8;for(const line of Object.values(invoice.recipient))paragraph(line,11);y-=8;paragraph('Rechnungsdatum: '+new Date(invoice.issuedAt).toLocaleDateString('de-DE',{timeZone:'Europe/Berlin'}));
 if(invoice.replaces)paragraph('Ersetzt die bisherige Fassung '+invoice.replaces+'. Bitte nicht zusätzlich zur vorherigen Fassung bezahlen.',9,red);
 y-=10;
 const header=()=>{page.drawRectangle({x:left,y:y-7,width:right-left,height:23,color:rgb(.94,.95,.96)});text('Starter / Team und Disziplin',left+7,y,10);text('Gruppe',412,y,10);text('Betrag',490,y,10);y-=28;};header();
 for(const line of invoice.lines){const lines=wrap(line.name,340,10),detail=wrap(line.discipline+(line.withdrawn?' (zurückgezogen)':'')+(line.members.length?' - '+line.members.join(', '):''),340,8),height=(lines.length*14+detail.length*11)+12;if(y-height<80){newPage();header();}for(const name of lines){text(name,left+7,y,10);y-=14;}const top=y+14;text(line.group,412,top,9);text(euro(line.cents),right-font.widthOfTextAtSize(euro(line.cents),10),top,10);for(const d of detail){text(d,left+7,y,8,muted);y-=11;}page.drawLine({start:{x:left,y:y-6},end:{x:right,y:y-6},color:rgb(.85,.87,.88),thickness:.5});y-=14;}
 const teamOnly=invoice.roster?.filter(p=>!p.individualStarts)||[];if(teamOnly.length){y-=12;paragraph('Gemeldete Personen ohne Einzelstart: '+teamOnly.map(p=>p.name).join(', '),9,muted);}
 if(y<230)newPage();y-=12;const total='Gesamtbetrag: '+euro(invoice.totalCents);text(total,right-font.widthOfTextAtSize(total,16),y,16,red);y-=32;
 paragraph('Einzelstart 15,00 EUR pro Disziplin. Teamstart 30,00 EUR pro Mannschaft.',9,muted);
 paragraph('Startgebühren werden bei Nichtteilnahme oder ausgefallenen Gruppen gemäß Ausschreibung nicht erstattet.',9,muted);
 for(const line of [invoice.issuer.taxNote,'Zahlungsempfänger: '+invoice.issuer.payee,invoice.issuer.bank,'IBAN: '+invoice.issuer.iban+' | BIC: '+invoice.issuer.bic,'Verwendungszweck: SDM2026 - '+invoice.dojo,invoice.issuer.paymentNote].filter(Boolean))paragraph(line,9);
 const pages=doc.getPages();for(let i=0;i<pages.length;i++)pages[i].drawText('Seite '+(i+1)+' / '+pages.length,{x:left,y:35,size:8,font,color:muted});return doc.save();
}
