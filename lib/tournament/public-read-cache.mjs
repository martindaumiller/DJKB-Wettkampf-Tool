// Short-lived per-database, anonymous-only snapshots. No authenticated responses,
// cookies, screen credentials or coach data enter this cache. A successful write
// invalidates every local snapshot; separate workers expire after 350 ms.
const stores=new WeakMap();
export async function cachedPublicRead(request,env,identity,handler){
 if(!env?.DB)return handler();
 const url=new URL(request.url),path=url.pathname.split('/').at(-1),read=request.method==='GET',eligible=read&&['state','public-state'].includes(path)&&!identity&&!request.headers.has('cookie')&&!request.headers.has('authorization')&&!request.headers.get('x-sdm-test-session')&&!url.searchParams.has('practice');
 let store=stores.get(env.DB);if(!store){store={cache:new Map(),pending:new Map(),generation:0};stores.set(env.DB,store);}const {cache,pending}=store,key=url.origin+url.pathname+'?'+url.searchParams.toString()+'|calls:'+request.headers.get('x-sdm-calls'),now=Date.now(),old=eligible?cache.get(key):null;
 const render=x=>new Response(JSON.stringify({...x.body,serverTime:Date.now()}),{status:200,headers:x.headers});
 if(old&&old.until>now)return render(old);
 if(eligible&&pending.has(key)){const item=await pending.get(key);if(item&&item.generation===store.generation)return render(item);}
 let resolvePending;const generation=store.generation,shared=eligible&&pending.size<100&&!pending.has(key);if(shared)pending.set(key,new Promise(ok=>resolvePending=ok));let share=null;
 try{const response=await handler();if(!read){if(response.ok){cache.clear();store.generation++;}return response;}
 if(eligible&&response.ok&&!response.headers.has('set-cookie')){const body=await response.clone().json();if((!body.user||body.user.role==='public')&&!body.csrf&&(!body.network||body.network.mode==='normal')){if(cache.size>=100)cache.delete(cache.keys().next().value);const item={body,headers:Object.fromEntries(response.headers),until:Date.now()+350,generation};if(generation===store.generation){cache.set(key,item);share=item;}}}
 return response;}finally{if(shared){pending.delete(key);resolvePending(share);}}
}
