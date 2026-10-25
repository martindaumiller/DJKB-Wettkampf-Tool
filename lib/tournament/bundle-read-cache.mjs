// Internal immutable snapshots, not HTTP responses. Every use first checks the
// database generation; different users still receive their own authorized view.
const caches=new WeakMap();
function immutable(value){const seen=new WeakSet(),stack=[value];while(stack.length){const v=stack.pop();if(!v||typeof v!=='object'||seen.has(v))continue;seen.add(v);for(const child of Object.values(v))if(child&&typeof child==='object')stack.push(child);Object.freeze(v);}return value;}
export function invalidateBundleReads(db){caches.delete(db);}
export async function readBundleSnapshot(db,generation,load){
 let cache=caches.get(db);if(cache?.generation===generation)return cache.pending;
 cache={generation,pending:null};cache.pending=(async()=>{const serialized=await load();if(!serialized){if(caches.get(db)===cache)caches.delete(db);return null;}const bundle=immutable(JSON.parse(serialized));if(serialized.length>6000000&&caches.get(db)===cache)caches.delete(db);return bundle;})();caches.set(db,cache);
 try{return await cache.pending;}catch(e){if(caches.get(db)===cache)caches.delete(db);throw e;}
}
