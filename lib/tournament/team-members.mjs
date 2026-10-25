export function memberNames(value){
 const name=p=>typeof p==='string'?p:p?.name||[p?.first,p?.last].filter(Boolean).join(' ');
 return (Array.isArray(value)?value:String(value||'').split(/[,;\r\n\t]+| {2,}/)).map(name).map(p=>String(p||'').trim().replace(/\s+/g,' ')).filter(Boolean);
}
