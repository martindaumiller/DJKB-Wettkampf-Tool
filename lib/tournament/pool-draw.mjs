// Equal-size brackets retain the global seed positions. Move only surplus
// entrants into empty slots until the real pool sizes differ by at most one.
export function balancePools(slots,pools,entrants){
 const arr=[...slots],width=arr.length/pools,priority=new Set(entrants.filter(e=>e.seed).map(e=>e.id));
 if(!Number.isInteger(width)||width<1)throw Error('Poolzahl passt nicht zum Starterfeld');
 for(let guard=0;guard<arr.length;guard++){
  const counts=Array.from({length:pools},(_,p)=>arr.slice(p*width,(p+1)*width).filter(Boolean).length),from=counts.indexOf(Math.max(...counts)),to=counts.indexOf(Math.min(...counts));
  if(counts[from]-counts[to]<=1)break;
  const candidates=arr.map((id,i)=>({id,i})).filter(x=>x.id&&Math.floor(x.i/width)===from).sort((a,b)=>Number(priority.has(a.id))-Number(priority.has(b.id)));
  const target=arr.findIndex((id,i)=>!id&&Math.floor(i/width)===to);arr[target]=candidates[0].id;arr[candidates[0].i]=null;
 }
 return arr;
}

// A pool supplies its knockout winners and, for 3/5/6 qualifiers, winners
// of an explicit qualification bracket between the last-round losers.
// No finalist is selected by score, seed, or an arbitrary manual choice.
export function kataFlagPools(s,g,arr,newBout){
 const width=arr.length/g.pools;
 for(let pool=1;pool<=g.pools;pool++){
  let round=0;const makeRound=(nodes,fromLoser=false)=>{
   const next=[];for(let i=0;i<nodes.length;i+=2){const a=nodes[i],b=nodes[i+1];
    const refs=!!a?.bout,match=newBout(g.code,'match',{pool,round,roundSize:nodes.length,qualification:fromLoser||a?.qualification||b?.qualification||false,...(refs?{sources:[a.bout,b.bout],fromLoser}:{aka:a?.entry||null,shiro:b?.entry||null,status:'ready'})});
    if(!refs&&(!match.aka||!match.shiro)){match.status='done';match.winner=match.aka||match.shiro;match.reason='Freilos';}
    s.bouts.push(match);next.push({bout:match.id,qualification:match.qualification});
   }round++;return next;
  };
  const qualifiers=g.qualifiersPerPool;let lower=1;while(lower*2<=qualifiers)lower*=2;
  let nodes=arr.slice((pool-1)*width,pool*width).map(entry=>({entry})),cut=[];
  while(nodes.length>lower){nodes=makeRound(nodes);cut=nodes;}
  const qualified=[...nodes],extra=qualifiers-lower;
  if(extra){let losers=makeRound(cut,true);while(losers.length>extra)losers=makeRound(losers);qualified.push(...losers);}
  for(const node of qualified)s.bouts.push(newBout(g.code,'points',{...(node.bout?{sources:[node.bout]}:{aka:node.entry}),waitForPools:true,final:true,round,roundSize:g.finalists,status:'waiting'}));
 }
}

export function configureDraw(s,g,a){
 const n=s.entries.filter(e=>e.active&&e.group===g.code).length,pools=Number(a.pools),kata=g.type===0||g.type===2,finalists=Number(a.finalists||4),routed=a.tatami!==undefined||a.poolTatamis!==undefined;
 const tatami=Number(routed?a.tatami:g.tatami||1),routes=routed?a.poolTatamis:Array.from({length:pools},(_,i)=>g.poolTatamis?.[i]||((tatami+i-1)%5+1));
 if(![1,2,4].includes(pools)||pools>n)throw Error('1, 2 oder 4 Pools wählen, höchstens so viele wie Starter');
 if(![1,2,3,4,5].includes(tatami)||!Array.isArray(routes)||routes.length!==pools||routes.some(t=>![1,2,3,4,5].includes(t)))throw Error('Für jeden Pool eine Tatami und eine Final-Tatami wählen');
 if(kata&&(![4,5,6].includes(finalists)||finalists%pools))throw Error('Kata: 4–6 Finalisten, mit gleich vielen Finalplätzen pro Pool (z. B. 2 Pools × 3)');
 if(kata&&!['flags-final','points-final','points'].includes(a.kataMode))throw Error('Kata-System wählen');
 const samePools=pools===(g.pools||1),change={pools,tatami,poolTatamis:[...routes],poolConfigured:true,queueConfigured:routed||samePools&&!!g.queueConfigured};
 if(kata)Object.assign(change,{finalists,qualifiersPerPool:finalists/pools,kataMode:a.kataMode});
 Object.assign(g,change);if(routed||!samePools)s.queue=(s.queue||[]).filter(q=>q.group!==g.code);s.queueRevision=(s.queueRevision||0)+1;delete g.closedPools;
}
