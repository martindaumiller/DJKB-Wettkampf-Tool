// RFC 8291 aes128gcm and RFC 8292 VAPID. No subscriber endpoint or private key
// is included in a tournament export, a public state, or an audit body.
const enc=new TextEncoder(),bytes=v=>Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const join=(...bs)=>{const r=new Uint8Array(bs.reduce((n,b)=>n+b.length,0));let i=0;for(const b of bs){r.set(b,i);i+=b.length;}return r;};
export function pushEndpoint(value){
 let u;try{u=new URL(value);}catch{throw Error('Push-Adresse ungültig');}
 const h=u.hostname,allowed=h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h.endsWith('.push.services.mozilla.com')||h.endsWith('.push.apple.com')||h.endsWith('.notify.windows.com');
 if(!allowed||u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.href.length>2048)throw Error('Push-Anbieter wird nicht unterstützt');return u;
}
export async function validateSubscription(value){
 const endpoint=pushEndpoint(value?.endpoint).href,p256dh=String(value?.keys?.p256dh||''),auth=String(value?.keys?.auth||'');
 if(!/^[\w-]{87}$/.test(p256dh)||!/^[\w-]{22}$/.test(auth)||bytes(p256dh).length!==65||bytes(auth).length!==16)throw Error('Push-Schlüssel ungültig');
 await crypto.subtle.importKey('raw',bytes(p256dh),{name:'ECDH',namedCurve:'P-256'},false,[]);return {endpoint,keys:{p256dh,auth}};
}
const hkdf=async(input,salt,info,n)=>new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},await crypto.subtle.importKey('raw',input,'HKDF',false,['deriveBits']),n*8));
export async function encryptedPush(subscription,payload){
 const plain=enc.encode(JSON.stringify(payload));if(plain.length>2800)throw Error('Push-Nachricht zu groß');
 const ua=bytes(subscription.keys.p256dh),auth=bytes(subscription.keys.auth),pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const as=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),pub=await crypto.subtle.importKey('raw',ua,{name:'ECDH',namedCurve:'P-256'},false,[]),shared=await crypto.subtle.deriveBits({name:'ECDH',public:pub},pair.privateKey,256);
 const ikm=await hkdf(shared,auth,join(enc.encode('WebPush: info\0'),ua,as),32),salt=crypto.getRandomValues(new Uint8Array(16)),key=await hkdf(ikm,salt,enc.encode('Content-Encoding: aes128gcm\0'),16),nonce=await hkdf(ikm,salt,enc.encode('Content-Encoding: nonce\0'),12);
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']),join(plain,new Uint8Array([2]))));
 const head=new Uint8Array(21);head.set(salt);new DataView(head.buffer).setUint32(16,4096,false);head[20]=as.length;return join(head,as,encrypted);
}
export async function vapidHeader(config,endpoint,now=Date.now()){
 const h=b64(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),body=b64(enc.encode(JSON.stringify({aud:pushEndpoint(endpoint).origin,exp:Math.floor(now/1000)+12*3600,sub:config.subject||'mailto:daumiller@djkb.com'})));
 const key=await crypto.subtle.importKey('jwk',config.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']),sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(h+'.'+body));return 'vapid t='+h+'.'+body+'.'+b64(sig)+', k='+config.publicKey;
}
export async function sendPush(config,subscription,payload,fetcher=fetch){
 const endpoint=pushEndpoint(subscription.endpoint).href,body=await encryptedPush(subscription,payload),authorization=await vapidHeader(config,endpoint);
 const r=await fetcher(endpoint,{method:'POST',headers:{Authorization:authorization,'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',TTL:'120',Urgency:'high'},body,redirect:'error',signal:AbortSignal.timeout(3000)});
 return {ok:r.ok,gone:[404,410].includes(r.status),status:r.status,retryAfter:Math.min(60,Math.max(3,Number(r.headers.get('retry-after'))||10))};
}
