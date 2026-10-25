import {treeLayout,treeSheets,qualifyingTree} from '../../public/zentrum/bracket-layout.js';
import * as C from './core.mjs';
import fontData from './invoice-font.json' with {type:'json'};
import winnerTemplate from './winner-template.json' with {type:'json'};
export const discipline=g=>['Kata Einzel','Kumite Einzel','Kata Team','Kumite Team'][g.type];
export function certificateDiscipline(g){return discipline(g)+', '+(g.gender==='w'?'W':g.gender==='m'?'M':'Mixed')+', '+g.minAge+'–'+(g.maxAge>=99?'99':g.maxAge)+' Jahre, '+g.minKyu+'.–'+g.maxKyu+'. Kyu';}
export function winnerRows(s,{confirmed=false,group=null}={}){
 return s.groups.filter(g=>g.active&&!g.tie&&g.podium?.length&&(!confirmed||g.ratified)&&(!group||g.code===group)&&s.bouts.some(b=>b.group===g.code)&&s.bouts.filter(b=>b.group===g.code).every(b=>b.status==='done')).flatMap(g=>g.podium.filter(p=>p.place<=4).map(p=>{
  const e=C.ent(s,p.entry);if(!e)return null;return {Platz:p.place,Disziplin:certificateDiscipline(g),Name:e.name,Dojo:e.dojo,Gruppe:g.code,Status:g.ratified?'Bestätigt':'Vorläufig',Teammitglieder:e.kind==='team'?(C.person(s,e).members||[]).join(', '):'',Wettkampfdatum:s.event.date,StartID:e.id};
 }).filter(Boolean));
}

