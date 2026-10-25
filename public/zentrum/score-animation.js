export function judgeMarks(values,animated=true){
 const complete=[5,7].includes(values.length)&&values.every(n=>typeof n==='number'),lo=complete?values.indexOf(Math.min(...values)):-1,hi=complete?values.lastIndexOf(Math.max(...values)):-1;
 return '<span class="judges-animated '+(animated?'':'no-animation')+'">'+values.map((n,i)=>'<span class="judge-mark '+(i===lo||i===hi?'cut':'')+' '+(n==null?'pending':'')+'" style="--j:'+i+'" aria-label="Kampfrichter '+(i+1)+(i===lo||i===hi?', gestrichen':'')+'">'+(n==null?'–':Number(n).toFixed(1).replace('.',','))+'</span>').join('')+'</span>';
}
