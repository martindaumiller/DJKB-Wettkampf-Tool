export function qualifyingTree(bouts){const used=new Set(bouts.flatMap(b=>b.sources||[]));return [...bouts,...bouts.filter(b=>!b.final&&!b.bronze&&!b.qualified&&!used.has(b.id)).map(b=>({id:'qualified:'+b.id,group:b.group,qualified:true,sources:[b.id],aka:(b.winner==='aka'?b.aka:b.winner==='shiro'?b.shiro:b.winner)||null,shiro:null,status:b.status==='done'?'done':'waiting',winner:b.winner||null,round:(b.round||0)+1,pool:b.pool}))];}
export function treeLayout(bouts){
 const map=new Map(bouts.map(b=>[b.id,b])),ranks=new Map(),ys=new Map(),visiting=new Set();
 function rank(b){if(ranks.has(b.id))return ranks.get(b.id);if(visiting.has(b.id))return 0;visiting.add(b.id);const src=(b.sources||[]).map(id=>map.get(id)).filter(Boolean),r=src.length?1+Math.max(...src.map(rank)):0;visiting.delete(b.id);ranks.set(b.id,r);return r;}
 bouts.forEach(rank);const leaves=bouts.filter(b=>!ranks.get(b.id)),step=78,card=62;leaves.forEach((b,i)=>ys.set(b.id,36+i*step));
 const ordered=[...bouts].sort((a,b)=>ranks.get(a.id)-ranks.get(b.id));let lower=Math.max(36,...ys.values())+step;
 for(const b of ordered){if(ys.has(b.id))continue;const src=(b.sources||[]).map(id=>ys.get(id)).filter(x=>x!==undefined);let y=src.length?src.reduce((a,b)=>a+b,0)/src.length:lower;if(b.bronze||b.fromLoser){y=lower;lower+=step;}ys.set(b.id,y);}
 const nodes=bouts.map((b,i)=>({b,index:i+1,x:20+ranks.get(b.id)*254,y:ys.get(b.id),rank:ranks.get(b.id)}));
 return {nodes,width:Math.max(260,...nodes.map(n=>n.x+234)),height:Math.max(130,...nodes.map(n=>n.y+card+16)),edges:nodes.flatMap(n=>(n.b.sources||[]).map(id=>{const parent=nodes.find(p=>p.b.id===id);return parent?{from:parent,to:n,loser:!!n.b.fromLoser}:null;}).filter(Boolean))};
}
// Readable A4 sheets: at most four adjacent rounds and eight starting matches.
export function treeSheets(bouts){const full=treeLayout(bouts),sheets=[],max=Math.max(0,...full.nodes.map(n=>n.rank));for(let band=0;band<=max;band+=4){const rows=full.nodes.filter(n=>n.rank>=band&&n.rank<band+4),ids=new Set(rows.map(n=>n.b.id)),seeds=rows.filter(n=>!n.b.sources?.some(id=>ids.has(id)));for(let i=0;i<seeds.length;i+=8){const keep=new Set(seeds.slice(i,i+8).map(n=>n.b.id));for(const n of rows.slice().sort((a,b)=>a.rank-b.rank))if(n.b.sources?.some(id=>keep.has(id)))keep.add(n.b.id);sheets.push(rows.filter(n=>keep.has(n.b.id)).map(n=>n.b));}}return sheets;}
