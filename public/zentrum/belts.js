// DJKB Verfahrensordnung, 04.01.2024, section 6.2. 0 represents Dan in this application.
export const beltPalette=[
 {id:'white',name:'Weiß',color:'#fafafa',grades:'9. Kyu'},
 {id:'yellow',name:'Gelb',color:'#f3cd29',grades:'8. Kyu'},
 {id:'orange',name:'Orange',color:'#ee8a26',grades:'7. Kyu'},
 {id:'green',name:'Grün',color:'#32925a',grades:'6. Kyu'},
 {id:'violet',name:'Violett',color:'#8058a9',grades:'5.–4. Kyu'},
 {id:'brown',name:'Braun',color:'#865b38',grades:'3.–1. Kyu'},
 {id:'black',name:'Schwarz',color:'#242932',grades:'Dan'},
 {id:'unknown',name:'Grad fehlt',color:'#9ba5b0',grades:'ungeklärt'}
];
export function beltForGrade(grade){
 if(grade===null||grade===undefined||grade==='')return beltPalette[7];
 const k=Number(grade);return beltPalette[!Number.isInteger(k)||k<0||k>9?7:k===0?6:k<=3?5:k<=5?4:k===6?3:k===7?2:k===8?1:0];
}
export function groupBelts(s,g){
 const ids=new Set(),teams=new Map((s.teams||[]).map(t=>[t.id,t]));let missing=0;
 for(const e of s.entries||[])if(e.active&&e.group===g.code){
  if(e.kind==='team'){const members=teams.get(e.personId)?.memberIds||[];for(const id of members)ids.add(id);missing+=Math.max(0,3-members.length);}
  else ids.add(e.personId);
 }
 const people=new Map((s.people||[]).map(p=>[p.id,p])),counts=new Map();
 for(const id of ids){const p=people.get(id),b=beltForGrade(p?.simulationPlaceholder?null:p?.kyu);counts.set(b.id,(counts.get(b.id)||0)+1);}
 if(missing)counts.set('unknown',(counts.get('unknown')||0)+missing);
 return beltPalette.filter(b=>counts.has(b.id)).map(b=>({...b,count:counts.get(b.id)}));
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function beltStrip(belts=[]){
 const label=belts.length?belts.map(b=>b.name+': '+b.count).join(' · '):'Keine zugeordneten Athleten';
 return '<span class="belt-strip" role="img" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+(belts.length?belts.map(b=>'<i style="--belt:'+beltPalette.find(p=>p.id===b.id)?.color+';flex:'+Number(b.count)+'"></i>').join(''):'<i class="no-belts"></i>')+'</span>';
}
export function beltLegend(){return '<div class="belt-legend" aria-label="Gürtelfarben der gemeldeten Athleten">'+beltPalette.map(b=>'<span title="'+b.grades+'"><i style="--belt:'+b.color+'"></i>'+b.name+'</span>').join('')+'</div>';}
export function groupChange(g){
 if(g.mergedInto)return '→ '+g.mergedInto;
 if(!g.active)return 'Gestrichen';
 const sources=(g.sourceGroups||[]).filter(c=>c!==g.code);return sources.length?'Enthält '+sources.join(' + '):'';
}
