export function deskShortcut(key,{side='shiro',kind,status,timerRunning=false,teamLive=false,overall=false,penalties={},sides=['shiro','aka']}){
 key=key.toLowerCase();if(key==='arrowleft'||key==='arrowright')return {side:sides[key==='arrowleft'?0:1]};
 if(key==='f')return {selector:'[data-do="deskFullscreen"]'};
 if(key==='p')return {focus:'#judge-0'};
 if(['n','enter'].includes(key)&&status==='ready')return {selector:'[data-do="start"]'};
 if(['n','enter'].includes(key)&&status==='done')return {selector:'[data-do="nextBout"]'};
 if(status!=='live')return null;
 const team=kind==='team',technical=['kihon','jiyuIppon'].includes(kind)&&!overall;
 if(key===' '&&['jiyu','team'].includes(kind)&&(!team||teamLive))return {selector:'[data-do="timer"][data-running="'+(timerRunning?'0':'1')+'"]'};
 if(key==='r')return {selector:'[data-do="'+(kind==='kata'?'kataRepeat':['kihon','jiyuIppon'].includes(kind)?'technicalRepeat':team?'teamSaishiai':'saishiai')+'"]'};
 if(key==='u'||key==='z')return {selector:'[data-do="undo"]'};
 if(key==='g')return {selector:'[data-do="'+(team?'teamFinish':'finish')+'"][data-side="'+side+'"]'};
 if(key==='n'&&technical)return {selector:'[data-do="technicalQuick"][data-side="none"]'};
 if(key==='w'&&technical)return {selector:'[data-do="technicalQuick"][data-side="'+side+'"]'};
 if(['w','i'].includes(key)&&['jiyu','team'].includes(kind)&&(!team||teamLive))return {selector:'[data-do="'+(team?'teamScore':'score')+'"][data-side="'+side+'"][data-value="'+(key==='w'?1:2)+'"]'};
 const family={v:'general',j:'jogai',m:'mubobi'}[key];
 if(family&&['jiyu','team','kihon','jiyuIppon'].includes(kind)&&(!team||teamLive)){const level=Math.max(0,...(penalties[side]||[]).filter(p=>p.family===family).map(p=>p.level))+1;if(level>3)return null;return {selector:'[data-do="penaltyQuick"][data-side="'+side+'"][data-family="'+family+'"][data-level="'+level+'"][data-team="'+(team?'1':'0')+'"]'};}
 return null;
}
