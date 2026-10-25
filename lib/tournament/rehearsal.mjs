import * as C from './core.mjs';
import groups from './groups.json' with {type:'json'};

export function rehearsalModel(){
  const s=C.init(groups);s.event.name='SDM · gemeinsamer Testlauf';s.event.demo=true;s.event.stage=6;s.event.published=false;s.event.rest=0;
  const chosen=[s.groups.find(g=>g.type===0&&g.minAge>=13),s.groups.find(g=>g.type===1&&g.minAge>=13),s.groups.find(g=>g.type===0&&g.maxAge<=12),s.groups.find(g=>g.type===1&&g.maxAge<=12),s.groups.find(g=>g.type===0&&g.minAge>=13&&g.gender==='m')];
  if(new Set(chosen.map(g=>g?.code)).size!==5)throw Error('Testgruppen nicht eindeutig');
  chosen.forEach((g,i)=>{g.tatami=i+1;g.pools=1;g.poolTatamis=[i+1];if(g.type===0)g.kataMode=i===2?'flags-final':'points';
    for(let n=1;n<=(i===2?8:4);n++){const age=Math.max(g.minAge,Math.min(g.maxAge,10));const p={id:C.uid(),first:'Teststarter',last:`T${i+1}-${n}`,birth:`${2026-age}-01-01`,birthVerified:true,gender:g.gender,kyu:g.minKyu,dojo:'Testdojo '+n,cadre:false,seed:0};s.people.push(p);if(!s.dojos.some(d=>d.name===p.dojo))s.dojos.push({id:C.uid(),name:p.dojo});s.entries.push({id:C.uid(),personId:p.id,group:g.code,kind:'person',active:true});}
    C.draw(s,g.code,'test-'+i);
  });return s;
}
