// Two digits are the whole score in tenths: 72 means 7,2.
export function judgeInput(raw) {
  const text=String(raw??'').trim();
  const match=text.match(/^(\d)[,.]?(\d)$/);
  if(match)return {text:match[1]+','+match[2],value:Number(match[1])+Number(match[2])/10,complete:true};
  if(/^\d[,.]?$/.test(text))return {text:text.replace('.',','),value:null,complete:false};
  return {text,value:null,complete:false};
}
export function judgeSummary(values) {
  const parsed=values.map(judgeInput);
  if(![5,7].includes(parsed.length)||parsed.some(x=>!x.complete))return null;
  const scores=parsed.map(x=>Math.round(x.value*10)).sort((a,b)=>a-b);
  return {judges:parsed.map(x=>x.value),total:scores.slice(1,-1).reduce((a,b)=>a+b,0)/10,low:scores[0]/10,high:scores.at(-1)/10};
}