// Small, standards-compliant ZIP writer for generated workbook parts. Values
// remain inline strings; incoming names cannot become spreadsheet formulas.
export function zipParts(parts){
 const enc=new TextEncoder(),out=[],central=[];let offset=0;
 const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
 const u16=(v,n,x)=>v.setUint16(n,x,true),u32=(v,n,x)=>v.setUint32(n,x,true);
 for(const [name,content]of Object.entries(parts)){
  const n=enc.encode(name),b=typeof content==='string'?enc.encode(content):content,c=crc(b),h=new Uint8Array(30+n.length),v=new DataView(h.buffer);
  u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x800);u32(v,14,c);u32(v,18,b.length);u32(v,22,b.length);u16(v,26,n.length);h.set(n,30);out.push(h,b);
  const d=new Uint8Array(46+n.length),w=new DataView(d.buffer);u32(w,0,0x02014b50);u16(w,4,20);u16(w,6,20);u16(w,8,0x800);u32(w,16,c);u32(w,20,b.length);u32(w,24,b.length);u16(w,28,n.length);u32(w,42,offset);d.set(n,46);central.push(d);offset+=h.length+b.length;
 }
 const size=central.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);u32(v,0,0x06054b50);u16(v,8,central.length);u16(v,10,central.length);u32(v,12,size);u32(v,16,offset);out.push(...central,end);
 const result=new Uint8Array(offset+size+22);let at=0;for(const b of out){result.set(b,at);at+=b.length;}return result;
}
const xml=s=>String(s??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const col=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
export async function winnersXlsx(s,options={}){
 const template=winnerTemplate,rows=winnerRows(s,options),headers=['Platz','Disziplin','Name','Dojo','Gruppe','Status','Teammitglieder','Wettkampfdatum','StartID'];
 const matrix=[headers,...(rows.length?rows.map(r=>headers.map(k=>r[k])):[headers.map(()=> '')])],last=matrix.length;
 const data=matrix.map((row,i)=>'<row r="'+(i+1)+'" ht="'+(i?36:28)+'" customHeight="1">'+row.map((v,j)=>'<c r="'+col(j+1)+(i+1)+'" s="'+(i?template.bodyStyle:template.headerStyle)+'"'+(typeof v==='number'?'':' t="inlineStr"')+'>'+(typeof v==='number'?'<v>'+v+'</v>':'<is><t xml:space="preserve">'+xml(v)+'</t></is>')+'</c>').join('')+'</row>').join('');
 const parts={...template.parts};parts['xl/worksheets/sheet1.xml']=template.sheet.replace(/<dimension[^>]*\/>/,'<dimension ref="A1:I'+last+'"/>').replace(/<sheetData[\s\S]*?<\/sheetData>/,'<sheetData>'+data+'</sheetData>').replace(/<autoFilter[^>]*\/>/,'<autoFilter ref="A1:I'+last+'"/>');
 if(parts['xl/tables/table1.xml'])parts['xl/tables/table1.xml']=parts['xl/tables/table1.xml'].replace(/ref="[^"]*"/g,'ref="A1:I'+Math.max(2,last)+'"');
 return zipParts(parts);
}

export async function reportResponse(request,s,u){
 const url=new URL(request.url),route=url.pathname.split('/').at(-1);
 if(route==='winners'){
  if(u?.role!=='admin')throw Object.assign(Error('Nur Wettkampfleitung'),{status:403});
  const bytes=await winnersXlsx(s,{confirmed:url.searchParams.get('confirmed')==='1',group:url.searchParams.get('group')||null});
  return new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="SDM2026-Urkunden-Stand-'+s.revision+'.xlsx"','Cache-Control':'private, no-store'}});
 }
 if(route!=='print')return null;
 const kind=url.searchParams.get('kind')||'lists';
 if(!['lists','obmann'].includes(kind))throw Error('Druckart ungültig');
 if(kind==='obmann'&&u?.role!=='admin')throw Object.assign(Error('Obmann-Protokolle nur für die Wettkampfleitung'),{status:403});
 if(!s.event.published&&!['admin','table'].includes(u?.role))throw Object.assign(Error('Listen noch nicht freigegeben'),{status:403});
 const selected=url.searchParams.get('groups')?.split(',').filter(Boolean)||null;
 if(selected&&(selected.length>100||selected.some(code=>!s.groups.some(g=>g.code===code))))throw Error('Gruppenauswahl ungültig');
 const pool=url.searchParams.has('pool')?Number(url.searchParams.get('pool')):null;
 if(pool!==null&&![0,1,2,3,4].includes(pool))throw Error('Pool ungültig');
 return new Response(await tournamentPDF(s,{kind,groups:selected,pool}),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="SDM2026-'+(kind==='obmann'?'Obmann':'Wettkampflisten')+'-Stand-'+s.revision+'.pdf"','Cache-Control':'private, no-store'}});
}

export async function tournamentPDF(s,{kind='lists',groups=null,pool=null}={}){
 const {PDFDocument,rgb}=await import('./vendor/pdf-lib.mjs'),{default:fontkit}=await import('./vendor/fontkit.mjs'),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(Uint8Array.from(atob(fontData.data),c=>c.charCodeAt(0)),{subset:true}),W=595.28,H=841.89,L=35,R=W-35,ink=rgb(.1,.13,.16),muted=rgb(.35,.39,.42),line=rgb(.76,.79,.81),wash=rgb(.94,.95,.96);let page,y,currentTitle='',subtitle='';
 doc.setTitle(s.event.name+' – '+(kind==='obmann'?'Protokoll für den Obmann':'Wettkampflisten'));doc.setAuthor('DJKB Stützpunkt Süd');
 const width=(text,size)=>font.widthOfTextAtSize(String(text),size);
 const wrap=(text,w,size=9)=>{const lines=[];let acc='';for(const word of String(text??'').split(/\s+/)){if(acc&&width(acc+' '+word,size)>w){lines.push(acc);acc=word;}else acc+=(acc?' ':'')+word;}if(acc)lines.push(acc);return lines;};
 const text=(v,x,yy,size=9,color=ink)=>page.drawText(String(v??''),{x,y:yy,size,font,color});
 const newPage=()=>{page=doc.addPage([W,H]);y=H-38;text(s.event.name,L,y,11);y-=25;text(currentTitle,L,y,17);y-=20;for(const l of wrap(subtitle,R-L,9)){text(l,L,y,9,muted);y-=12;}y-=8;};
 const need=h=>{if(y-h<64)newPage();};
 const paragraph=(v,size=9)=>{for(const l of wrap(v,R-L,size)){need(size+6);text(l,L,y,size);y-=size+5;}y-=5;};
 const table=(heads,widths,rows,{blankHeight=0,continuationTitle=''}={})=>{
  const header=()=>{need(34+Math.max(blankHeight,24));if(continuationTitle){text(continuationTitle,L,y,11);y-=20;}page.drawRectangle({x:L,y:y-22,width:R-L,height:25,color:wash});let x=L;heads.forEach((h,i)=>{text(h,x+5,y-12,8);x+=widths[i];});y-=26;};header();
  for(const row of rows){const cells=row.map((c,i)=>wrap(c,widths[i]-10,9)),height=Math.max(blankHeight,Math.max(...cells.map(l=>l.length),1)*12+12);if(y-height<64){newPage();header();}let x=L;cells.forEach((ls,i)=>{ls.forEach((l,j)=>text(l,x+5,y-12-j*12,9));x+=widths[i];});page.drawLine({start:{x:L,y:y-height},end:{x:R,y:y-height},color:line,thickness:.45});y-=height;}
  y-=14;
 };
 const active=s.groups.filter(g=>g.active&&(!groups||groups.includes(g.code))&&s.entries.some(e=>e.active&&e.group===g.code));
 for(const g of active){
  const all=s.bouts.filter(b=>b.group===g.code),number=id=>all.findIndex(b=>b.id===id)+1;
  const parts=[...new Set(all.map(b=>b.pool||0))].sort((a,b)=>a===0?1:b===0?-1:a-b);if(!parts.length)parts.push(0);
  for(const p of parts.filter(p=>pool===null||p===Number(pool))){
   const bs=all.filter(b=>(b.pool||0)===p),es=s.entries.filter(e=>e.active&&e.group===g.code),ids=new Set(bs.filter(b=>!b.sources?.length).flatMap(b=>[b.aka,b.shiro]).filter(Boolean)),roster=all.length?es.filter(e=>ids.has(e.id)):es;
   currentTitle=g.code+' – '+discipline(g)+' – '+(p?'Pool '+p:'Finalrunde');
   const routes=[...new Set(bs.filter(b=>b.status!=='done').map(b=>C.tatami(s,b)))];subtitle='Tatami '+(routes.length?routes.join(' / '):g.tatami)+' · '+new Date(s.event.date+'T12:00Z').toLocaleDateString('de-DE')+' · '+g.description;newPage();
   if(kind==='obmann')paragraph('Obmann: ________________________    Tischbesatzung: ________________________');
   if(!g.draw){paragraph('Noch nicht ausgelost');}
   if(roster.length)table(['Nr.','Starter / Team','Dojo'],[32,238,R-L-270],roster.map(e=>[C.startNumber(s,e)||'',C.ent(s,e.id).name+(e.kind==='team'?'\n'+C.person(s,e).members.join(', '):''),C.ent(s,e.id).dojo]));
   const participant=(b,side)=>{if(b[side]){const e=C.ent(s,b[side]);return e.name+' ('+e.dojo+')';}const source=b.sources?.[side==='aka'?0:1];return source?(b.fromLoser?'Verlierer':'Sieger')+' Begegnung '+number(source):'Freilos / offen';};
   const matches=bs.filter(b=>b.kind!=='points');
   if(matches.length){need(120);paragraph(kind==='obmann'?'Begegnungen und handschriftliche Entscheidungen':'Begegnungen',11);table(['Nr. / Runde','Shiro','Aka','Sieger / Ergebnis'],[58,164,164,R-L-386],matches.map(b=>[number(b.id)+' / '+(b.bronze?'Platz 3':b.final?'Finale':b.qualification?'Qual.':(b.round||0)+1),participant(b,'shiro'),participant(b,'aka'),b.status==='done'?(C.ent(s,b.winner)?.name||'Kein Sieger')+' · '+b.reason:'________________']),{blankHeight:kind==='obmann'?58:0});}
   if(matches.length){const sheets=treeSheets([0,2].includes(g.type)?qualifyingTree(matches):matches);for(const [si,rows]of sheets.entries()){const l=treeLayout(rows),pw=841.89,ph=595.28,tp=doc.addPage([pw,ph]),scale=Math.min((pw-64)/l.width,(ph-124)/l.height),ox=32,oy=ph-91,red=rgb(.69,0,.13);tp.drawText(s.event.name,{x:32,y:ph-28,size:11,font,color:ink});tp.drawText(g.code+' – '+discipline(g)+' – '+(p?'Pool '+p:'Finalrunde')+' – Wettkampfbaum'+(sheets.length>1?' · Teil '+(si+1)+' / '+sheets.length:''),{x:32,y:ph-52,size:15,font,color:ink});
    tp.drawText('Shiro oben · Aka unten · * Sieger',{x:32,y:ph-71,size:9,font,color:muted});
    const put=(v,x,y,size,color=ink,max=210)=>{let value=String(v||'');while(value.length&&width(value,size)>max)value=value.slice(0,-1);if(value!==String(v||''))value=value.slice(0,-1)+'…';tp.drawText(value,{x:ox+x*scale,y:oy-y*scale,size:size*scale,font,color});};
    for(const e of l.edges){const points=[[e.from.x+220,e.from.y+31],[e.from.x+237,e.from.y+31],[e.from.x+237,e.to.y+31],[e.to.x,e.to.y+31]];for(let i=1;i<points.length;i++)tp.drawLine({start:{x:ox+points[i-1][0]*scale,y:oy-points[i-1][1]*scale},end:{x:ox+points[i][0]*scale,y:oy-points[i][1]*scale},color:line,thickness:1});}
    for(const n of l.nodes){const b=n.b;tp.drawRectangle({x:ox+n.x*scale,y:oy-(n.y+62)*scale,width:220*scale,height:62*scale,color:b.final?rgb(1,.97,.86):wash,borderColor:line,borderWidth:.6});put((b.qualified?'Punktefinale':'#'+number(b.id))+' · '+(b.qualified?'qualifiziert':b.bronze?'Platz 3':b.final?'Finale':b.qualification?'Finalqualifikation':'Runde '+(n.rank+1))+' · T'+C.tatami(s,b),n.x+8,n.y+13,10,muted);for(const [side,dy]of [['shiro',33],['aka',54]]){const source=b.sources?.[b.qualified?0:side==='aka'?0:1],label=b.qualified&&side==='shiro'?'':b[side]?C.ent(s,b[side]).name:source?(b.fromLoser?'Verlierer':'Sieger')+' #'+number(source):'Freilos';put((b.winner&&b.winner===b[side]?'* ':'')+label,n.x+9,n.y+dy,13,side==='aka'?red:ink,200);}}
   }}
   for(const b of matches.filter(b=>g.type===3&&kind==='obmann')){
    need(150);
    table(['Kampf','Shiro / Punkte','Aka / Punkte','Entscheidung'],[45,180,180,R-L-405],[0,1,2,3].map(i=>{const f=b.teamFights?.[i];return [i===3?'Stich':i+1,f?f.shiroName+' / '+f.score.shiro/2:'________________',f?f.akaName+' / '+f.score.aka/2:'________________',f?.reason||'________________'];}),{blankHeight:38,continuationTitle:'Teambegegnung '+number(b.id)+' – Einzelkämpfe'});
   }
   const points=bs.filter(b=>b.kind==='points');if(points.length){need(110);paragraph('Kata Punkte – eine höchste und eine niedrigste Wertung streichen',10);table(['Nr. / Starter','KR 1–5 / 7','Summe / Platz'],[230,205,R-L-435],points.map(b=>[number(b.id)+' · '+participant(b,'aka'),b.judges?.length?b.judges.map(v=>Number(v).toFixed(1).replace('.',',')).join(' / '):'____ / ____ / ____ / ____ / ____\n____ / ____',b.judges?.length?(C.kataScore(b.judges).total/10).toFixed(1):'________']),{blankHeight:kind==='obmann'?36:38});}
   if(kind==='obmann'){need(78);paragraph('Verwarnungen / Zeit / Korrekturen',10);paragraph('________________________________________________________________________________');paragraph('________________________________________________________________________________');paragraph('Unterschrift Hauptkampfrichter: _____________________    Leitung: _____________________');}
  }
 }
 if(!doc.getPageCount()){currentTitle='Wettkampflisten';subtitle='Keine passenden Gruppen im aktuellen Stand';newPage();}
 const pages=doc.getPages(),stamp=new Date().toLocaleString('de-DE',{timeZone:'Europe/Berlin'});
 pages.forEach((p,i)=>p.drawText('Stand '+s.revision+' · '+stamp+' · Seite '+(i+1)+' / '+pages.length,{x:L,y:30,size:8,font,color:muted}));return doc.save();
}
