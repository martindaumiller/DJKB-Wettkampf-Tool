export function boutSummary(group,bout){
 const team=group?.type===3,fight=team?bout.teamFights?.find(f=>f.status==='live'):null;
 const wins={aka:0,shiro:0};for(const f of bout.teamFights||bout.fights||[])if((f.status==='done'||!f.status)&&['aka','shiro'].includes(f.winner))wins[f.winner]++;
 if(bout.teamSummary?.counts)for(const side of ['aka','shiro'])wins[side]=bout.teamSummary.counts[side]?.wins??wins[side];
 const score=fight?.score||(team?{aka:wins.aka*2,shiro:wins.shiro*2}:bout.score||{aka:0,shiro:0});
 const judges=bout.judges||[];let kataTotal=null;if([5,7].includes(judges.length)&&judges.every(Number.isFinite)){const values=judges.map(x=>Math.round(x*10)).sort((a,b)=>a-b);kataTotal=values.slice(1,-1).reduce((n,v)=>n+v,0)/10;}
 return {team,fight,wins,score,unit:team&&!fight?'Siege':'Punkte',flags:[0,2].includes(group?.type)&&bout.kind!=='points',kataTotal};
}
