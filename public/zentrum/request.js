const readCache=new Map();
const cacheable=/\/(?:state|public-state|network-state|display-state|timekeeper-state|release)(?:[?]|$)/;
export async function requestJSON(url,options={},fetcher=fetch,timeout=options.method==='POST'?12000:5000){
 const read=(options.method||'GET').toUpperCase()==='GET',key=String(url),cached=readCache.get(key),conditional=read&&cacheable.test(key);
 const headers=new Headers(options.headers||{});if(conditional&&cached)headers.set('If-None-Match',cached.etag);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  if(!read)readCache.clear();
  let response=await fetcher(url,{...options,headers,cache:'no-store',signal:controller.signal}),data;
  if(response.status===304&&cached) {data=structuredClone(cached.data);response=new Response(null,{status:200,headers:response.headers});}
  else {try{data=await response.json();}catch(e){throw Object.assign(Error('Verbindung nicht erreichbar. Stand und ausstehende Eingabe prüfen.'),{status:response.status,uncertain:!read});}
   if(conditional&&response.ok&&response.headers.get('etag')){if(readCache.size>40)readCache.clear();readCache.set(key,{etag:response.headers.get('etag'),data:structuredClone(data)});}
  }
  const serverTime=Number(response.headers.get('x-server-time'));if(serverTime&&data&&typeof data==='object'){data.serverTime=serverTime;if(data.network)data.network.serverTime=serverTime;}
  return {response,data};
 }catch(e){if(controller.signal.aborted)throw Object.assign(Error(read?'Verbindung unterbrochen. Angezeigten Stand prüfen.':'Bestätigung fehlt. Ausstehende Eingabe prüfen; nicht erneut werten.'),{status:0,uncertain:!read});throw e;}
 finally{clearTimeout(timer);}
}
